export interface EscrowParams {
  amountFcfa: number;
  phoneNumber: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface EscrowResult {
  providerTransactionId: string;
  status: 'pending' | 'held';
}

export interface PayoutParams {
  amountFcfa: number;
  phoneNumber: string;
  idempotencyKey: string;
}

export interface PaymentProvider {
  initEscrow(params: EscrowParams): Promise<EscrowResult>;
  captureEscrow(providerTransactionId: string): Promise<void>;
  releaseEscrow(providerTransactionId: string): Promise<void>;
  payout(params: PayoutParams): Promise<void>;
}
