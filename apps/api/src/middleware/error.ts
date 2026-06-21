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

  console.error('[unhandled error]', err);
  res.status(500).json({ code: 'INTERNAL', message: 'Une erreur interne est survenue' });
}
