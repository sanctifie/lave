import { NotificationProvider, NotificationParams } from './index';

export class StubNotificationProvider implements NotificationProvider {
  async send(params: NotificationParams): Promise<void> {
    console.warn(
      `[NOTIF STUB] ${params.channel ?? 'whatsapp'} → ${params.to} : ${params.message}`,
    );
  }
}
