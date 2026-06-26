import { PaymentProvider, EscrowParams, EscrowResult, PayoutParams } from './index';

const BASE_URL           = process.env.MYPVIT_BASE_URL           ?? 'https://api.mypvit.pro/v2';
const URL_CODE           = process.env.MYPVIT_URL_CODE           ?? '';
const ACCOUNT_CODE       = process.env.MYPVIT_OPERATION_ACCOUNT_CODE ?? '';
const API_PASSWORD       = process.env.MYPVIT_API_PASSWORD       ?? '';
const CALLBACK_URL_CODE  = process.env.MYPVIT_CALLBACK_URL_CODE  ?? '';

const OPERATOR_MAP: Record<string, string> = {
  airtel: 'AIRTEL_MONEY',
  moov:   'MOOV_MONEY',
};

/** Gestion du token X-Secret (TTL 3600s — renouvellement lazy avec buffer 2 min) */
class TokenManager {
  private secret:    string | null = null;
  private expiresAt: number        = 0;

  async getSecret(): Promise<string> {
    if (this.secret && Date.now() < this.expiresAt) return this.secret;
    return this.renew();
  }

  private async renew(): Promise<string> {
    const body = new URLSearchParams();
    body.append('operationAccountCode', ACCOUNT_CODE);
    body.append('password', API_PASSWORD);

    const resp = await fetch(`${BASE_URL}/${URL_CODE}/renew-secret`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`MyPVIT auth failed ${resp.status}: ${text}`);
    }

    const data: any = await resp.json();
    this.secret    = data.secret as string;
    // Buffer de 2 min pour éviter d'utiliser un token expiré
    this.expiresAt = Date.now() + ((data.expires_in as number) - 120) * 1000;
    return this.secret;
  }
}

export class MyPVITPaymentProvider implements PaymentProvider {
  private readonly tokens = new TokenManager();

  async initEscrow(params: EscrowParams): Promise<EscrowResult> {
    const secret   = await this.tokens.getSecret();
    const operator = OPERATOR_MAP[params.metadata?.['operator'] ?? 'orange'] ?? 'ORANGE_MONEY';

    const resp = await fetch(`${BASE_URL}/${URL_CODE}/rest`, {
      method:  'POST',
      headers: {
        'X-Secret':     secret,
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent:                          'AGENT-1',
        amount:                         params.amountFcfa,
        callback_url_code:              CALLBACK_URL_CODE,
        customer_account_number:        params.phoneNumber,
        merchant_operation_account_code: ACCOUNT_CODE,
        transaction_type:               'PAYMENT',
        owner_charge:                   'CUSTOMER',
        owner_charge_operator:          'CUSTOMER',
        free_info:                      'Consultation médicale MBOLO',
        product:                        'Téléconsultation',
        operator_code:                  operator,
        reference:                      params.idempotencyKey,
        service:                        'RESTFUL',
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`MyPVIT initEscrow failed ${resp.status}: ${text}`);
    }

    const data: any = await resp.json();
    return {
      providerTransactionId: data.reference_id ?? params.idempotencyKey,
      status: 'pending',
    };
  }

  async captureEscrow(_id: string): Promise<void> {
    // MyPVIT débite immédiatement à l'initiation — pas de capture séparée
  }

  async releaseEscrow(_id: string): Promise<void> {
    // Remboursement via le dashboard MyPVIT — pas d'API dédiée documentée
    console.warn('[MyPVIT] releaseEscrow: remboursement à traiter manuellement via le dashboard');
  }

  async payout(_params: PayoutParams): Promise<void> {
    // API Payout MyPVIT — à implémenter quand la doc est disponible
    console.warn('[MyPVIT] payout: versement à traiter manuellement (API payout non encore documentée)');
  }
}
