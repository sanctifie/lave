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
}
