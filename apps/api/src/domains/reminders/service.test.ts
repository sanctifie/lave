import { describe, it, expect, vi } from 'vitest';

vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { ReminderService } from './service';

function make(over: Record<string, any> = {}, ai?: any) {
  const repo = {
    listForPatient: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation((p: string, d: any) => Promise.resolve({ id: 'rem1', patientId: p, ...d })),
    findById: vi.fn(),
    deactivate: vi.fn().mockResolvedValue({ id: 'rem1', active: false }),
    ...over,
  };
  return { repo, service: new ReminderService(repo as any, ai) };
}

describe('ReminderService.remove', () => {
  it('404 si le rappel est introuvable', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue(null) });
    await expect(service.remove('x', 'p1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si le rappel appartient à un autre patient', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue({ id: 'rem1', patientId: 'autre' }) });
    await expect(service.remove('rem1', 'p1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('désactive le rappel du patient', async () => {
    const { service, repo } = make({ findById: vi.fn().mockResolvedValue({ id: 'rem1', patientId: 'p1' }) });
    await service.remove('rem1', 'p1');
    expect(repo.deactivate).toHaveBeenCalledWith('rem1');
  });
});

describe('ReminderService.parsePosology', () => {
  it('null sans IA (retombe sur saisie manuelle)', async () => {
    const { service } = make();
    expect(await service.parsePosology('matin et soir')).toBeNull();
  });

  it('délègue à l\'IA quand disponible', async () => {
    const ai = { parsePosology: vi.fn().mockResolvedValue({ times: ['08:00', '20:00'], durationDays: 7 }) };
    const { service } = make({}, ai);
    const res = await service.parsePosology('1 cp matin et soir 7 jours');
    expect(ai.parsePosology).toHaveBeenCalled();
    expect(res).toMatchObject({ times: ['08:00', '20:00'], durationDays: 7 });
  });

  it('null si l\'IA échoue (jamais de blocage)', async () => {
    const ai = { parsePosology: vi.fn().mockRejectedValue(new Error('down')) };
    const { service } = make({}, ai);
    expect(await service.parsePosology('x')).toBeNull();
  });
});
