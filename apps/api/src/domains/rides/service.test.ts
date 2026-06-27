import { describe, it, expect, vi, beforeEach } from 'vitest';

// RideService importe le client Prisma au chargement — on le neutralise.
vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { RideService } from './service';
import { PricingKind } from '@mbolo/shared';

function makePricingRepo(base = 1500, perKm = 200) {
  return {
    getByKind: vi.fn(async (kind: string) => {
      if (kind === PricingKind.RIDE_BASE_FEE) return { valueFcfa: base };
      if (kind === PricingKind.RIDE_PER_KM)   return { valueFcfa: perKm };
      return null;
    }),
  };
}

describe('RideService.estimateFare', () => {
  let service: RideService;

  beforeEach(() => {
    service = new RideService({} as any, makePricingRepo() as any, {} as any);
  });

  it('facture uniquement le forfait de base quand départ = arrivée', async () => {
    const est = await service.estimateFare(0.3924, 9.4536, 0.3924, 9.4536);
    expect(est.distanceKm).toBe(0);
    expect(est.fareEstFcfa).toBe(1500);
    expect(est.baseFee).toBe(1500);
    expect(est.perKm).toBe(200);
  });

  it('calcule une distance réaliste et un tarif distance-dépendant', async () => {
    // ~1 km nord à Libreville (0.009° de latitude ≈ 1 km)
    const est = await service.estimateFare(0.3924, 9.4536, 0.4014, 9.4536);
    expect(est.distanceKm).toBeGreaterThan(0.9);
    expect(est.distanceKm).toBeLessThan(1.1);
    // base 1500 + ~1km * 200 ≈ 1700, strictement supérieur au forfait
    expect(est.fareEstFcfa).toBeGreaterThan(1500);
    expect(est.fareEstFcfa).toBe(Math.ceil(1500 + est.distanceKm * 200));
  });

  it('utilise les tarifs configurés dans le pricing', async () => {
    service = new RideService({} as any, makePricingRepo(2000, 300) as any, {} as any);
    const est = await service.estimateFare(0.3924, 9.4536, 0.3924, 9.4536);
    expect(est.fareEstFcfa).toBe(2000);
    expect(est.perKm).toBe(300);
  });

  it('retombe sur les tarifs par défaut si le pricing est absent', async () => {
    const emptyPricing = { getByKind: vi.fn(async () => null) };
    service = new RideService({} as any, emptyPricing as any, {} as any);
    const est = await service.estimateFare(0.3924, 9.4536, 0.3924, 9.4536);
    expect(est.fareEstFcfa).toBe(1500); // défaut base
  });
});
