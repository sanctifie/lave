import { Request, Response, NextFunction } from 'express';
import { HTTP } from '../lib/errors';

/**
 * Protège un endpoint de webhook par secret partagé.
 *
 * Le secret est fourni soit en query (`?secret=...`) — pratique pour l'enregistrer
 * dans l'URL de callback du prestataire — soit via l'en-tête `x-webhook-secret`.
 *
 * - Secret non configuré → la requête passe (dev). En production, un avertissement
 *   est journalisé car le webhook est alors NON protégé.
 * - Secret configuré et invalide/absent → `401`.
 */
export function verifyWebhookSecret(secret: string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[webhook] secret non configuré — endpoint non protégé');
      }
      return next();
    }

    const provided = (req.query.secret as string | undefined) ?? req.header('x-webhook-secret');
    if (provided !== secret) {
      return next(HTTP.unauthorized('Webhook non autorisé'));
    }
    next();
  };
}
