import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

/**
 * Instrumentation Prometheus de l'API.
 *
 * - `collectDefaultMetrics` expose CPU, mémoire, event loop lag, GC… du process.
 * - `http_request_duration_seconds` est un HISTOGRAMME : il permet de calculer
 *   taux d'erreurs ET percentiles de latence (p95/p99) côté Prometheus — les
 *   alertes de devops/monitoring/alerts.yaml reposent dessus.
 *
 * Cardinalité maîtrisée : on étiquette par route *pattern* (ex. /rides/:id),
 * jamais par URL brute (sinon chaque id crée une série → explosion mémoire).
 */
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpDuration = new client.Histogram({
  name:       'http_request_duration_seconds',
  help:       'Durée des requêtes HTTP',
  labelNames: ['method', 'route', 'status_code'] as const,
  // Buckets adaptés à une API CRUD : de 10 ms à 5 s
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // /metrics et /health pollueraient les stats (scrapes + probes très fréquents)
  if (req.path === '/metrics' || req.path.startsWith('/health')) return next();

  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : req.baseUrl || req.path;
    end({ method: req.method, route, status_code: String(res.statusCode) });
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}
