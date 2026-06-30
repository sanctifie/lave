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

describe('OrderService.getById', () => {
  it('403 si la commande n\'appartient pas au demandeur', async () => {
    const { service } = setup(makeOrder({ patientId: 'autre' }));
    await expect(service.getById('ckorder1', 'moi')).rejects.toMatchObject({ statusCode: 403 });
  });
});
