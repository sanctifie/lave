import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP } from '../lib/errors';
import { UserRole } from '@mbolo/shared';

export interface AuthPayload {
  userId: string;
  phone: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(HTTP.unauthorized('Token manquant'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(HTTP.unauthorized('Token invalide ou expiré'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(HTTP.forbidden());
    }
    next();
  };
}
