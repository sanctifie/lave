import { describe, it, expect, vi } from 'vitest';

// Le service importe le client Prisma (notification des coursiers) — neutralisé.
vi.mock('../../infrastructure/prisma/client', () => ({
  prisma: { courier: { findMany: vi.fn().mockResolvedValue([]) } },
}));
import { PrescriptionService } from './service';
import { PrescriptionStatus } from '@mbolo/shared';

function makeSource(over: Record<string, any> = {}) {
  return {
    id: 'ckrxsource1',
    patientId: 'patient1',
    status: PrescriptionStatus.VALIDATED,
    targetPartner: { whatsappNumber: '24106000000', phone: '24106000000' },
    patient: { name: 'Awa', phone: '24106000000' },
    ...over,
  };
}

function setup(source: any, renewed: any = null) {
  const repo = {
    findById: vi.fn().mockResolvedValue(source),
    renewFrom: vi.fn().mockResolvedValue(renewed),
  };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  const service = new PrescriptionService(
    repo as any,
    {} as any,
    {} as any,
    {} as any,
    notif as any,
    {} as any,
  );
  return { repo, notif, service };
}

describe('PrescriptionService.renew', () => {
  it('404 si l\'ordonnance source est introuvable', async () => {
    const { service } = setup(null);
    await expect(service.renew('x', 'patient1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si l\'ordonnance n\'appartient pas au patient', async () => {
    const { service } = setup(makeSource({ patientId: 'autre' }));
    await expect(service.renew('ckrxsource1', 'patient1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('422 si l\'ordonnance n\'a pas été validée (en attente)', async () => {
    const { service } = setup(makeSource({ status: PrescriptionStatus.PENDING_VALIDATION }));
    await expect(service.renew('ckrxsource1', 'patient1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('422 si l\'ordonnance a été refusée', async () => {
    const { service } = setup(makeSource({ status: PrescriptionStatus.REJECTED }));
    await expect(service.renew('ckrxsource1', 'patient1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('recrée l\'ordonnance et notifie la pharmacie', async () => {
    const renewed = {
      id: 'ckrxnew1',
      targetPartner: { whatsappNumber: '24106000000', phone: '24106000000' },
      patient: { name: 'Awa' },
    };
    const { service, repo, notif } = setup(makeSource(), renewed);
    const res = await service.renew('ckrxsource1', 'patient1');
    expect(repo.renewFrom).toHaveBeenCalledWith('ckrxsource1', 'patient1');
    expect(notif.send).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 'ckrxnew1' });
  });

  it('renouvelle aussi une ordonnance déjà servie (filled)', async () => {
    const renewed = { id: 'ckrxnew2', targetPartner: null, patient: { name: 'Awa' } };
    const { service, repo } = setup(makeSource({ status: PrescriptionStatus.FILLED }), renewed);
    const res = await service.renew('ckrxsource1', 'patient1');
    expect(repo.renewFrom).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 'ckrxnew2' });
  });
});

describe('PrescriptionService.validate — stupéfiants (ordonnancier)', () => {
  function setupV(rx: Record<string, any>) {
    const repo = {
      findById: vi.fn().mockResolvedValue(rx),
      validate: vi.fn().mockResolvedValue({ id: rx.id }),
      recordControlledDispensing: vi.fn().mockResolvedValue({ seqs: [1], note: 'n' }),
    };
    const orderRepo = { create: vi.fn().mockResolvedValue({ id: 'o1' }) };
    const deliveryRepo = { create: vi.fn().mockResolvedValue({ id: 'd1' }) };
    const pricingRepo = { getByKind: vi.fn().mockResolvedValue(null) };
    const notif = { send: vi.fn().mockResolvedValue(undefined) };
    const push = { sendToUser: vi.fn() };
    const service = new PrescriptionService(
      repo as any, orderRepo as any, deliveryRepo as any, pricingRepo as any, notif as any, push as any,
    );
    return { service, repo };
  }
  const baseRx = {
    id: 'rx1', targetPartnerId: 'p1', status: 'pending_validation',
    patient: { name: 'Awa', phone: '241', patientProfile: null },
    targetPartner: { legalName: 'Ph. Centre' },
  };
  const cItem = { name: 'Morphine', quantity: 1, unitPriceFcfa: 5000, controlled: true };

  it('422 si ordonnance déjà annotée stupéfiant servi (anti double délivrance)', async () => {
    const { service } = setupV({ ...baseRx, controlledNote: 'déjà servi' });
    await expect(
      service.validate('rx1', 'u1', 'p1', { approved: true, items: [cItem], prescriberName: 'Dr Mba' } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('422 si stupéfiant sur un simple conseil (type advice)', async () => {
    const { service } = setupV({ ...baseRx, type: 'advice' });
    await expect(
      service.validate('rx1', 'u1', 'p1', { approved: true, items: [cItem], prescriberName: 'Dr Mba' } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('422 si stupéfiant substitué par un équivalent', async () => {
    const { service } = setupV({ ...baseRx, substitutionConsent: 'allow' });
    await expect(
      service.validate('rx1', 'u1', 'p1', {
        approved: true, prescriberName: 'Dr Mba',
        items: [{ ...cItem, substituted: true, originalName: 'X', substitutionReason: 'rupture' }],
      } as any),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('inscrit le stupéfiant à l ordonnancier à la validation', async () => {
    const { service, repo } = setupV({ ...baseRx });
    await service.validate('rx1', 'u1', 'p1', { approved: true, items: [cItem], prescriberName: 'Dr Mba' } as any);
    expect(repo.recordControlledDispensing).toHaveBeenCalledWith(
      expect.objectContaining({ prescriberName: 'Dr Mba', items: [{ name: 'Morphine', quantity: 1, unitPriceFcfa: 5000 }] }),
    );
  });
});
