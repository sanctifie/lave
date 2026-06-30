import { NotificationProvider, NotificationParams } from './index';

/**
 * Provider WhatsApp réel via l'API WhatsApp Cloud de Meta.
 * Doc : https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Variables d'environnement requises :
 *   WHATSAPP_PHONE_NUMBER_ID — identifiant du numéro expéditeur (dashboard Meta)
 *   WHATSAPP_ACCESS_TOKEN    — token d'accès (System User token recommandé en prod)
 *   WHATSAPP_API_VERSION     — version de l'API Graph (défaut : v21.0)
 *
 * Note production : Meta exige des **modèles (templates) pré-approuvés** pour les
 * messages initiés par l'entreprise hors fenêtre de 24h. Ce provider envoie un
 * message texte simple (valable en session/test) ; pour les notifications
 * transactionnelles à grande échelle, basculer sur l'envoi de templates.
 */
export class WhatsAppProvider implements NotificationProvider {
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
    this.accessToken   = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
    this.apiVersion    = process.env.WHATSAPP_API_VERSION ?? 'v21.0';
  }

  async send(params: NotificationParams): Promise<void> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                this.normalizeNumber(params.to),
        type:              'text',
        text:              { body: params.message, preview_url: false },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`WhatsApp Cloud API failed ${resp.status}: ${text}`);
    }
  }

  /** WhatsApp attend un numéro international sans '+', uniquement des chiffres. */
  private normalizeNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }
}
