import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from './service';
import { OrderStatus } from '@mbolo/shared';

function makeOrder(over: Record<string, any> = {}) {
  return { id: 'ckorder1', partnerId: 'partner1', status: OrderStatus.PENDING_PHARMACY, patient: { phone: '24106000000' }, ...over };
}

function setup(order: any) {
  const repo = {
    findById:     vi.fn().mockResolvedValue(order),
    updateStatus: vi.fn().mockImplementation((id: string, status: string) => Promise.resolve({ id, status })),
  };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  const payments = { refundOrderEscrow: vi.fn().mockResolvedValue({ refunded: true }) };
  const service = new OrderService(repo as any, notif as any, undefined, undefined, undefined, payments as any);
  return { repo, notif, payments, service };
}

describe('OrderService.partnerAction', () => {
  it('404 si la commande est introuvable', async () => {
    const { service } = setup(null);
    await expect(service.partnerAction('x', 'partner1', { action: 'prepare' } as any))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si la commande appartient à une autre officine', async () => {
    const { service } = setup(makeOrder({ partnerId: 'autre' }));
    await expect(service.partnerAction('ckorder1', 'partner1', { action: 'prepare' } as any))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('prepare : pending_pharmacy → preparing + notifie le patient', async () => {
    const { service, repo, notif } = setup(makeOrder({ status: OrderStatus.PENDING_PHARMACY }));
    const res = await service.partnerAction('ckorder1', 'partner1', { action: 'prepare' } as any);
    expect(repo.updateStatus).toHaveBeenCalledWith('ckorder1', OrderStatus.PREPARING);
    expect(notif.send).toHaveBeenCalled();
    expect(res).toMatchObject({ status: OrderStatus.PREPARING });
  });

  it('ready : preparing → ready_for_pickup', async () => {
    const { service, repo } = setup(makeOrder({ status: OrderStatus.PREPARING }));
    await service.partnerAction('ckorder1', 'partner1', { action: 'ready' } as any);
    expect(repo.updateStatus).toHaveBeenCalledWith('ckorder1', OrderStatus.READY_FOR_PICKUP);
  });

  it('ready : 422 si le statut n\'est pas preparing', async () => {
    const { service } = setup(makeOrder({ status: OrderStatus.PENDING_PHARMACY }));
    await expect(service.partnerAction('ckorder1', 'partner1', { action: 'ready' } as any))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  it('reject : passe en pharmacy_rejected + notifie le motif + rembourse le séquestre', async () => {
    const { service, repo, notif, payments } = setup(makeOrder({ status: OrderStatus.PENDING_PHARMACY }));
    await service.partnerAction('ckorder1', 'partner1', { action: 'reject', reason: 'Rupture de stock' } as any);
    expect(repo.updateStatus).toHaveBeenCalledWith('ckorder1', OrderStatus.PHARMACY_REJECTED);
    expect(notif.send).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Rupture de stock') }));
    expect(payments.refundOrderEscrow).toHaveBeenCalledWith('ckorder1');
  });
});

function setupSub(order: any, applyResult: any) {
  const repo = {
    findById: vi.fn().mockResolvedValue(order),
    applySubstitutionDecision: vi.fn().mockResolvedValue(applyResult),
  };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  const deliveryRepo = { create: vi.fn().mockResolvedValue({ id: 'dlv1' }) };
  const pricingRepo = { getByKind: vi.fn().mockResolvedValue({ valueFcfa: 1000 }) };
  const payments = { refundOrderEscrow: vi.fn().mockResolvedValue({ refunded: true }) };
  // push volontairement omis → pas d'appel prisma (boucle coursiers) dans le test
  const service = new OrderService(repo as any, notif as any, deliveryRepo as any, pricingRepo as any, undefined, payments as any);
  return { repo, notif, deliveryRepo, payments, service };
}

const subOrder = (over: Record<string, any> = {}) =>
  makeOrder({
    patientId: 'patient1',
    serviceFeeFcfa: 500,
    status: OrderStatus.PENDING_SUBSTITUTION,
    items: [{ id: 'it1', substitutionStatus: 'pending' }],
    ...over,
  });

describe('OrderService.decideSubstitution', () => {
  it('403 si la commande n\'est pas au patient', async () => {
    const { service } = setupSub(subOrder({ patientId: 'autre' }), null);
    await expect(
      service.decideSubstitution('ckorder1', 'patient1', { decisions: [{ itemId: 'it1', accepted: true }] } as any),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('422 si la commande n\'attend aucun équivalent', async () => {
    const { service } = setupSub(subOrder({ status: OrderStatus.PENDING_PHARMACY }), null);
    await expect(
      service.decideSubstitution('ckorder1', 'patient1', { decisions: [{ itemId: 'it1', accepted: true }] } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('accepte : applique la décision et crée la livraison', async () => {
    const { service, repo, deliveryRepo } = setupSub(subOrder(), {
      order: { id: 'ckorder1', totalFcfa: 1200, status: OrderStatus.PENDING_PHARMACY },
      allRejected: false,
    });
    const res = await service.decideSubstitution('ckorder1', 'patient1', {
      decisions: [{ itemId: 'it1', accepted: true }],
    } as any);
    expect(repo.applySubstitutionDecision).toHaveBeenCalledWith('ckorder1', [{ itemId: 'it1', accepted: true }]);
    expect(deliveryRepo.create).toHaveBeenCalled();
    expect(res).toMatchObject({ cancelled: false });
  });

  it('tout refusé : annule la commande, pas de livraison, rembourse le séquestre', async () => {
    const { service, notif, deliveryRepo, payments } = setupSub(subOrder(), {
      order: { id: 'ckorder1', totalFcfa: 0, status: OrderStatus.CANCELLED },
      allRejected: true,
    });
    const res = await service.decideSubstitution('ckorder1', 'patient1', {
      decisions: [{ itemId: 'it1', accepted: false }],
    } as any);
    expect(deliveryRepo.create).not.toHaveBeenCalled();
    expect(notif.send).toHaveBeenCalled();
    expect(payments.refundOrderEscrow).toHaveBeenCalledWith('ckorder1');
    expect(res).toMatchObject({ cancelled: true });
  });

  it('ignore les décisions sur des articles non en attente (422 si rien ne reste)', async () => {
    const { service } = setupSub(subOrder(), null);
    await expect(
      service.decideSubstitution('ckorder1', 'patient1', { decisions: [{ itemId: 'inconnu', accepted: true }] } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

function setupReco(order: any, applyResult: any) {
  const repo = {
    findById: vi.fn().mockResolvedValue(order),
    applyRecommendationDecision: vi.fn().mockResolvedValue(applyResult),
  };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  const service = new OrderService(repo as any, notif as any);
  return { repo, notif, service };
}

const recoOrder = (over: Record<string, any> = {}) =>
  makeOrder({
    patientId: 'patient1',
    serviceFeeFcfa: 500,
    status: OrderStatus.PENDING_PHARMACY,
    items: [{ id: 'rec1', recommendationStatus: 'suggested' }],
    ...over,
  });

describe('OrderService.decideRecommendation', () => {
  it('403 si la commande n\'est pas au patient', async () => {
    const { service } = setupReco(recoOrder({ patientId: 'autre' }), null);
    await expect(
      service.decideRecommendation('ckorder1', 'patient1', { decisions: [{ itemId: 'rec1', accepted: true }] } as any),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('422 si la commande n\'est plus modifiable', async () => {
    const { service } = setupReco(recoOrder({ status: OrderStatus.PREPARING }), null);
    await expect(
      service.decideRecommendation('ckorder1', 'patient1', { decisions: [{ itemId: 'rec1', accepted: true }] } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('accepte un conseil : applique la décision et recalcule le total', async () => {
    const { service, repo, notif } = setupReco(recoOrder(), {
      order: { id: 'ckorder1', totalFcfa: 3000 },
      totalFcfa: 3000,
    });
    const res = await service.decideRecommendation('ckorder1', 'patient1', {
      decisions: [{ itemId: 'rec1', accepted: true }],
    } as any);
    expect(repo.applyRecommendationDecision).toHaveBeenCalledWith('ckorder1', [{ itemId: 'rec1', accepted: true }]);
    expect(notif.send).toHaveBeenCalled();
    expect(res).toMatchObject({ totalFcfa: 3000 });
  });

  it('écarte un conseil : pas de notification d\'ajout', async () => {
    const { service, repo, notif } = setupReco(recoOrder(), {
      order: { id: 'ckorder1', totalFcfa: 2000 },
      totalFcfa: 2000,
    });
    await service.decideRecommendation('ckorder1', 'patient1', {
      decisions: [{ itemId: 'rec1', accepted: false }],
    } as any);
    expect(repo.applyRecommendationDecision).toHaveBeenCalled();
    expect(notif.send).not.toHaveBeenCalled();
  });

  it('422 si aucune décision ne porte sur un conseil en attente', async () => {
    const { service } = setupReco(recoOrder(), null);
    await expect(
      service.decideRecommendation('ckorder1', 'patient1', { decisions: [{ itemId: 'inconnu', accepted: true }] } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('OrderService.statsForPartner', () => {
  it('agrège CA, panier moyen, conseils et top produits', async () => {
    const repo = {
      statsForPartner: vi.fn().mockResolvedValue({
        agg: { _count: { _all: 2 }, _sum: { totalFcfa: 10000, caisseShareFcfa: 4000 } },
        items: [
          { name: 'Doliprane', quantity: 2, totalFcfa: 4000, kind: 'prescribed', recommendationStatus: 'none' },
          { name: 'Amoxicilline', quantity: 1, totalFcfa: 6000, kind: 'prescribed', recommendationStatus: 'none' },
          { name: 'Vitamine C', quantity: 1, totalFcfa: 1500, kind: 'recommended', recommendationStatus: 'accepted' },
          { name: 'Probiotiques', quantity: 1, totalFcfa: 3000, kind: 'recommended', recommendationStatus: 'suggested' },
        ],
      }),
    };
    const service = new OrderService(repo as any, {} as any);
    const res = await service.statsForPartner('partner1');
    expect(res.ordersCount).toBe(2);
    expect(res.revenueFcfa).toBe(10000);
    expect(res.avgBasketFcfa).toBe(5000);
    expect(res.adviceCount).toBe(1); // seul le conseil accepté compte
    expect(res.adviceRevenueFcfa).toBe(1500);
    // top produit = Amoxicilline (6000) ; le conseil suggéré (non accepté) est exclu
    expect(res.topProducts[0]).toMatchObject({ name: 'Amoxicilline', revenueFcfa: 6000 });
    expect(res.topProducts.find((p: any) => p.name === 'Probiotiques')).toBeUndefined();
  });
});

describe('OrderService.earningsForPartner', () => {
  it('classe les commandes en versé / séquestre / en attente', async () => {
    const repo = {
      earningsForPartner: vi.fn().mockResolvedValue([
        { id: 'o1', totalFcfa: 5000, status: 'delivered', transaction: { status: 'released' }, delivery: { status: 'delivered' } },
        { id: 'o2', totalFcfa: 3000, status: 'preparing', transaction: { status: 'captured' }, delivery: null },
        { id: 'o3', totalFcfa: 2000, status: 'pending_pharmacy', transaction: null, delivery: null },
      ]),
    };
    const service = new OrderService(repo as any, {} as any);
    const res = await service.earningsForPartner('partner1');
    expect(res.releasedFcfa).toBe(5000);
    expect(res.escrowFcfa).toBe(3000);
    expect(res.pendingFcfa).toBe(2000);
    expect(res.rows).toHaveLength(3);
  });
});

describe('OrderService.insuranceClaimsForPartner', () => {
  it('totalise les créances part-caisse par organisme', async () => {
    const repo = {
      insuranceClaimsForPartner: vi.fn().mockResolvedValue([
        { id: 'o1', createdAt: new Date(), insuranceProvider: 'cnamgs', insuranceCoverageRate: 80, caisseShareFcfa: 5600, totalFcfa: 7000, patient: { name: 'Awa' } },
        { id: 'o2', createdAt: new Date(), insuranceProvider: 'cnamgs', insuranceCoverageRate: 80, caisseShareFcfa: 2400, totalFcfa: 3000, patient: { name: 'Koffi' } },
      ]),
    };
    const service = new OrderService(repo as any, {} as any);
    const res = await service.insuranceClaimsForPartner('partner1');
    expect(res.totalFcfa).toBe(8000);
    expect(res.count).toBe(2);
    expect(res.byProvider.cnamgs).toBe(8000);
  });
});

describe('OrderService.getById', () => {
  it('403 si la commande n\'appartient pas au demandeur', async () => {
    const { service } = setup(makeOrder({ patientId: 'autre' }));
    await expect(service.getById('ckorder1', 'moi')).rejects.toMatchObject({ statusCode: 403 });
  });
});
