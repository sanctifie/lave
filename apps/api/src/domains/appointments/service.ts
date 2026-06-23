import { HTTP } from '../../lib/errors';
import { AppointmentRepository } from './repository';
import { DoctorRepository } from '../doctors/repository';
import { CreateAppointmentInput } from './schema';
import { AppointmentType } from '@mbolo/shared';

export class AppointmentService {
  constructor(
    private readonly repo: AppointmentRepository,
    private readonly doctorRepo: DoctorRepository,
  ) {}

  async create(patientId: string, input: CreateAppointmentInput) {
    if (input.type === AppointmentType.IMMEDIATE) {
      const available = await this.doctorRepo.listAvailableNow();
      if (available.length === 0) throw HTTP.unprocessable('Aucun médecin disponible en ce moment');
      // Sélection du 1er disponible — logique de file Redis à implémenter étape 4
      const doctor = available[0];
      return this.repo.create({ patientId, doctorId: doctor.id, type: input.type });
    }

    const doctor = await this.doctorRepo.findById(input.doctorId);
    if (!doctor) throw HTTP.notFound('Médecin introuvable');

    return this.repo.create({
      patientId,
      doctorId: input.doctorId,
      type: input.type,
      scheduledAt: input.scheduledAt,
      notes: input.notes,
    });
  }

  async list(userId: string) {
    return this.repo.listForUser(userId);
  }

  async cancel(id: string, userId: string) {
    const appt = await this.repo.findById(id);
    if (!appt) throw HTTP.notFound('RDV introuvable');
    if (appt.patientId !== userId) throw HTTP.forbidden();
    return this.repo.cancel(id);
  }
}
