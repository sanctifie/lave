import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireMediaAuth } from './mediaAuth';

const SECRET = 'test-secret-mediaauth-0123456789abcdef';

function makeReq(over: any = {}) {
  return { headers: {}, query: {}, ...over } as any;
}

describe('requireMediaAuth', () => {
  beforeAll(() => { process.env.JWT_SECRET = SECRET; });
  afterAll(() => { delete process.env.JWT_SECRET; });

  it('401 sans token', () => {
    const next = vi.fn();
    requireMediaAuth(makeReq(), {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('accepte un JWT valide en en-tête Authorization', () => {
    const token = jwt.sign({ userId: 'u1' }, SECRET);
    const next = vi.fn();
    requireMediaAuth(makeReq({ headers: { authorization: `Bearer ${token}` } }), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('accepte un JWT valide en query ?token=', () => {
    const token = jwt.sign({ userId: 'u1' }, SECRET);
    const next = vi.fn();
    requireMediaAuth(makeReq({ query: { token } }), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('401 sur un JWT invalide', () => {
    const next = vi.fn();
    requireMediaAuth(makeReq({ query: { token: 'forgé' } }), {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
