import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = vi.hoisted(() => ({ incr: vi.fn(), expire: vi.fn(), ttl: vi.fn() }));
vi.mock('../infrastructure/redis/client', () => ({ redis: store }));

import { rateLimit } from './rateLimit';

function makeReqRes() {
  const req: any = { ip: '1.2.3.4', body: {} };
  const res: any = { setHeader: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

describe('rateLimit', () => {
  beforeEach(() => {
    store.incr.mockReset();
    store.expire.mockReset();
    store.ttl.mockReset();
  });

  it('laisse passer sous la limite et pose le TTL au 1er appel', async () => {
    store.incr.mockResolvedValue(1);
    const mw = rateLimit({ prefix: 'test', windowSec: 900, max: 3 });
    const { req, res, next } = makeReqRes();

    await mw(req, res, next);

    expect(store.expire).toHaveBeenCalledWith('rl:test:1.2.3.4', 900);
    expect(next).toHaveBeenCalledWith(); // pas d'erreur
  });

  it('bloque au-delà de la limite avec un 429 et Retry-After', async () => {
    store.incr.mockResolvedValue(4); // > max
    store.ttl.mockResolvedValue(120);
    const mw = rateLimit({ prefix: 'test', windowSec: 900, max: 3 });
    const { req, res, next } = makeReqRes();

    await mw(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '120');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
  });

  it('utilise l\'extracteur de clé personnalisé', async () => {
    store.incr.mockResolvedValue(1);
    const mw = rateLimit({ prefix: 'otp', windowSec: 900, max: 3, key: (r: any) => r.body.phone });
    const { req, res, next } = makeReqRes();
    req.body.phone = '+24106000000';

    await mw(req, res, next);

    expect(store.incr).toHaveBeenCalledWith('rl:otp:+24106000000');
    expect(next).toHaveBeenCalledWith();
  });

  it('fail-open si Redis est en panne', async () => {
    store.incr.mockRejectedValue(new Error('redis down'));
    const mw = rateLimit({ prefix: 'test', windowSec: 900, max: 3 });
    const { req, res, next } = makeReqRes();

    await mw(req, res, next);

    expect(next).toHaveBeenCalledWith(); // la requête passe quand même
  });
});
