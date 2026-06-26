export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const HTTP = {
  unauthorized: (msg = 'Non autorisé') => new AppError('UNAUTHORIZED', msg, 401),
  forbidden: (msg = 'Accès refusé') => new AppError('FORBIDDEN', msg, 403),
  notFound: (msg = 'Ressource introuvable') => new AppError('NOT_FOUND', msg, 404),
  conflict: (msg = 'Conflit') => new AppError('CONFLICT', msg, 409),
  unprocessable: (msg: string) => new AppError('UNPROCESSABLE', msg, 422),
} as const;
