import type { Server } from 'http';
import { app } from './app';
import { connectRedis, redis } from './infrastructure/redis/client';
import { prisma } from './infrastructure/prisma/client';
import { pushService } from './infrastructure/container';

const PORT = process.env.PORT ?? 3000;

let reminderTimer: ReturnType<typeof setInterval> | undefined;

/** Envoie une notification push aux patients dont le RDV commence dans ~5 minutes */
function startAppointmentReminderScheduler() {
  reminderTimer = setInterval(async () => {
    try {
      const now       = new Date();
      const windowStart = new Date(now.getTime() + 4 * 60 * 1000); // dans 4 min
      const windowEnd   = new Date(now.getTime() + 6 * 60 * 1000); // dans 6 min

      const upcoming = await (prisma as any).appointment.findMany({
        where: {
          type:        'scheduled',
          status:      { in: ['pending', 'confirmed'] },
          scheduledAt: { gte: windowStart, lt: windowEnd },
        },
        select: { id: true, patientId: true },
      });

      for (const appt of upcoming as { id: string; patientId: string }[]) {
        pushService.sendToUser(appt.patientId, {
          title: '⏰ Consultation dans 5 minutes',
          body:  'Préparez-vous ! Entrez dès maintenant en salle d\'attente.',
          data:  { type: 'appointment_reminder', appointmentId: appt.id },
        });
      }
    } catch {
      // Erreur silencieuse — ne doit pas bloquer le serveur
    }
  }, 60 * 1000); // toutes les minutes
}

function setupGracefulShutdown(server: Server) {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.warn(`[api] ${signal} reçu — arrêt en cours…`);

    if (reminderTimer) clearInterval(reminderTimer);

    // Stoppe l'acceptation de nouvelles connexions, puis libère les ressources.
    server.close(async () => {
      await Promise.allSettled([
        prisma.$disconnect(),
        redis.quit(),
      ]);
      console.warn('[api] Arrêt propre terminé.');
      process.exit(0);
    });

    // Filet de sécurité : forcer la sortie si l'arrêt traîne.
    setTimeout(() => {
      console.error('[api] Arrêt forcé après délai.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

async function main() {
  await connectRedis();
  startAppointmentReminderScheduler();
  const server = app.listen(PORT, () => {
    console.warn(`[api] MBOLO Santé démarrée sur le port ${PORT}`);
  });
  setupGracefulShutdown(server);
}

main().catch((err) => {
  console.error('[api] Erreur au démarrage :', err);
  process.exit(1);
});
