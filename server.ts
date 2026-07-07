import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { getSupabaseClient, getCachedInsight, cacheInsight, saveJournalEntry, recordApiUsage } from './src/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

dotenv.config({ path: path.resolve(__dirname, isProd ? '.env.prod' : '.env.dev') });

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => process.env.NODE_ENV === 'development',
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip || 'unknown',
});

async function startServer() {
  const app = express();

  // Middleware
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API endpoint for insights
  app.post('/api/insight', aiLimiter, async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { entryText, userId } = req.body;
      if (!entryText) {
        return res.status(400).json({ error: 'entryText is required' });
      }

      // Create hash for caching
      const entryHash = Buffer.from(entryText).toString('base64').slice(0, 50);

      // Check cache in Supabase
      const cached = await getCachedInsight(entryHash);
      if (cached.success && cached.data) {
        const responseTime = Date.now() - startTime;
        if (userId) {
          await recordApiUsage(userId, '/api/insight', responseTime);
        }
        return res.json({ ...cached.data, cached: true, responseTime });
      }

      // Get Gemini API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.includes('your_')) {
        console.error('GEMINI_API_KEY is missing or still using placeholder value');
        return res.status(500).json({
          error: 'Gemini API key is not configured',
          details: 'Set GEMINI_API_KEY in your environment to enable insight generation.'
        });
      }

      // Call Gemini API
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const systemPrompt = `You are a grounded psychology writer for a manifestation journaling app called Visherai. You will be given one journal entry someone wrote in "already true" present tense. Respond ONLY with a JSON object, no markdown fences, no preamble, with exactly these keys:
{"theme": "a 2-4 word label for what they're going after (e.g. 'Career confidence', 'A new home', 'Repairing a friendship')", "principle": "one of: Selective attention | Self-fulfilling prophecy | Self-efficacy and growth mindset | Mental rehearsal", "insight": "2-3 sentences, warm but grounded, explaining specifically how that principle applies to THIS entry - reference concrete details from what they wrote. Never claim the universe or fate will deliver this. Never diagnose or psychoanalyze the person.", "action": "one small, concrete, doable-today action that would move them toward what they wrote, phrased in one sentence"}`;

      let retries = 3;
      let delayMs = 1000;
      let response;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: entryText,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
            }
          });
          break;
        } catch (err: any) {
          const isTransient = err.status === 'UNAVAILABLE' || err.code === 503 || err.status === 429 || err.code === 429;
          if (isTransient && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2;
          } else {
            throw err;
          }
        }
      }

      if (!response) {
        throw new Error('No response from Gemini API');
      }

      const text = response.text || '';
      const cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanText);

      // Cache the result
      await cacheInsight(entryHash, parsed);

      // Save to journal entries if userId provided
      if (userId) {
        await saveJournalEntry(userId, {
          text: entryText,
          insight: parsed,
          theme: parsed.theme
        });
      }

      const responseTime = Date.now() - startTime;
      if (userId) {
        await recordApiUsage(userId, '/api/insight', responseTime);
      }

      return res.json({ ...parsed, cached: false, responseTime });
    } catch (err: any) {
      console.error('Error processing insight:', err);
      
      const fallback = {
        theme: "Personal Intention",
        principle: "Selective attention",
        insight: "By writing down your desires in the present tense, you train your mind to focus on the pathways and opportunities that lead directly to your goal.",
        action: "Write down one concrete step you can take today to move closer to this reality.",
        error: 'Using fallback response'
      };

      return res.status(500).json(fallback);
    }
  });

  // Serve static files and SPA
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      try {
        let template = await fs.promises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const initialPort = Number(process.env.PORT || 3000);

  const startListening = (port: number) => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is busy. Trying ${nextPort}...`);
        startListening(nextPort);
      } else {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  };

  startListening(initialPort);

  return app;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default startServer;

