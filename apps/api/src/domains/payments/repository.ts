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

  async createConsultationTransaction(data: {
    consultationId: string;
    amountFcfa: number;
    idempotencyKey: string;
    providerTransactionId?: string;
  }) {
    return prisma.transaction.create({
      data: {
        consultationId:        data.consultationId,
        amountFcfa:            data.amountFcfa,
        idempotencyKey:        data.idempotencyKey,
        providerTransactionId: data.providerTransactionId,
        kind:                  TransactionKind.ESCROW,
        status:                TransactionStatus.PENDING,
      },
    });
  }

  /** Données nécessaires pour initier + valider un paiement de consultation */
  async findConsultationForPayment(consultationId: string) {
    return (prisma as any).consultation.findUnique({
      where: { id: consultationId },
      include: {
        appointment: { select: { patientId: true } },
        doctor: {
          include: { user: { select: { phone: true, name: true } } },
        },
      },
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.transaction.findUnique({ where: { orderId } });
  }

  async findByConsultationId(consultationId: string) {
    return prisma.transaction.findUnique({ where: { consultationId } });
  }

  async findByIdempotencyKey(key: string) {
    return prisma.transaction.findUnique({ where: { idempotencyKey: key } });
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

  async fail(id: string, reason: string) {
    return prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.FAILED, failureReason: reason },
    });
  }

  async createPayout(data: {
    recipientId: string;
    amountFcfa: number;
    idempotencyKey: string;
    providerTransactionId?: string;
  }) {
    return (prisma as any).payout.create({
      data: {
        recipientId:           data.recipientId,
        amountFcfa:            data.amountFcfa,
        idempotencyKey:        data.idempotencyKey,
        providerTransactionId: data.providerTransactionId,
        status:                TransactionStatus.PENDING,
        paidAt:                new Date(),
      },
    });
  }
}
