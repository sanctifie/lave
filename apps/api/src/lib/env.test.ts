import { describe, it, expect } from 'vitest';
import { validateEnv } from './env';

const base = {
  JWT_SECRET: 'a-sufficiently-long-secret-key-0123456789',
  DATABASE_URL: 'postgresql://localhost/db',
  REDIS_URL: 'redis://localhost:6379',
} as NodeJS.ProcessEnv;

describe('validateEnv', () => {
  it('accepte une configuration valide', () => {
    const { errors } = validateEnv({ ...base, NODE_ENV: 'production' });
    expect(errors).toHaveLength(0);
  });

  it('erreur si JWT_SECRET manquant', () => {
    const { errors } = validateEnv({ ...base, JWT_SECRET: undefined, NODE_ENV: 'production' });
    expect(errors.some((e) => e.includes('JWT_SECRET'))).toBe(true);
  });

  it('erreur en production si JWT_SECRET est la valeur par défaut', () => {
    const { errors } = validateEnv({
      ...base,
      JWT_SECRET: 'change-me-in-production-min-32-chars',
      NODE_ENV: 'production',
    });
    expect(errors.some((e) => e.includes('par défaut'))).toBe(true);
  });

  it('avertit seulement (pas d\'erreur) hors production pour un secret faible', () => {
    const { errors, warnings } = validateEnv({ ...base, JWT_SECRET: 'court', NODE_ENV: 'development' });
    expect(errors).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('erreur en production si MyPVIT actif sans secret de webhook', () => {
    const { errors } = validateEnv({
      ...base,
      NODE_ENV: 'production',
      MYPVIT_URL_CODE: 'URL_XXX',
    });
    expect(errors.some((e) => e.includes('MYPVIT_WEBHOOK_SECRET'))).toBe(true);
  });

  it('erreur si DATABASE_URL ou REDIS_URL manquants', () => {
    const { errors } = validateEnv({ ...base, DATABASE_URL: undefined, REDIS_URL: undefined });
    expect(errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
    expect(errors.some((e) => e.includes('REDIS_URL'))).toBe(true);
  });
});
