import { prisma } from '../../infrastructure/prisma/client';
import { VerificationStatus, AppointmentStatus } from '@mbolo/shared';
import { RegisterDoctorInput } from './schema';

export class DoctorRepository {
  async listVerified(specialty?: string) {
    const doctors = await prisma.doctorProfile.findMany({
      where: {
        verificationStatus: VerificationStatus.VERIFIED,
        ...(specialty ? { specialty: { name: specialty } } : {}),
      },
      include: { specialty: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Note moyenne agrégée (avis non signalés) pour aider le choix du patient.
    const ids = doctors.map((d) => d.id);
    if (ids.length === 0) return doctors.map((d) => ({ ...d, rating: null, reviewCount: 0 }));
    const ratings = await prisma.review.groupBy({
      by: ['refId'],
      where: { refTable: 'doctor_profiles', refId: { in: ids }, flagged: false },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const byId = new Map(ratings.map((r) => [r.refId, r]));
    return doctors.map((d) => {
      const r = byId.get(d.id);
      return {
        ...d,
        rating: r?._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
        reviewCount: r?._count._all ?? 0,
      };
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

  async updateProfile(userId: string, data: { specialtyId?: string; consultationFeeFcfa?: number; bio?: string; languages?: string[] }) {
    return prisma.doctorProfile.update({
      where:   { userId },
      data,
      include: { specialty: true },
    });
  }

  async replaceSchedule(doctorId: string, slots: { dayOfWeek: number; startTimeUtc: string; endTimeUtc: string }[]) {
    await prisma.doctorAvailability.deleteMany({ where: { doctorId } });
    if (slots.length === 0) return [];
    await prisma.doctorAvailability.createMany({
      data: slots.map((s) => ({ doctorId, ...s })),
    });
    return prisma.doctorAvailability.findMany({ where: { doctorId, isActive: true } });
  }

  async listSpecialties() {
    return prisma.doctorSpecialty.findMany({ orderBy: { name: 'asc' } });
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
