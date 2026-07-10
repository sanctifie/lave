import { describe, it, expect, vi } from 'vitest';
import { verifyWebhookSecret } from './webhookAuth';

function makeReq(over: any = {}) {
  return { query: {}, header: vi.fn().mockReturnValue(undefined), ...over } as any;
}

describe('verifyWebhookSecret', () => {
  it('laisse passer si aucun secret n\'est configuré (dev)', () => {
    const next = vi.fn();
    verifyWebhookSecret(undefined)(makeReq(), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejette (401) si aucun secret n\'est configuré en production (fail-closed)', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const next = vi.fn();
      verifyWebhookSecret(undefined)(makeReq(), {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('accepte un secret correct fourni en query', () => {
    const next = vi.fn();
    verifyWebhookSecret('s3cr3t')(makeReq({ query: { secret: 's3cr3t' } }), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('accepte un secret correct fourni en en-tête', () => {
    const next = vi.fn();
    const req = makeReq({ header: vi.fn().mockReturnValue('s3cr3t') });
    verifyWebhookSecret('s3cr3t')(req, {} as any, next);
    expect(req.header).toHaveBeenCalledWith('x-webhook-secret');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejette un secret invalide ou absent (401)', () => {
    const next = vi.fn();
    verifyWebhookSecret('s3cr3t')(makeReq({ query: { secret: 'faux' } }), {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
