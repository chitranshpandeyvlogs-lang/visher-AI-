import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Global rate limiter (per IP)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

// API-specific rate limiter (stricter for AI calls)
export const aiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 AI calls per minute
  message: 'Too many AI requests, please wait before making another request.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// User-based limiter (if you have user auth)
export const createUserLimiter = (maxRequests: number = 50, windowMs: number = 60 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return (req.user as any)?.id || req.ip || 'unknown';
    },
  });
};

// Health check middleware
export function healthCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }
  next();
}

// Request logging middleware
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}

// Error handling middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err.message);
  
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limited - too many requests',
      retryAfter: err.retryAfter,
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
