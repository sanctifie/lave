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
  return { repo, notif, service: new OrderService(repo as any, notif as any) };
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

  it('reject : passe en pharmacy_rejected + notifie le motif', async () => {
    const { service, repo, notif } = setup(makeOrder({ status: OrderStatus.PENDING_PHARMACY }));
    await service.partnerAction('ckorder1', 'partner1', { action: 'reject', reason: 'Rupture de stock' } as any);
    expect(repo.updateStatus).toHaveBeenCalledWith('ckorder1', OrderStatus.PHARMACY_REJECTED);
    expect(notif.send).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Rupture de stock') }));
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
  // push volontairement omis → pas d'appel prisma (boucle coursiers) dans le test
  const service = new OrderService(repo as any, notif as any, deliveryRepo as any, pricingRepo as any);
  return { repo, notif, deliveryRepo, service };
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

  it('tout refusé : annule la commande, pas de livraison', async () => {
    const { service, notif, deliveryRepo } = setupSub(subOrder(), {
      order: { id: 'ckorder1', totalFcfa: 0, status: OrderStatus.CANCELLED },
      allRejected: true,
    });
    const res = await service.decideSubstitution('ckorder1', 'patient1', {
      decisions: [{ itemId: 'it1', accepted: false }],
    } as any);
    expect(deliveryRepo.create).not.toHaveBeenCalled();
    expect(notif.send).toHaveBeenCalled();
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

describe('OrderService.getById', () => {
  it('403 si la commande n\'appartient pas au demandeur', async () => {
    const { service } = setup(makeOrder({ patientId: 'autre' }));
    await expect(service.getById('ckorder1', 'moi')).rejects.toMatchObject({ statusCode: 403 });
  });
});
