import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { HTTP } from '../lib/errors';

/** Comparaison à temps constant, insensible aux différences de longueur. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Protège un endpoint de webhook par secret partagé.
 *
 * Le secret est fourni soit en query (`?secret=...`) — pratique pour l'enregistrer
 * dans l'URL de callback du prestataire — soit via l'en-tête `x-webhook-secret`.
 *
 * - Secret non configuré :
 *     • en production → `401` (fail-closed : un webhook de paiement non protégé
 *       accepterait des confirmations forgées et déclencherait des versements).
 *     • hors production → la requête passe (dev), avec avertissement.
 * - Secret configuré et invalide/absent → `401`.
 */
export function verifyWebhookSecret(secret: string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[webhook] secret non configuré en production — requête rejetée');
        return next(HTTP.unauthorized('Webhook non configuré'));
      }
      console.warn('[webhook] secret non configuré — endpoint non protégé (dev)');
      return next();
    }

    const provided = (req.query.secret as string | undefined) ?? req.header('x-webhook-secret');
    if (!provided || !safeEqual(provided, secret)) {
      return next(HTTP.unauthorized('Webhook non autorisé'));
    }
    next();
  };
}
