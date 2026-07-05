import { describe, it, expect, vi, beforeEach } from 'vitest';

// placeOrder consulte prisma.partnerProfile pour la notif → on neutralise le client.
vi.mock('../../infrastructure/prisma/client', () => ({
  prisma: { partnerProfile: { findUnique: vi.fn().mockResolvedValue(null) } },
}));

import { MealService } from './service';

function makePlan(over: Record<string, any> = {}) {
  return {
    id: 'plan1', partnerId: 'k1', isActive: true,
    items: [
      { id: 'i1', unitPriceFcfa: 3500, isAvailable: true },
      { id: 'i2', unitPriceFcfa: 2000, isAvailable: true },
      { id: 'i3', unitPriceFcfa: 1500, isAvailable: false },
    ],
    ...over,
  };
}

function setup(plan: any, deliveryFee = 500) {
  const repo = {
    findPlanById: vi.fn().mockResolvedValue(plan),
    createOrder:  vi.fn().mockImplementation((_pid: string, data: any) => Promise.resolve({ id: 'order1', ...data })),
  };
  const pricingRepo = { getByKind: vi.fn().mockResolvedValue({ valueFcfa: deliveryFee }) };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  return { repo, pricingRepo, notif, service: new MealService(repo as any, pricingRepo as any, notif as any) };
}

describe('MealService.placeOrder', () => {
  it('additionne les articles disponibles + les frais de livraison', async () => {
    const { service, repo } = setup(makePlan()); // 3500 + 2000 (i3 indisponible) + 500 = 6000
    const order = await service.placeOrder('p1', { mealPlanId: 'plan1', notes: 'Sans piment' } as any);
    expect(repo.createOrder).toHaveBeenCalledWith('p1', expect.objectContaining({
      mealPlanId: 'plan1', totalFcfa: 6000, deliveryFeeFcfa: 500, notes: 'Sans piment',
    }));
    expect(order).toMatchObject({ totalFcfa: 6000 });
  });

  it('exclut les articles indisponibles du total', async () => {
    const plan = makePlan({ items: [
      { id: 'i1', unitPriceFcfa: 3000, isAvailable: true },
      { id: 'i2', unitPriceFcfa: 9999, isAvailable: false },
    ]});
    const { service, repo } = setup(plan);
    await service.placeOrder('p1', { mealPlanId: 'plan1' } as any);
    expect(repo.createOrder).toHaveBeenCalledWith('p1', expect.objectContaining({ totalFcfa: 3500 })); // 3000 + 500
  });

  it('404 si le menu est introuvable', async () => {
    const { service } = setup(null);
    await expect(service.placeOrder('p1', { mealPlanId: 'x' } as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('422 si le menu est inactif', async () => {
    const { service } = setup(makePlan({ isActive: false }));
    await expect(service.placeOrder('p1', { mealPlanId: 'plan1' } as any)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('422 si aucun article n\'est disponible', async () => {
    const { service } = setup(makePlan({ items: [{ id: 'i1', unitPriceFcfa: 3000, isAvailable: false }] }));
    await expect(service.placeOrder('p1', { mealPlanId: 'plan1' } as any)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('utilise le tarif de livraison par défaut (500) si le pricing est absent', async () => {
    const { service, repo } = setup(makePlan());
    (service as any).pricingRepo.getByKind = vi.fn().mockResolvedValue(null);
    await service.placeOrder('p1', { mealPlanId: 'plan1' } as any);
    expect(repo.createOrder).toHaveBeenCalledWith('p1', expect.objectContaining({ totalFcfa: 6000, deliveryFeeFcfa: 500 }));
  });
});
