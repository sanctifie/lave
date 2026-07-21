import { describe, it, expect, vi } from 'vitest';
import { ReviewService } from './service';

function setup(over: Record<string, any> = {}, ai?: any) {
  const repo = {
    create: vi.fn().mockImplementation((a: string, d: any, mod?: any) => Promise.resolve({ id: 'r1', authorId: a, ...d, ...mod })),
    findExisting: vi.fn().mockResolvedValue(null),
    listFlagged: vi.fn().mockResolvedValue([]),
    clearFlag: vi.fn().mockResolvedValue({ id: 'r1', flagged: false }),
    remove: vi.fn().mockResolvedValue({ id: 'r1' }),
    hasDeliveredOrderWithPartner: vi.fn().mockResolvedValue(1),
    hasDeliveryWithCourier: vi.fn().mockResolvedValue(1),
    hasCompletedConsultationWithDoctor: vi.fn().mockResolvedValue(1),
    summary: vi.fn().mockResolvedValue({ average: 4.5, count: 2, recent: [] }),
    ...over,
  };
  return { repo, service: new ReviewService(repo as any, ai) };
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

  it('modère le commentaire via l\'IA et signale un avis injurieux', async () => {
    const ai = { moderateReview: vi.fn().mockResolvedValue({ flagged: true, reason: 'Injure' }) };
    const { service, repo } = setup({}, ai);
    await service.create('u1', { refTable: 'couriers', refId: 'c1', rating: 1, comment: 'sale escroc' } as any);
    expect(ai.moderateReview).toHaveBeenCalledWith('sale escroc');
    expect(repo.create).toHaveBeenCalledWith('u1', expect.anything(), { flagged: true, moderationNote: 'Injure' });
  });

  it('ne bloque pas la création si l\'IA échoue', async () => {
    const ai = { moderateReview: vi.fn().mockRejectedValue(new Error('down')) };
    const { service, repo } = setup({}, ai);
    const res = await service.create('u1', { refTable: 'couriers', refId: 'c1', rating: 5, comment: 'Bien' } as any);
    expect(res).toMatchObject({ flagged: false });
    expect(repo.create).toHaveBeenCalled();
  });

  it('ne modère pas les avis sans commentaire', async () => {
    const ai = { moderateReview: vi.fn() };
    const { service } = setup({}, ai);
    await service.create('u1', { refTable: 'couriers', refId: 'c1', rating: 5 } as any);
    expect(ai.moderateReview).not.toHaveBeenCalled();
  });
});

describe('ReviewService.moderate (admin)', () => {
  it('approve lève le flag', async () => {
    const { service, repo } = setup();
    await service.moderate('r1', 'approve');
    expect(repo.clearFlag).toHaveBeenCalledWith('r1');
  });

  it('remove supprime l\'avis', async () => {
    const { service, repo } = setup();
    await service.moderate('r1', 'remove');
    expect(repo.remove).toHaveBeenCalledWith('r1');
  });
});
