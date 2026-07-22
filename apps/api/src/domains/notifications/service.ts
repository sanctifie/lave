import { HTTP } from '../../lib/errors';
import { NotificationRepository } from './repository';

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  listMine(userId: string) {
    return this.repo.listForUser(userId);
  }

  unreadCount(userId: string) {
    return this.repo.unreadCount(userId);
  }

  async markRead(id: string, userId: string) {
    const n = await this.repo.findById(id);
    if (!n) throw HTTP.notFound('Notification introuvable');
    if (n.userId !== userId) throw HTTP.forbidden();
    return this.repo.markRead(id);
  }

  async markAllRead(userId: string) {
    const res = await this.repo.markAllRead(userId);
    return { updated: res.count };
  }
}
