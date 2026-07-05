import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP } from '../lib/errors';

/**
 * Authentification pour les fichiers média (/uploads).
 *
 * Les scans d'ordonnances sont des données de santé : ils ne doivent pas être
 * servis publiquement. Contrairement aux appels API, les images sont chargées
 * par `<Image source={{uri}}>` (React Native) ou ouvertes dans le navigateur
 * (`Linking.openURL`) — deux contextes où l'en-tête Authorization n'est pas
 * toujours envoyable. On accepte donc le JWT :
 *   1. via l'en-tête `Authorization: Bearer <jwt>` (classique), ou
 *   2. via le query param `?token=<jwt>` (Image / navigateur externe).
 */
export function requireMediaAuth(req: Request, _res: Response, next: NextFunction): void {
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const queryToken  = typeof req.query.token === 'string' ? req.query.token : undefined;
  const token = headerToken ?? queryToken;

  if (!token) return next(HTTP.unauthorized('Token manquant'));

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    next(HTTP.unauthorized('Token invalide ou expiré'));
  }
}
