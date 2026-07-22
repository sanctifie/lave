import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock: any = vi.hoisted(() => ({
  media: { findFirst: vi.fn(), create: vi.fn() },
  partnerProfile: { update: vi.fn() },
  doctorProfile: { update: vi.fn() },
  courier: { update: vi.fn() },
}));
vi.mock('../../infrastructure/prisma/client', () => ({ prisma: prismaMock }));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn().mockResolvedValue('BASE64DATA') } };
});

import { KycService } from './service';

beforeEach(() => {
  prismaMock.media.findFirst.mockReset();
  prismaMock.partnerProfile.update.mockReset().mockResolvedValue({ id: 'p1', verificationStatus: 'verified' });
  prismaMock.doctorProfile.update.mockReset().mockResolvedValue({ id: 'd1', verificationStatus: 'rejected' });
  prismaMock.courier.update.mockReset().mockResolvedValue({ id: 'c1', verificationStatus: 'verified' });
});

describe('KycService.screen — pré-contrôle IA vision', () => {
  it('404 si aucun justificatif déposé', async () => {
    prismaMock.media.findFirst.mockResolvedValue(null);
    const service = new KycService({ screenDocument: vi.fn() } as any);
    await expect(service.screen('doctor', 'd1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('délègue à l\'IA vision pour une image', async () => {
    prismaMock.media.findFirst.mockResolvedValue({ url: '/uploads/x.png', mimeType: 'image/png' });
    const ai = { screenDocument: vi.fn().mockResolvedValue({ legible: true, concerns: [] }) };
    const service = new KycService(ai as any);
    const res = await service.screen('doctor', 'd1');
    expect(ai.screenDocument).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'image/png', docType: 'doctor' }));
    expect(res).toMatchObject({ legible: true });
  });

  it('ne tente pas la vision sur un PDF (vérif manuelle)', async () => {
    prismaMock.media.findFirst.mockResolvedValue({ url: '/uploads/x.pdf', mimeType: 'application/pdf' });
    const ai = { screenDocument: vi.fn() };
    const service = new KycService(ai as any);
    const res = await service.screen('partner', 'p1');
    expect(ai.screenDocument).not.toHaveBeenCalled();
    expect(res.concerns.length).toBeGreaterThan(0);
  });
});

describe('KycService.decide', () => {
  it('vérifie un partenaire', async () => {
    const service = new KycService();
    await service.decide('partner', 'p1', 'verified');
    expect(prismaMock.partnerProfile.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { verificationStatus: 'verified' } });
  });

  it('rejette un médecin', async () => {
    const service = new KycService();
    await service.decide('doctor', 'd1', 'rejected');
    expect(prismaMock.doctorProfile.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { verificationStatus: 'rejected' } });
  });

  it('vérifie un coursier', async () => {
    const service = new KycService();
    await service.decide('courier', 'c1', 'verified');
    expect(prismaMock.courier.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { verificationStatus: 'verified' } });
  });
});
