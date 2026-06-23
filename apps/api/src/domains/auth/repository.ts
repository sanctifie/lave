import { prisma } from '../../infrastructure/prisma/client';
import { UserRole } from '@mbolo/shared';

export class AuthRepository {
  async findOrCreateUser(phone: string) {
    return prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, role: UserRole.PATIENT, name: phone },
      select: { id: true, phone: true, role: true, name: true, isActive: true },
    });
  }

  async findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, role: true, name: true, isActive: true },
    });
  }
}
