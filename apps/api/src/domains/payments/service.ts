import { HTTP } from '../../lib/errors';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PaymentProvider } from '../../infrastructure/providers/payment';
import { InitEscrowInput } from './schema';
import { randomUUID } from 'crypto';

export class PaymentService {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly orderRepo: OrderRepository,
    private readonly provider: PaymentProvider,
  ) {}

  async initEscrow(patientId: string, input: InitEscrowInput) {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.patientId !== patientId) throw HTTP.forbidden();

    const existing = await this.repo.findByOrderId(input.orderId);
    if (existing) throw HTTP.conflict('Un escrow existe déjà pour cette commande');

    const idempotencyKey = randomUUID();
    const result = await this.provider.initEscrow({
      amountFcfa: order.totalFcfa + order.serviceFeeFcfa,
      phoneNumber: input.phoneNumber,
      idempotencyKey,
    });

    return this.repo.createEscrow({
      orderId: input.orderId,
      amountFcfa: order.totalFcfa + order.serviceFeeFcfa,
      idempotencyKey,
      providerTransactionId: result.providerTransactionId,
    });
  }

  async releaseEscrow(orderId: string) {
    const txn = await this.repo.findByOrderId(orderId);
    if (!txn || !txn.providerTransactionId) throw HTTP.notFound('Transaction introuvable');
    await this.provider.releaseEscrow(txn.providerTransactionId);
    return this.repo.release(txn.id, txn.providerTransactionId);
  }
}
