import { Queue, Worker } from 'bull';
import Redis from 'ioredis';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Insight job interface
export interface InsightJob {
  entryText: string;
  userId?: string;
  timestamp?: number;
}

// Create the insight queue
export const insightQueue = new Queue<InsightJob>('insight', redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// System prompt for Gemini
export const systemPrompt = `You are a grounded psychology writer for a manifestation journaling app called Visherai. You will be given one journal entry someone wrote in "already true" present tense. Respond ONLY with a JSON object, no markdown fences, no preamble, with exactly these keys:
{"theme": "a 2-4 word label for what they're going after (e.g. 'Career confidence', 'A new home', 'Repairing a friendship')", "principle": "one of: Selective attention | Self-fulfilling prophecy | Self-efficacy and growth mindset | Mental rehearsal", "insight": "2-3 sentences, warm but grounded, explaining specifically how that principle applies to THIS entry - reference concrete details from what they wrote. Never claim the universe or fate will deliver this. Never diagnose or psychoanalyze the person.", "action": "one small, concrete, doable-today action that would move them toward what they wrote, phrased in one sentence"}`;

// Fallback insights
export const fallbackInsights: Record<string, any> = {
  default: {
    theme: "Personal Intention",
    principle: "Selective attention",
    insight: "By writing down your desires in the present tense, you train your mind to focus on the pathways and opportunities that lead directly to your goal.",
    action: "Write down one concrete step you can take today to move closer to this reality."
  },
  career: {
    theme: "Career Expansion",
    principle: "Self-efficacy and growth mindset",
    insight: "When you project career growth in the present tense, you strengthen your belief in your professional capability. This mental state naturally encourages you to take on challenging projects, speak up in key moments, and seek out high-impact opportunities.",
    action: "Reach out to a colleague, update one bullet point on your resume, or research a new skill today."
  },
  relationship: {
    theme: "Relational Harmony",
    principle: "Self-fulfilling prophecy",
    insight: "Expressing healthy, deep connections in the present tense shifts how you interact with others. By expecting warm, mutual support, you naturally communicate with more empathy, openness, and patience, which invites positive responses in return.",
    action: "Send a small, appreciative text to someone you care about or plan a focused conversation today."
  },
  home: {
    theme: "Setting Roots",
    principle: "Selective attention",
    insight: "Visualizing your ideal living environment helps your brain tune out distracting clutter and prioritize actions that build stability. You begin to notice listings, budget adjustments, or organizational habits that actively draw you closer to your perfect home.",
    action: "Browse active listings or set aside a small, specific amount into a dedicated savings bucket today."
  },
  health: {
    theme: "Well-being & Vitality",
    principle: "Mental rehearsal",
    insight: "Rehearsing a state of physical and mental vitality pre-activates the neural pathways associated with calm and strength. This positive framing lowers friction, making it significantly easier to choose nourishing meals, restful habits, or daily movement.",
    action: "Dedicate five minutes to stretching, take a short outdoor walk, or drink a glass of water right now."
  },
  learning: {
    theme: "Creative Mastery",
    principle: "Self-efficacy and growth mindset",
    insight: "Framing yourself as a capable learner builds cognitive resilience against failure. You begin to view intellectual hurdles as skill-building exercises rather than dead ends, which dramatically accelerates your learning curve and creative output.",
    action: "Spend ten focused minutes reading about your subject or drafting your next creative idea."
  }
};

// Process jobs using Gemini API
export async function startInsightWorker() {
  const worker = new Worker<InsightJob>(
    'insight',
    async (job) => {
      console.log(`Processing job ${job.id} for user ${job.data.userId || 'anonymous'}`);
      
      const { entryText } = job.data;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not configured');
        return getFallbackInsight(entryText);
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: entryText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          }
        });

        const text = response.text || '';
        const cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanText);
        
        return parsed;
      } catch (err: any) {
        console.warn(`Error processing job ${job.id}:`, err.message);
        return getFallbackInsight(entryText);
      }
    },
    {
      connection: new Redis(redisUrl),
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  return worker;
}

export function getFallbackInsight(text: string): any {
  const lowerText = (text || '').toLowerCase();
  
  if (lowerText.includes("job") || lowerText.includes("work") || lowerText.includes("career")) {
    return fallbackInsights.career;
  } else if (lowerText.includes("friend") || lowerText.includes("love") || lowerText.includes("relationship")) {
    return fallbackInsights.relationship;
  } else if (lowerText.includes("house") || lowerText.includes("home") || lowerText.includes("apartment")) {
    return fallbackInsights.home;
  } else if (lowerText.includes("health") || lowerText.includes("fit") || lowerText.includes("wellness")) {
    return fallbackInsights.health;
  } else if (lowerText.includes("learn") || lowerText.includes("study") || lowerText.includes("create")) {
    return fallbackInsights.learning;
  }
  
  return fallbackInsights.default;
}
