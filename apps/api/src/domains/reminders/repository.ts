import { prisma } from '../../infrastructure/prisma/client';
import { CreateReminderInput } from './schema';

export class ReminderRepository {
  listForPatient(patientId: string) {
    return prisma.medicationReminder.findMany({
      where: { patientId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(patientId: string, data: CreateReminderInput) {
    return prisma.medicationReminder.create({
      data: {
        patientId,
        medication: data.medication,
        times: data.times,
        durationDays: data.durationDays,
      },
    });
  }

  findById(id: string) {
    return prisma.medicationReminder.findUnique({ where: { id } });
  }

  deactivate(id: string) {
    return prisma.medicationReminder.update({ where: { id }, data: { active: false } });
  }
}
