import { Request, Response, NextFunction } from 'express';
import { redis } from '../infrastructure/redis/client';
import { HTTP } from '../lib/errors';

interface RateLimitOptions {
  /** Fenêtre glissante en secondes. */
  windowSec: number;
  /** Nombre maximal de requêtes autorisées dans la fenêtre. */
  max: number;
  /** Préfixe de clé Redis (identifie la limite). */
  prefix: string;
  /** Extracteur de clé (défaut : IP du client). */
  key?: (req: Request) => string;
}

/**
 * Limiteur de débit basé sur Redis (INCR + EXPIRE).
 * Fail-open : si Redis est indisponible, la requête passe quand même afin de
 * ne pas bloquer l'application sur une panne du cache.
 */
export function rateLimit({ windowSec, max, prefix, key }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = (key ? key(req) : (req.ip ?? 'unknown')) || 'unknown';
      const redisKey = `rl:${prefix}:${id}`;

      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }

      if (count > max) {
        const ttl = await redis.ttl(redisKey);
        const retry = ttl > 0 ? ttl : windowSec;
        res.setHeader('Retry-After', String(retry));
        return next(HTTP.tooManyRequests(`Trop de requêtes. Réessayez dans ${retry}s.`));
      }

      next();
    } catch {
      next();
    }
  };
}
