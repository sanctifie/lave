import { prisma } from '../prisma/client';
import { PushProvider, PushMessage } from './index';

export class PushService {
  constructor(private readonly provider: PushProvider) {}

  /** Envoie une push au token Expo enregistré pour cet userId (silencieux si pas de token) */
  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    try {
      const user = await (prisma as any).user.findUnique({
        where:  { id: userId },
        select: { pushToken: true },
      });
      if (!user?.pushToken) return;
      await this.provider.send(user.pushToken as string, message);
    } catch (err) {
      console.error('[PushService] sendToUser failed', err);
    }
  }
}
