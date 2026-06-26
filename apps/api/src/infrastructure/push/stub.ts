import { PushProvider, PushMessage } from './index';

export class StubPushProvider implements PushProvider {
  async send(expoPushToken: string, message: PushMessage): Promise<void> {
    console.warn(`[PUSH STUB] → ${expoPushToken.slice(0, 30)}… | ${message.title}: ${message.body}`);
  }
}
