import { createClient, type RedisClientType } from 'redis';

// Annotation explicite : sans elle, TypeScript tente de « nommer » le type
// inféré du client (qui référence les modules @redis/search, @redis/time-series…
// via des chemins pnpm profonds) et échoue avec TS2742 « not portable ».
export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('[redis]', err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}
