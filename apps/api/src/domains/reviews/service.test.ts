import { describe, it, expect, vi } from 'vitest';
import { ReviewService } from './service';

function setup(over: Record<string, any> = {}) {
  const repo = {
    create: vi.fn().mockImplementation((a: string, d: any) => Promise.resolve({ id: 'r1', authorId: a, ...d })),
    findExisting: vi.fn().mockResolvedValue(null),
    hasDeliveredOrderWithPartner: vi.fn().mockResolvedValue(1),
    hasDeliveryWithCourier: vi.fn().mockResolvedValue(1),
    hasCompletedConsultationWithDoctor: vi.fn().mockResolvedValue(1),
    summary: vi.fn().mockResolvedValue({ average: 4.5, count: 2, recent: [] }),
    ...over,
  };
  return { repo, service: new ReviewService(repo as any) };
}

describe('ReviewService.create', () => {
  it('403 si l\'auteur n\'a jamais utilisé le service', async () => {
    const { service } = setup({ hasDeliveredOrderWithPartner: vi.fn().mockResolvedValue(0) });
    await expect(
      service.create('u1', { refTable: 'partner_profiles', refId: 'p1', rating: 5 } as any),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('409 si un avis existe déjà', async () => {
    const { service } = setup({ findExisting: vi.fn().mockResolvedValue({ id: 'old' }) });
    await expect(
      service.create('u1', { refTable: 'partner_profiles', refId: 'p1', rating: 4 } as any),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('crée l\'avis pour un patient éligible', async () => {
    const { service, repo } = setup();
    const res = await service.create('u1', { refTable: 'couriers', refId: 'c1', rating: 5, comment: 'Top' } as any);
    expect(repo.create).toHaveBeenCalled();
    expect(res).toMatchObject({ rating: 5, comment: 'Top' });
  });
});
