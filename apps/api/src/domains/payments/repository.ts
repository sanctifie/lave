import { prisma } from '../../infrastructure/prisma/client';
import { TransactionKind, TransactionStatus } from '@mbolo/shared';

export class PaymentRepository {
  async createEscrow(data: {
    orderId: string;
    amountFcfa: number;
    idempotencyKey: string;
    providerTransactionId?: string;
  }) {
    return prisma.transaction.create({
      data: {
        orderId: data.orderId,
        amountFcfa: data.amountFcfa,
        idempotencyKey: data.idempotencyKey,
        providerTransactionId: data.providerTransactionId,
        kind: TransactionKind.ESCROW,
        status: TransactionStatus.PENDING,
      },
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.transaction.findUnique({ where: { orderId } });
  }

  async release(id: string, providerTransactionId: string) {
    return prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.RELEASED, providerTransactionId, releasedAt: new Date() },
    });
  }

  async capture(id: string) {
    return prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.CAPTURED, paidAt: new Date() },
    });
  }
}
