import { PushProvider, PushMessage } from './index';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export class ExpoPushProvider implements PushProvider {
  constructor(private readonly accessToken?: string) {}

  async send(expoPushToken: string, message: PushMessage): Promise<void> {
    if (!expoPushToken.startsWith('ExponentPushToken[')) {
      console.warn('[ExpoPush] Token invalide, notification ignorée');
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const resp = await fetch(EXPO_PUSH_URL, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        to:    expoPushToken,
        title: message.title,
        body:  message.body,
        data:  message.data ?? {},
        sound: 'default',
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[ExpoPush] Erreur ${resp.status}: ${text}`);
    }
  }
}
