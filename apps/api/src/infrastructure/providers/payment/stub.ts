import { PaymentProvider, EscrowParams, EscrowResult, PayoutParams } from './index';

export class StubPaymentProvider implements PaymentProvider {
  async initEscrow(params: EscrowParams): Promise<EscrowResult> {
    console.warn(`[PAYMENT STUB] Escrow ${params.amountFcfa} FCFA ← ${params.phoneNumber}`);
    return {
      providerTransactionId: `stub_${params.idempotencyKey}`,
      status: 'held',
    };
  }

  async captureEscrow(id: string): Promise<void> {
    console.warn(`[PAYMENT STUB] Capture ${id}`);
  }

  async releaseEscrow(id: string): Promise<void> {
    console.warn(`[PAYMENT STUB] Release ${id}`);
  }

  async payout(params: PayoutParams): Promise<void> {
    console.warn(`[PAYMENT STUB] Payout ${params.amountFcfa} FCFA → ${params.phoneNumber}`);
  }
}
