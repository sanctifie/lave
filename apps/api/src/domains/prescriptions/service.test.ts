import { describe, it, expect, vi } from 'vitest';
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
