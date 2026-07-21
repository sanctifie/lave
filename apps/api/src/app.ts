import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/error';
import { requireMediaAuth } from './middleware/mediaAuth';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { prisma } from './infrastructure/prisma/client';
import { redis } from './infrastructure/redis/client';
import { authRouter } from './domains/auth/router';
import { usersRouter } from './domains/users/router';
import { partnersRouter } from './domains/partners/router';
import { doctorsRouter } from './domains/doctors/router';
import { appointmentsRouter } from './domains/appointments/router';
import { prescriptionsRouter } from './domains/prescriptions/router';
import { ordersRouter } from './domains/orders/router';
import { deliveriesRouter } from './domains/deliveries/router';
import { paymentsRouter } from './domains/payments/router';
import { pricingRouter } from './domains/pricing/router';
import { ridesRouter } from './domains/rides/router';
import { mealsRouter } from './domains/meals/router';
import { chatRouter } from './domains/chat/router';
import { adminRouter } from './domains/admin/router';
import { reviewsRouter } from './domains/reviews/router';
import { careLinksRouter } from './domains/carelinks/router';
import { kycRouter } from './domains/kyc/router';

export const app: express.Express = express();

// CORS — en prod, restreindre aux origines déclarées dans CORS_ORIGINS (séparées par des virgules).
// Vide ou non défini → autorise toutes les origines (pratique en dev).
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Derrière un reverse proxy (nginx, ALB…), req.ip doit refléter le client réel
// sinon le rate-limit par IP vise l'IP du proxy (limite partagée par tous).
// TRUST_PROXY=1 (nombre de sauts) ou une liste d'IP/CIDR ; absent = désactivé.
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(tp) ? Number(tp) : tp);
}

app.use(helmet());
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins, credentials: true } : undefined));
// Le JWT peut transiter en query (?token=) pour /uploads : on le caviarde dans
// les logs pour ne jamais écrire un jeton valide sur disque.
morgan.token('url', (req) => (req.url ?? '').replace(/([?&]token=)[^&]+/, '$1[REDACTED]'));
app.use(morgan('dev'));
app.use(express.json());
app.use(metricsMiddleware);

// Métriques Prometheus (histogramme latence/erreurs + métriques process).
// En prod, restreindre l'accès au réseau interne (NetworkPolicy / ALB rule).
app.get('/metrics', metricsHandler);

// Fichiers uploadés (scans d'ordonnances = données de santé) — protégés par JWT
// (header Bearer ou ?token=). En prod, remplacer par S3 + URLs signées.
app.use('/uploads', requireMediaAuth, express.static(path.join(process.cwd(), 'uploads')));

// Liveness — process en vie (probe légère, toujours 200 si l'event loop répond)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness — vérifie que les dépendances (PostgreSQL, Redis) répondent.
// Renvoie 503 si l'une est indisponible (utile pour load-balancer / k8s).
app.get('/health/ready', async (_req, res) => {
  const checks = { database: false, redis: false };

  const [db, cache] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  checks.database = db.status === 'fulfilled';
  checks.redis    = cache.status === 'fulfilled';

  const healthy = checks.database && checks.redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/partners', partnersRouter);
app.use('/doctors', doctorsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/prescriptions', prescriptionsRouter);
app.use('/orders', ordersRouter);
app.use('/deliveries', deliveriesRouter);
app.use('/payments', paymentsRouter);
app.use('/pricing', pricingRouter);
app.use('/rides', ridesRouter);
app.use('/meals', mealsRouter);
app.use('/chat', chatRouter);
app.use('/admin', adminRouter);
app.use('/reviews', reviewsRouter);
app.use('/care-links', careLinksRouter);
app.use('/kyc', kycRouter);

app.use(errorHandler);
