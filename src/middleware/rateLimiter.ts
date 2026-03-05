import rateLimit from 'express-rate-limit';
import { redis } from '../db/redis';
import { config } from '../config';
import { RateLimitError } from '../utils/errors';

/**
 * Redis store for rate limiting
 */
class RedisStore {
  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, Math.floor(config.rateLimit.windowMs / 1000));
    }

    const ttl = await redis.getClient().ttl(key);
    const resetTime = new Date(Date.now() + ttl * 1000);

    return {
      totalHits: current,
      resetTime,
    };
  }

  async decrement(key: string): Promise<void> {
    await redis.getClient().decr(key);
  }

  async resetKey(key: string): Promise<void> {
    await redis.del(key);
  }
}

/**
 * General rate limiter for all requests
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new RateLimitError();
  },
});

/**
 * Strict rate limiter for expensive operations
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests for this operation, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new RateLimitError();
  },
});

/**
 * Voice synthesis rate limiter
 */
export const voiceRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many voice requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Fraud analysis rate limiter
 */
export const fraudRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many fraud analysis requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
