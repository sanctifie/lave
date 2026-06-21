import { app } from './app';
import { connectRedis } from './infrastructure/redis/client';

const PORT = process.env.PORT ?? 3000;

async function main() {
  await connectRedis();
  app.listen(PORT, () => {
    console.warn(`[api] MBOLO Santé démarrée sur le port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[api] Erreur au démarrage :', err);
  process.exit(1);
});
