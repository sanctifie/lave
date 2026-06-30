import { describe, it, expect, vi } from 'vitest';

// Le service importe le client Prisma au chargement → on le neutralise.
vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { AppointmentService } from './service';
import { AppointmentStatus } from '@mbolo/shared';

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
