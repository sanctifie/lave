import { createClient } from 'redis';

export const redis = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('[redis]', err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}
