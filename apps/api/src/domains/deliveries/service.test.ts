import { describe, it, expect, vi } from 'vitest';
import { DeliveryService } from './service';

function setup(over: Record<string, any> = {}) {
  const delivery = {
    id: 'dlv1',
    orderId: 'order1',
    handoverCode: '123456',
    order: { patient: { id: 'patient1', phone: '24106000000' }, patientId: 'patient1' },
    ...over.delivery,
  };
  const repo = {
    findById: vi.fn().mockResolvedValue(delivery),
    confirmHandover: vi.fn().mockResolvedValue(delivery),
    ...over.repo,
  };
  const orderRepo = {
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue({
      id: 'order1',
      totalFcfa: 10000,
      caisseShareFcfa: 4000,
      partner: { phone: '24107000000', whatsappNumber: null },
      patient: { phone: '24106000000' },
    }),
    ...over.orderRepo,
  };
  const paymentRepo = {
    findByOrderId: vi.fn().mockResolvedValue({ id: 't1', providerTransactionId: 'prov1', status: 'captured' }),
    release: vi.fn().mockResolvedValue(undefined),
    ...over.paymentRepo,
  };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  const provider = {
    releaseEscrow: vi.fn().mockResolvedValue(undefined),
    payout: vi.fn().mockResolvedValue(undefined),
  };
  const pricingRepo = { getByKind: vi.fn().mockResolvedValue(null) };
  const service = new DeliveryService(
    repo as any,
    orderRepo as any,
    paymentRepo as any,
    notif as any,
    provider as any,
    pricingRepo as any,
  );
  return { service, repo, orderRepo, provider, notif };
}

describe('DeliveryService.confirmHandover — sécurité & principe légal', () => {
  it("403 si le demandeur n'est pas le patient de la commande", async () => {
    const { service, repo } = setup();
    await expect(service.confirmHandover('dlv1', '123456', 'intrus')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(repo.confirmHandover).not.toHaveBeenCalled();
  });

  it('404 si la livraison est introuvable', async () => {
    const { service } = setup({ repo: { findById: vi.fn().mockResolvedValue(null) } });
    await expect(service.confirmHandover('x', '123456', 'patient1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('422 si le code de remise est invalide', async () => {
    const { service } = setup({ repo: { confirmHandover: vi.fn().mockResolvedValue(null) } });
    await expect(service.confirmHandover('dlv1', '000000', 'patient1')).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('payout pharmacie = part médicaments encaissée, SANS commission (10000 − 4000 caisse = 6000)', async () => {
    const { service, provider } = setup();
    await service.confirmHandover('dlv1', '123456', 'patient1');
    expect(provider.payout).toHaveBeenCalledWith(
      expect.objectContaining({ amountFcfa: 6000 }),
    );
  });

  it('sans assurance : payout = 100 % du total médicaments', async () => {
    const { service, provider } = setup({
      orderRepo: {
        findById: vi.fn().mockResolvedValue({
          id: 'order1',
          totalFcfa: 8000,
          caisseShareFcfa: 0,
          partner: { phone: '24107000000', whatsappNumber: null },
          patient: { phone: '24106000000' },
        }),
      },
    });
    await service.confirmHandover('dlv1', '123456', 'patient1');
    expect(provider.payout).toHaveBeenCalledWith(expect.objectContaining({ amountFcfa: 8000 }));
  });
});

describe('DeliveryService.getTracking — suivi en direct & accès', () => {
  function trackSetup(over: Record<string, any> = {}) {
    const { service, repo } = setup({
      delivery: over.delivery,
      repo: {
        latestTracking: vi.fn().mockResolvedValue({
          lat: 0.39, lng: 9.45, status: 'en_route_delivery', recordedAt: new Date('2026-07-20T08:00:00Z'),
        }),
        ...over.repo,
      },
    });
    return { service, repo };
  }

  it("403 si le demandeur n'est ni le patient ni un coursier", async () => {
    const { service } = trackSetup();
    await expect(service.getTracking('dlv1', { userId: 'intrus', role: 'patient' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('404 si la livraison est introuvable', async () => {
    const { service } = trackSetup({ repo: { findById: vi.fn().mockResolvedValue(null) } });
    await expect(service.getTracking('x', { userId: 'patient1', role: 'patient' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('renvoie la dernière position au patient destinataire', async () => {
    const { service } = trackSetup();
    const res = await service.getTracking('dlv1', { userId: 'patient1', role: 'patient' });
    expect(res.courier).toMatchObject({ lat: 0.39, lng: 9.45 });
    expect(res.updatedAt).toBeInstanceOf(Date);
  });

  it('autorise un coursier si la course est encore à prendre (pending)', async () => {
    const { service } = trackSetup({ delivery: { status: 'pending_assignment' } });
    const res = await service.getTracking('dlv1', { userId: 'courierX', role: 'courier' });
    expect(res.courier).not.toBeNull();
  });

  it('403 pour un coursier NON assigné sur une course déjà prise (anti-IDOR)', async () => {
    // Course sans statut « à prendre » et sans coursier rattaché : un coursier
    // tiers ne doit pas pouvoir lire la position ni les données du patient.
    const { service } = trackSetup();
    await expect(service.getTracking('dlv1', { userId: 'courierX', role: 'courier' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('courier = null si aucune position enregistrée', async () => {
    const { service } = trackSetup({ repo: { latestTracking: vi.fn().mockResolvedValue(null) } });
    const res = await service.getTracking('dlv1', { userId: 'patient1', role: 'patient' });
    expect(res.courier).toBeNull();
    expect(res.updatedAt).toBeNull();
  });
});
