import { kv as vercelKv } from '@vercel/kv';
import Redis from 'ioredis';

// Check if we have the required Upstash env vars to use vercel/kv
const hasVercelKv =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const redisClient =
  !hasVercelKv && process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : null;

export const kv = {
  /** Get and JSON-parse a value */
  async get<T>(key: string): Promise<T | null> {
    if (redisClient) {
      const val = await redisClient.get(key);
      return val ? (JSON.parse(val) as T) : null;
    }
    return vercelKv.get<T>(key);
  },

  /** Set a value (generic instead of `any`) */
  async set<T>(key: string, value: T): Promise<void> {
    if (redisClient) {
      await redisClient.set(key, JSON.stringify(value));
    } else {
      await vercelKv.set<T>(key, value);
    }
  },

  async incr(key: string): Promise<number> {
    return redisClient ? redisClient.incr(key) : vercelKv.incr(key);
  },

  async decr(key: string): Promise<number> {
    return redisClient ? redisClient.decr(key) : vercelKv.decr(key);
  },
};
