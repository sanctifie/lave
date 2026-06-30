import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le service importe le client Prisma au chargement — on le neutralise.
vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { PaymentService } from './service';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    findRideForPayment:      vi.fn(),
    findByRideId:            vi.fn().mockResolvedValue(null),
    createRideTransaction:   vi.fn().mockResolvedValue({ id: 'txn_ride' }),
    findMealOrderForPayment: vi.fn(),
    findByMealOrderId:       vi.fn().mockResolvedValue(null),
    createMealTransaction:   vi.fn().mockResolvedValue({ id: 'txn_meal' }),
    findByIdempotencyKey:    vi.fn().mockResolvedValue(null),
    capture:                 vi.fn().mockResolvedValue(undefined),
    fail:                    vi.fn().mockResolvedValue(undefined),
    release:                 vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const provider = {
  initEscrow:    vi.fn().mockResolvedValue({ providerTransactionId: 'prov_1', status: 'pending' }),
  releaseEscrow: vi.fn(),
  payout:        vi.fn(),
};

function makeService(repo: any) {
  return new PaymentService(repo, {} as any, {} as any, provider as any, {} as any);
}

const rideInput = { rideId: 'r1', phoneNumber: '24107000000', operator: 'airtel' as const };

describe('PaymentService.initRidePayment', () => {
  beforeEach(() => {
    provider.initEscrow.mockClear();
  });

  it('crée l\'escrow pour le propriétaire de la course', async () => {
    const repo = makeRepo({
      findRideForPayment: vi.fn().mockResolvedValue({ fareEstFcfa: 1700, request: { patientId: 'p1' } }),
    });
    const txn = await makeService(repo).initRidePayment('p1', rideInput);

    expect(provider.initEscrow).toHaveBeenCalledWith(expect.objectContaining({ amountFcfa: 1700 }));
    expect(repo.createRideTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ rideId: 'r1', amountFcfa: 1700, providerTransactionId: 'prov_1' }),
    );
    expect(txn).toEqual({ id: 'txn_ride' });
  });

  it('renvoie 404 si la course est introuvable', async () => {
    const repo = makeRepo({ findRideForPayment: vi.fn().mockResolvedValue(null) });
    await expect(makeService(repo).initRidePayment('p1', rideInput))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuse un patient qui n\'est pas le propriétaire (403)', async () => {
    const repo = makeRepo({
      findRideForPayment: vi.fn().mockResolvedValue({ fareEstFcfa: 1700, request: { patientId: 'autre' } }),
    });
    await expect(makeService(repo).initRidePayment('p1', rideInput))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(provider.initEscrow).not.toHaveBeenCalled();
  });

  it('refuse un double paiement (409)', async () => {
    const repo = makeRepo({
      findRideForPayment: vi.fn().mockResolvedValue({ fareEstFcfa: 1700, request: { patientId: 'p1' } }),
      findByRideId:       vi.fn().mockResolvedValue({ id: 'deja' }),
    });
    await expect(makeService(repo).initRidePayment('p1', rideInput))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(provider.initEscrow).not.toHaveBeenCalled();
  });
});

describe('PaymentService.initMealPayment', () => {
  const mealInput = { mealOrderId: 'm1', phoneNumber: '24107000000', operator: 'moov' as const };

  beforeEach(() => provider.initEscrow.mockClear());

  it('crée l\'escrow avec le total de la commande', async () => {
    const repo = makeRepo({
      findMealOrderForPayment: vi.fn().mockResolvedValue({ patientId: 'p1', totalFcfa: 4000 }),
    });
    await makeService(repo).initMealPayment('p1', mealInput);
    expect(provider.initEscrow).toHaveBeenCalledWith(expect.objectContaining({ amountFcfa: 4000 }));
    expect(repo.createMealTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ mealOrderId: 'm1', amountFcfa: 4000 }),
    );
  });

  it('refuse un patient non propriétaire (403)', async () => {
    const repo = makeRepo({
      findMealOrderForPayment: vi.fn().mockResolvedValue({ patientId: 'autre', totalFcfa: 4000 }),
    });
    await expect(makeService(repo).initMealPayment('p1', mealInput))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('PaymentService.releaseRideEscrow (idempotence)', () => {
  beforeEach(() => {
    provider.releaseEscrow.mockClear();
  });

  it('libère l\'escrow quand la transaction est en attente', async () => {
    const repo = makeRepo({
      findByRideId:       vi.fn().mockResolvedValue({ id: 't1', status: 'pending', amountFcfa: 1700, providerTransactionId: 'prov_1' }),
      release:            vi.fn().mockResolvedValue(undefined),
      findRideForPayment: vi.fn().mockResolvedValue(null), // payoutCourier sort proprement
    });
    await makeService(repo).releaseRideEscrow('r1');
    expect(provider.releaseEscrow).toHaveBeenCalledWith('prov_1');
    expect(repo.release).toHaveBeenCalled();
  });

  it('ignore une libération déjà effectuée (anti double-versement)', async () => {
    const repo = makeRepo({
      findByRideId: vi.fn().mockResolvedValue({ id: 't1', status: 'released', amountFcfa: 1700, providerTransactionId: 'prov_1' }),
      release:      vi.fn(),
    });
    await makeService(repo).releaseRideEscrow('r1');
    expect(provider.releaseEscrow).not.toHaveBeenCalled();
    expect(repo.release).not.toHaveBeenCalled();
  });
});

describe('PaymentService.handleWebhook', () => {
  const baseBody = { transactionId: 'PAY9', code: 200, merchantReferenceId: 'idem1' } as any;

  function repoWithTxn(txn: any) {
    return makeRepo({
      findByIdempotencyKey: vi.fn().mockResolvedValue(txn),
      capture:              vi.fn().mockResolvedValue(undefined),
      fail:                 vi.fn().mockResolvedValue(undefined),
    });
  }

  it('capture la transaction sur statut SUCCESS et renvoie l\'accusé', async () => {
    const repo = repoWithTxn({ id: 't1', status: 'pending', amountFcfa: 4000, consultationId: null });
    const echo = await makeService(repo).handleWebhook({ ...baseBody, status: 'SUCCESS' });

    expect(repo.capture).toHaveBeenCalledWith('t1');
    expect(repo.fail).not.toHaveBeenCalled();
    expect(echo).toEqual({ transactionId: 'PAY9', responseCode: 200 });
  });

  it('marque la transaction en échec sur statut FAILED', async () => {
    const repo = repoWithTxn({ id: 't1', status: 'pending', amountFcfa: 4000 });
    await makeService(repo).handleWebhook({ ...baseBody, status: 'FAILED' });

    expect(repo.fail).toHaveBeenCalledWith('t1', 'FAILED');
    expect(repo.capture).not.toHaveBeenCalled();
  });

  it('est idempotent : ignore un retry sur une transaction déjà capturée', async () => {
    const repo = repoWithTxn({ id: 't1', status: 'captured', amountFcfa: 4000 });
    const echo = await makeService(repo).handleWebhook({ ...baseBody, status: 'SUCCESS' });

    expect(repo.capture).not.toHaveBeenCalled();
    expect(repo.fail).not.toHaveBeenCalled();
    expect(echo).toEqual({ transactionId: 'PAY9', responseCode: 200 });
  });

  it('ignore une référence inconnue mais renvoie l\'accusé', async () => {
    const repo = makeRepo({ findByIdempotencyKey: vi.fn().mockResolvedValue(null), capture: vi.fn(), fail: vi.fn() });
    const echo = await makeService(repo).handleWebhook({ ...baseBody, status: 'SUCCESS' });

    expect(repo.capture).not.toHaveBeenCalled();
    expect(echo).toEqual({ transactionId: 'PAY9', responseCode: 200 });
  });
});
