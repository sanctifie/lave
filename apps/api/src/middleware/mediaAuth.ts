import { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { HTTP } from '../lib/errors';
import type { AuthPayload } from './auth';
import { canAccessMediaFile } from '../infrastructure/upload/access';

/**
 * Authentification ET autorisation pour les fichiers média (/uploads).
 *
 * Les scans d'ordonnances sont des données de santé : il ne suffit pas d'être
 * connecté, il faut être légitimement impliqué dans la ressource. On vérifie
 * donc le JWT puis, par fichier, que le demandeur y a droit (patient concerné,
 * médecin émetteur, pharmacien de l'officine cible, ou admin).
 *
 * Le JWT est accepté :
 *   1. via l'en-tête `Authorization: Bearer <jwt>` (classique), ou
 *   2. via le query param `?token=<jwt>` — nécessaire car les images sont
 *      chargées par `<Image source={{uri}}>` (React Native) ou ouvertes dans un
 *      navigateur externe, contextes où l'en-tête n'est pas toujours envoyable.
 */
export function requireMediaAuth(req: Request, _res: Response, next: NextFunction): void {
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const queryToken  = typeof req.query.token === 'string' ? req.query.token : undefined;
  const token = headerToken ?? queryToken;

  if (!token) return next(HTTP.unauthorized('Token manquant'));

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as AuthPayload;
  } catch {
    return next(HTTP.unauthorized('Token invalide ou expiré'));
  }

  const filename = path.basename(req.path);
  canAccessMediaFile(filename, { userId: payload.userId, role: payload.role })
    .then((allowed) => {
      if (!allowed) return next(HTTP.forbidden('Accès à ce fichier non autorisé'));
      next();
    })
    .catch(() => next(HTTP.forbidden('Accès à ce fichier non autorisé')));
}
