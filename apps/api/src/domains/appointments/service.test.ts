import { describe, it, expect, vi, afterEach } from 'vitest';

// Le service importe le client Prisma au chargement → on le neutralise.
vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { AppointmentService } from './service';
import { AppointmentStatus, PricingKind } from '@mbolo/shared';

function make(appt: any, doctorProfile: any = null) {
  const repo = {
    findById: vi.fn().mockResolvedValue(appt),
    cancel:   vi.fn().mockResolvedValue({ ...appt, status: AppointmentStatus.CANCELLED }),
  };
  const doctorRepo = { findByUserId: vi.fn().mockResolvedValue(doctorProfile) };
  const service = new AppointmentService(repo as any, doctorRepo as any, {} as any, {} as any, {} as any, {} as any);
  return { repo, doctorRepo, service };
}

describe('AppointmentService.cancel', () => {
  it('404 si le RDV est introuvable', async () => {
    const { service } = make(null);
    await expect(service.cancel('x', 'p1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si le RDV n\'appartient pas au patient', async () => {
    const { service } = make({ id: 'a1', patientId: 'autre', status: AppointmentStatus.PENDING });
    await expect(service.cancel('a1', 'p1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('annule un RDV en attente', async () => {
    const { service, repo } = make({ id: 'a1', patientId: 'p1', status: AppointmentStatus.CONFIRMED });
    await service.cancel('a1', 'p1');
    expect(repo.cancel).toHaveBeenCalledWith('a1');
  });

  it('422 si le RDV est déjà terminé', async () => {
    const { service, repo } = make({ id: 'a1', patientId: 'p1', status: AppointmentStatus.COMPLETED });
    await expect(service.cancel('a1', 'p1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('422 si une consultation est en cours', async () => {
    const { service } = make({ id: 'a1', patientId: 'p1', status: AppointmentStatus.IN_PROGRESS });
    await expect(service.cancel('a1', 'p1')).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('AppointmentService.getById', () => {
  it('403 si le demandeur n\'est ni le patient ni le médecin', async () => {
    const { service } = make({ id: 'a1', patientId: 'p1', doctorId: 'doc1' }, { id: 'autredoc' });
    await expect(service.getById('a1', 'intrus')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('autorise le patient', async () => {
    const { service } = make({ id: 'a1', patientId: 'p1', doctorId: 'doc1' });
    expect(await service.getById('a1', 'p1')).toMatchObject({ id: 'a1' });
  });
});

describe('AppointmentService.complete — calcul des frais', () => {
  afterEach(() => vi.useRealTimers());

  function setupComplete(over: Record<string, any> = {}) {
    // Durée déterministe : 20 min entre startedAt et "maintenant"
    const startedAt = new Date('2026-01-01T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:20:00.000Z'));

    const appt = {
      id: 'a1', patientId: 'p1', doctorId: 'doc1',
      status: AppointmentStatus.IN_PROGRESS,
      patient: { phone: '24106000000' },
      consultation: { id: 'c1', startedAt, videoSession: { providerRoomName: 'room1' } },
      ...over,
    };
    const repo = {
      findById: vi.fn().mockResolvedValue(appt),
      completeConsultation: vi.fn().mockImplementation((d: any) => Promise.resolve({ ...d, prescription: null })),
    };
    const doctorRepo = { findByUserId: vi.fn().mockResolvedValue({ id: 'doc1', userId: 'docUser', consultationFeeFcfa: 10000 }) };
    const pricingRepo = { getByKind: vi.fn(async (kind: string) => {
      if (kind === PricingKind.VIDEO_USD_PER_PARTICIPANT_MIN) return { valueNum: 0.001 };
      if (kind === PricingKind.USD_TO_FCFA_RATE) return { valueNum: 600 };
      if (kind === PricingKind.CONSULTATION_BASE_FEE) return { valueFcfa: 10000 };
      return null;
    }) };
    const video = { closeRoom: vi.fn().mockResolvedValue(undefined) };
    const notif = { send: vi.fn().mockResolvedValue(undefined) };
    const push = { sendToUser: vi.fn() };
    const service = new AppointmentService(repo as any, doctorRepo as any, pricingRepo as any, video as any, notif as any, push as any);
    return { service, repo, video };
  }

  it('calcule frais vidéo (min × 2 participants × taux) + frais de base', async () => {
    // 20 min × 2 × 0.001 USD × 600 = 24 FCFA vidéo ; base 10000 → total 10024
    const { service, repo, video } = setupComplete();
    const res = await service.complete('a1', 'docUser', { notes: 'RAS' } as any);
    expect(res.durationMin).toBe(20);
    expect(res.videoFeeFcfa).toBe(24);
    expect(res.serviceFeeFcfa).toBe(10024);
    expect(repo.completeConsultation).toHaveBeenCalledWith(expect.objectContaining({ videoFeeFcfa: 24, serviceFeeFcfa: 10024 }));
    expect(video.closeRoom).toHaveBeenCalledWith('room1');
  });

  it('422 si la consultation n\'est pas en cours', async () => {
    const { service } = setupComplete({ status: AppointmentStatus.CONFIRMED });
    await expect(service.complete('a1', 'docUser', { notes: 'x' } as any)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('403 si un autre médecin tente de clôturer', async () => {
    const { service } = setupComplete({ doctorId: 'autre' });
    await expect(service.complete('a1', 'docUser', { notes: 'x' } as any)).rejects.toMatchObject({ statusCode: 403 });
  });
});
