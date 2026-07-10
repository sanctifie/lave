import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// L'autorisation par ressource (accès base de données) est testée séparément
// dans infrastructure/upload/access.test.ts. Ici on isole le middleware.
const canAccess = vi.fn();
vi.mock('../infrastructure/upload/access', () => ({
  canAccessMediaFile: (...args: unknown[]) => canAccess(...args),
}));

import { requireMediaAuth } from './mediaAuth';

const SECRET = 'test-secret-mediaauth-0123456789abcdef';

function makeReq(over: any = {}) {
  return { headers: {}, query: {}, path: '/scan.jpg', ...over } as any;
}

/** Laisse le microtask du `.then()` se résoudre. */
const flush = () => new Promise((r) => setImmediate(r));

describe('requireMediaAuth', () => {
  beforeAll(() => { process.env.JWT_SECRET = SECRET; });
  afterAll(() => { delete process.env.JWT_SECRET; });
  beforeEach(() => { canAccess.mockReset(); });

  it('401 sans token', () => {
    const next = vi.fn();
    requireMediaAuth(makeReq(), {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(canAccess).not.toHaveBeenCalled();
  });

  it('401 sur un JWT invalide', () => {
    const next = vi.fn();
    requireMediaAuth(makeReq({ query: { token: 'forgé' } }), {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('autorise (next sans erreur) si le JWT est valide ET l\'accès accordé', async () => {
    canAccess.mockResolvedValue(true);
    const token = jwt.sign({ userId: 'u1', role: 'patient' }, SECRET);
    const next = vi.fn();
    requireMediaAuth(makeReq({ headers: { authorization: `Bearer ${token}` } }), {} as any, next);
    await flush();
    expect(canAccess).toHaveBeenCalledWith('scan.jpg', { userId: 'u1', role: 'patient' });
    expect(next).toHaveBeenCalledWith();
  });

  it('403 si le JWT est valide mais l\'accès refusé (fichier d\'un autre patient)', async () => {
    canAccess.mockResolvedValue(false);
    const token = jwt.sign({ userId: 'intrus', role: 'patient' }, SECRET);
    const next = vi.fn();
    requireMediaAuth(makeReq({ query: { token } }), {} as any, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('403 si la vérification d\'accès échoue (erreur base)', async () => {
    canAccess.mockRejectedValue(new Error('db down'));
    const token = jwt.sign({ userId: 'u1', role: 'patient' }, SECRET);
    const next = vi.fn();
    requireMediaAuth(makeReq({ headers: { authorization: `Bearer ${token}` } }), {} as any, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
