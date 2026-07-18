import { prisma } from '../../infrastructure/prisma/client';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: { name?: string }) {
    return prisma.user.update({ where: { id }, data });
  }

  async savePushToken(id: string, pushToken: string) {
    return (prisma as any).user.update({ where: { id }, data: { pushToken } });
  }

  async getPatientProfile(userId: string) {
    return (prisma as any).patientProfile.findUnique({ where: { userId } });
  }

  async upsertPatientProfile(
    userId: string,
    data: {
      dateOfBirth?: Date | null;
      bloodType?: string | null;
      allergies?: string[];
      insuranceProvider?: string;
      insuranceNumber?: string | null;
      insuranceCoverageRate?: number | null;
    },
  ) {
    return (prisma as any).patientProfile.upsert({
      where:  { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
