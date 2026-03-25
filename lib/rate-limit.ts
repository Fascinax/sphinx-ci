import { Redis } from "@upstash/redis";
import { prisma } from "./db";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  }
  return null;
}

/**
 * Check rate limit: max `limit` requests per `windowSeconds` for a given key.
 * Uses Redis if available, falls back to DB count.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowSeconds: number = 3600
): Promise<{ allowed: boolean; remaining: number }> {
  const r = getRedis();

  if (r) {
    // Redis-based rate limiting
    const redisKey = `rate:${key}`;
    const current = await r.incr(redisKey);

    if (current === 1) {
      // First request — set expiry
      await r.expire(redisKey, windowSeconds);
    }

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  }

  // Fallback: DB-based rate limiting
  const windowStart = new Date(Date.now() - windowSeconds * 1000);
  const count = await prisma.quiz.count({
    where: {
      team: { apiKey: key },
      createdAt: { gte: windowStart },
    },
  });

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
  };
}
