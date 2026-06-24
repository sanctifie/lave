import { prisma } from '../../infrastructure/prisma/client';
import { VerificationStatus, AppointmentStatus } from '@mbolo/shared';
import { RegisterDoctorInput } from './schema';

export class DoctorRepository {
  async listVerified(specialty?: string) {
    return prisma.doctorProfile.findMany({
      where: {
        verificationStatus: VerificationStatus.VERIFIED,
        ...(specialty ? { specialty: { name: specialty } } : {}),
      },
      include: { specialty: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listAvailableNow(specialty?: string) {
    return prisma.doctorProfile.findMany({
      where: {
        isAvailableNow:     true,
        verificationStatus: VerificationStatus.VERIFIED,
        ...(specialty ? { specialty: { name: specialty } } : {}),
        // Exclut les médecins déjà en consultation active
        appointments: {
          none: { status: AppointmentStatus.IN_PROGRESS },
        },
      },
      include: { specialty: true, user: { select: { name: true, phone: true } } },
    });
  }

  async countAvailableNow(specialty?: string): Promise<number> {
    return prisma.doctorProfile.count({
      where: {
        isAvailableNow:     true,
        verificationStatus: VerificationStatus.VERIFIED,
        ...(specialty ? { specialty: { name: specialty } } : {}),
        appointments: {
          none: { status: AppointmentStatus.IN_PROGRESS },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.doctorProfile.findUnique({
      where:   { id },
      include: { specialty: true, user: { select: { name: true, phone: true } } },
    });
  }

  async findByUserId(userId: string) {
    return prisma.doctorProfile.findUnique({
      where:   { userId },
      include: { user: { select: { name: true, phone: true } } },
    });
  }

  async create(userId: string, data: RegisterDoctorInput) {
    return prisma.doctorProfile.create({ data: { userId, ...data } });
  }

  async setAvailability(userId: string, isAvailableNow: boolean) {
    return prisma.doctorProfile.update({ where: { userId }, data: { isAvailableNow } });
  }

  /** Retourne les créneaux de dispo hebdomadaires pour un médecin donné */
  async getAvailabilitiesForDoctor(doctorId: string) {
    return prisma.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
    });
  }

  /** RDV déjà pris par ce médecin sur une plage donnée */
  async getBookedSlots(doctorId: string, from: Date, to: Date) {
    return prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: from, lte: to },
        status: { notIn: ['cancelled'] },
      },
      select: { scheduledAt: true },
    });
  }
}
