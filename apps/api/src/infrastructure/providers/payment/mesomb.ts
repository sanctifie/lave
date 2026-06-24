import { PaymentProvider, EscrowParams, EscrowResult, PayoutParams } from './index';

const MESOMB_BASE_URL = 'https://mesomb.hachther.com/api/v1.1';

const OPERATOR_MAP: Record<string, string> = {
  orange: 'ORANGE',
  airtel: 'AIRTEL_GABON',
};

export class MeSombPaymentProvider implements PaymentProvider {
  constructor(
    private readonly appKey:    string,
    private readonly accessKey: string,
    private readonly secretKey: string,
  ) {}

  async initEscrow(params: EscrowParams): Promise<EscrowResult> {
    const operator = OPERATOR_MAP[params.metadata?.['operator'] ?? 'orange'] ?? 'ORANGE';
    const nonce    = params.idempotencyKey;
    const date     = new Date().toISOString();

    const body = {
      amount:    params.amountFcfa,
      service:   operator,
      payer:     params.phoneNumber,
      nonce,
      country:   'GA',
      currency:  'XAF',
      reference: params.idempotencyKey,
    };

    const resp = await fetch(`${MESOMB_BASE_URL}/payment/collect/`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-MeSomb-Date':   date,
        'X-MeSomb-Nonce':  nonce,
        'Authorization':   this.buildAuth(date, nonce),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`MeSomb collect failed: ${resp.status} ${text}`);
    }

    const data: any = await resp.json();
    return {
      providerTransactionId: data.transaction?.pk ?? params.idempotencyKey,
      status:                data.success ? 'held' : 'pending',
    };
  }

  async captureEscrow(_providerTransactionId: string): Promise<void> {
    // MeSomb débite immédiatement — pas de capture séparée
  }

  async releaseEscrow(_providerTransactionId: string): Promise<void> {
    // MeSomb ne supporte pas l'annulation post-débit via API — gestion manuelle
  }

  async payout(params: PayoutParams): Promise<void> {
    const nonce = params.idempotencyKey;
    const date  = new Date().toISOString();

    const body = {
      amount:    params.amountFcfa,
      service:   'ORANGE',
      receiver:  params.phoneNumber,
      nonce,
      country:   'GA',
      currency:  'XAF',
      reference: params.idempotencyKey,
    };

    const resp = await fetch(`${MESOMB_BASE_URL}/payment/payout/`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'X-MeSomb-Date':  date,
        'X-MeSomb-Nonce': nonce,
        'Authorization':  this.buildAuth(date, nonce),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`MeSomb payout failed: ${resp.status} ${text}`);
    }
  }

  private buildAuth(date: string, nonce: string): string {
    // HMAC-SHA256 signature — voir docs MeSomb pour implémentation complète
    // https://mesomb.hachther.com/docs/api/
    return `Application ${this.appKey}; AccessKey=${this.accessKey}; Nonce=${nonce}; Date=${date}`;
  }
}
