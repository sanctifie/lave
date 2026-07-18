import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ code: 'VALIDATION_ERROR', errors: err.flatten() });
    return;
  }

  // Erreurs Prisma courantes → statuts HTTP parlants (au lieu d'un 500 opaque).
  const prismaCode = (err as { code?: string } | null)?.code;
  if (prismaCode === 'P2002') {
    res.status(409).json({ code: 'CONFLICT', message: 'Cette valeur existe déjà (doublon).' });
    return;
  }
  if (prismaCode === 'P2025') {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Ressource introuvable.' });
    return;
  }

  console.error('[unhandled error]', err);
  res.status(500).json({ code: 'INTERNAL', message: 'Une erreur interne est survenue' });
}
