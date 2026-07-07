import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });
  }
  return redis;
}

export async function getCachedInsight(entryText: string): Promise<any | null> {
  try {
    const client = getRedisClient();
    // Hash the entry text for a key (simple hash, use crypto for production)
    const key = `insight:${Buffer.from(entryText).toString('base64').slice(0, 50)}`;
    const cached = await client.get(key);
    
    if (cached) {
      console.log('Cache hit for:', key);
      return JSON.parse(cached);
    }
    return null;
  } catch (err) {
    console.warn('Cache get error:', err);
    return null;
  }
}

export async function setCachedInsight(entryText: string, insight: any, ttlSeconds = 86400): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `insight:${Buffer.from(entryText).toString('base64').slice(0, 50)}`;
    await client.setex(key, ttlSeconds, JSON.stringify(insight));
    console.log('Cached insight for:', key);
  } catch (err) {
    console.warn('Cache set error:', err);
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
