import { prisma } from '../../infrastructure/prisma/client';
import { VerificationStatus } from '@mbolo/shared';
import { RegisterDoctorInput } from './schema';

export class DoctorRepository {
  async listVerified() {
    return prisma.doctorProfile.findMany({
      where: { verificationStatus: VerificationStatus.VERIFIED },
      include: { specialty: true, user: { select: { name: true } } },
    });
  }

  async findById(id: string) {
    return prisma.doctorProfile.findUnique({
      where: { id },
      include: { specialty: true, user: { select: { name: true, phone: true } } },
    });
  }

  async findByUserId(userId: string) {
    return prisma.doctorProfile.findUnique({ where: { userId } });
  }

  async create(userId: string, data: RegisterDoctorInput) {
    return prisma.doctorProfile.create({ data: { userId, ...data } });
  }

  async setAvailability(userId: string, isAvailableNow: boolean) {
    return prisma.doctorProfile.update({ where: { userId }, data: { isAvailableNow } });
  }

  async listAvailableNow() {
    return prisma.doctorProfile.findMany({
      where: { isAvailableNow: true, verificationStatus: VerificationStatus.VERIFIED },
      include: { user: { select: { name: true } } },
    });
  }
}
