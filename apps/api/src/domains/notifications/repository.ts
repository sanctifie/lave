import { prisma } from '../../infrastructure/prisma/client';

export class NotificationRepository {
  listForUser(userId: string) {
    return prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
  }

  unreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  }

  markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data:  { readAt: new Date() },
    });
  }
}
