export type NotificationChannel = 'whatsapp' | 'sms';

export interface NotificationParams {
  to: string;
  message: string;
  channel?: NotificationChannel;
}

export interface NotificationProvider {
  send(params: NotificationParams): Promise<void>;
}

export class NotificationService {
  constructor(
    private readonly primary: NotificationProvider,
    private readonly fallback: NotificationProvider,
  ) {}

  async send(params: NotificationParams): Promise<void> {
    try {
      await this.primary.send({ ...params, channel: 'whatsapp' });
    } catch {
      await this.fallback.send({ ...params, channel: 'sms' });
    }
  }
}
