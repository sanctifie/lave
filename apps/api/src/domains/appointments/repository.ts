import { prisma } from '../../infrastructure/prisma/client';
import { AppointmentStatus } from '@mbolo/shared';

export class AppointmentRepository {
  async create(data: {
    patientId: string;
    doctorId: string;
    type: string;
    scheduledAt?: Date;
    notes?: string;
  }) {
    return prisma.appointment.create({ data: data as Parameters<typeof prisma.appointment.create>[0]['data'] });
  }

  async listForUser(userId: string) {
    return prisma.appointment.findMany({
      where: { patientId: userId },
      include: { doctor: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.appointment.findUnique({ where: { id }, include: { consultation: true } });
  }

  async cancel(id: string) {
    return prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED } });
  }
}
