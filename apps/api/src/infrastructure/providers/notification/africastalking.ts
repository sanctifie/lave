import { NotificationProvider, NotificationParams } from './index';

/**
 * Provider SMS réel via Africa's Talking.
 * Doc : https://developers.africastalking.com/docs/sms/sending/bulk
 *
 * Variables d'environnement requises :
 *   AT_USERNAME   — nom d'utilisateur ('sandbox' pour l'environnement de test)
 *   AT_API_KEY    — clé API
 *   AT_SENDER_ID  — identifiant expéditeur (optionnel, ex: "MBOLO")
 */
export class AfricasTalkingProvider implements NotificationProvider {
  private readonly username: string;
  private readonly apiKey: string;
  private readonly senderId?: string;
  private readonly baseUrl: string;

  constructor() {
    this.username = process.env.AT_USERNAME ?? '';
    this.apiKey   = process.env.AT_API_KEY ?? '';
    this.senderId = process.env.AT_SENDER_ID || undefined;
    // L'environnement sandbox a un hôte distinct.
    this.baseUrl = this.username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';
  }

  async send(params: NotificationParams): Promise<void> {
    const body = new URLSearchParams();
    body.append('username', this.username);
    body.append('to', params.to);
    body.append('message', params.message);
    if (this.senderId) body.append('from', this.senderId);

    const resp = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        apiKey:         this.apiKey,
        Accept:         'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Africa's Talking SMS failed ${resp.status}: ${text}`);
    }

    // AT renvoie 201 avec un récapitulatif des destinataires ; un statut
    // d'échec individuel est signalé dans le corps mais l'appel reste 2xx.
    const data: any = await resp.json().catch(() => null);
    const recipients = data?.SMSMessageData?.Recipients ?? [];
    const failed = recipients.find((r: any) => r.statusCode && r.statusCode >= 400);
    if (failed) {
      throw new Error(`Africa's Talking SMS rejeté pour ${failed.number}: ${failed.status}`);
    }
  }
}
