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

  async createRideTransaction(data: {
    rideId: string;
    amountFcfa: number;
    idempotencyKey: string;
    providerTransactionId?: string;
  }) {
    return prisma.transaction.create({
      data: {
        rideId:                data.rideId,
        amountFcfa:            data.amountFcfa,
        idempotencyKey:        data.idempotencyKey,
        providerTransactionId: data.providerTransactionId,
        kind:                  TransactionKind.ESCROW,
        status:                TransactionStatus.PENDING,
      },
    });
  }

  async createMealTransaction(data: {
    mealOrderId: string;
    amountFcfa: number;
    idempotencyKey: string;
    providerTransactionId?: string;
  }) {
    return prisma.transaction.create({
      data: {
        mealOrderId:           data.mealOrderId,
        amountFcfa:            data.amountFcfa,
        idempotencyKey:        data.idempotencyKey,
        providerTransactionId: data.providerTransactionId,
        kind:                  TransactionKind.ESCROW,
        status:                TransactionStatus.PENDING,
      },
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.transaction.findUnique({ where: { orderId } });
  }

  async findByRideId(rideId: string) {
    return prisma.transaction.findUnique({ where: { rideId } });
  }

  async findByMealOrderId(mealOrderId: string) {
    return prisma.transaction.findUnique({ where: { mealOrderId } });
  }

  async findByConsultationId(consultationId: string) {
    return prisma.transaction.findUnique({ where: { consultationId } });
  }

  async findRideForPayment(rideId: string) {
    return prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        request: { select: { patientId: true } },
        delivery: {
          include: {
            courier: { include: { user: { select: { id: true, phone: true } } } },
          },
        },
      },
    });
  }

  async findMealOrderForPayment(mealOrderId: string) {
    return prisma.mealOrder.findUnique({
      where: { id: mealOrderId },
      include: { mealPlan: { select: { partnerId: true, name: true } } },
    });
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

  async refund(id: string) {
    return prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.REFUNDED, refundedAt: new Date() },
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
