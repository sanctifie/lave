import { HTTP } from '../../lib/errors';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PricingRepository } from '../pricing/repository';
import { PaymentProvider } from '../../infrastructure/providers/payment';
import { PushService } from '../../infrastructure/push/service';
import {
  InitEscrowInput, InitConsultationPaymentInput,
  InitRidePaymentInput, InitMealPaymentInput,
  MyPVITWebhookInput,
} from './schema';
import { PricingKind, ConsultationStatus } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { randomUUID } from 'crypto';

export class PaymentService {
  constructor(
    private readonly repo:        PaymentRepository,
    private readonly orderRepo:   OrderRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly provider:    PaymentProvider,
    private readonly push:        PushService,
  ) {}

  // ─── Commandes ────────────────────────────────────────────────────────────

  async initEscrow(patientId: string, input: InitEscrowInput) {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if ((order as any).patientId !== patientId) throw HTTP.forbidden();

    const existing = await this.repo.findByOrderId(input.orderId);
    if (existing) throw HTTP.conflict('Un escrow existe déjà pour cette commande');

    const idempotencyKey = randomUUID();
    const amount         = (order as any).totalFcfa + (order as any).serviceFeeFcfa;
    const result         = await this.provider.initEscrow({ amountFcfa: amount, phoneNumber: input.phoneNumber, idempotencyKey });

    return this.repo.createEscrow({
      orderId:               input.orderId,
      amountFcfa:            amount,
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

  // ─── Téléconsultation ─────────────────────────────────────────────────────

  async initConsultationPayment(patientId: string, input: InitConsultationPaymentInput) {
    const consult = await this.repo.findConsultationForPayment(input.consultationId);
    if (!consult) throw HTTP.notFound('Consultation introuvable');
    if (consult.appointment.patientId !== patientId) throw HTTP.forbidden();
    if (consult.status !== ConsultationStatus.COMPLETED) {
      throw HTTP.unprocessable('La consultation n\'est pas encore terminée');
    }

    const existing = await this.repo.findByConsultationId(input.consultationId);
    if (existing) throw HTTP.conflict('Un paiement existe déjà pour cette consultation');

    const amountFcfa     = Number(consult.serviceFeeFcfa ?? 0);
    const idempotencyKey = randomUUID();

    const result = await this.provider.initEscrow({
      amountFcfa,
      phoneNumber:    input.phoneNumber,
      idempotencyKey,
      metadata: { operator: input.operator, consultationId: input.consultationId },
    });

    return this.repo.createConsultationTransaction({
      consultationId:        input.consultationId,
      amountFcfa,
      idempotencyKey,
      providerTransactionId: result.providerTransactionId,
    });
  }

  async getConsultationPaymentStatus(patientId: string, consultationId: string) {
    const consult = await this.repo.findConsultationForPayment(consultationId);
    if (!consult) throw HTTP.notFound('Consultation introuvable');
    if (consult.appointment.patientId !== patientId) throw HTTP.forbidden();

    const txn = await this.repo.findByConsultationId(consultationId);
    return {
      consultationId,
      amountFcfa:  consult.serviceFeeFcfa,
      transaction: txn
        ? { id: txn.id, status: txn.status, paidAt: txn.paidAt }
        : null,
    };
  }

  /**
   * Webhook MyPVIT — identifie la transaction par merchantReferenceId,
   * capture si SUCCESS, échoue si FAILED.
   * Retourne l'accusé de réception obligatoire : { transactionId, responseCode }
   */
  async handleWebhook(body: MyPVITWebhookInput) {
    const reference = body.merchantReferenceId;

    if (reference) {
      const txn = await this.repo.findByIdempotencyKey(reference);
      if (txn) {
        const isSuccess = body.status === 'SUCCESS';
        if (isSuccess) {
          await this.repo.capture(txn.id);
          if (txn.consultationId) {
            await this.payoutDoctor(txn.consultationId, txn.amountFcfa).catch((e) =>
              console.error('[PaymentService] payoutDoctor failed', e),
            );
          }
        } else {
          await this.repo.fail(txn.id, body.status);
        }
      }
    }

    // Accusé de réception obligatoire MyPVIT — renvoyer transactionId + code tels quels
    return {
      transactionId: body.transactionId,
      responseCode:  body.code,
    };
  }

  // ─── Course (transport) ───────────────────────────────────────────────────

  async initRidePayment(patientId: string, input: InitRidePaymentInput) {
    const ride = await this.repo.findRideForPayment(input.rideId);
    if (!ride) throw HTTP.notFound('Course introuvable');
    if (ride.request.patientId !== patientId) throw HTTP.forbidden();

    const existing = await this.repo.findByRideId(input.rideId);
    if (existing) throw HTTP.conflict('Un paiement existe déjà pour cette course');

    const amountFcfa     = ride.fareEstFcfa;
    const idempotencyKey = randomUUID();
    const result = await this.provider.initEscrow({
      amountFcfa,
      phoneNumber:    input.phoneNumber,
      idempotencyKey,
      metadata: { operator: input.operator, rideId: input.rideId },
    });

    return this.repo.createRideTransaction({
      rideId:                input.rideId,
      amountFcfa,
      idempotencyKey,
      providerTransactionId: result.providerTransactionId,
    });
  }

  async getRidePaymentStatus(patientId: string, rideId: string) {
    const ride = await this.repo.findRideForPayment(rideId);
    if (!ride) throw HTTP.notFound('Course introuvable');
    if (ride.request.patientId !== patientId) throw HTTP.forbidden();
    const txn = await this.repo.findByRideId(rideId);
    return {
      rideId,
      amountFcfa: ride.fareEstFcfa,
      transaction: txn ? { id: txn.id, status: txn.status, paidAt: txn.paidAt } : null,
    };
  }

  async getMealPaymentStatus(patientId: string, mealOrderId: string) {
    const order = await this.repo.findMealOrderForPayment(mealOrderId);
    if (!order) throw HTTP.notFound('Commande repas introuvable');
    if ((order as any).patientId !== patientId) throw HTTP.forbidden();
    const txn = await this.repo.findByMealOrderId(mealOrderId);
    return {
      mealOrderId,
      amountFcfa: (order as any).totalFcfa as number,
      transaction: txn ? { id: txn.id, status: txn.status, paidAt: txn.paidAt } : null,
    };
  }

  async releaseRideEscrow(rideId: string) {
    const txn = await this.repo.findByRideId(rideId);
    if (!txn?.providerTransactionId) return;
    await this.provider.releaseEscrow(txn.providerTransactionId);
    await this.repo.release(txn.id, txn.providerTransactionId);
    await this.payoutCourier(rideId, txn.amountFcfa).catch((e) =>
      console.error('[PaymentService] payoutCourier failed', e),
    );
  }

  // ─── Repas (meal orders) ──────────────────────────────────────────────────

  async initMealPayment(patientId: string, input: InitMealPaymentInput) {
    const order = await this.repo.findMealOrderForPayment(input.mealOrderId);
    if (!order) throw HTTP.notFound('Commande repas introuvable');
    if ((order as any).patientId !== patientId) throw HTTP.forbidden();

    const existing = await this.repo.findByMealOrderId(input.mealOrderId);
    if (existing) throw HTTP.conflict('Un paiement existe déjà pour cette commande');

    const amountFcfa     = (order as any).totalFcfa as number;
    const idempotencyKey = randomUUID();
    const result = await this.provider.initEscrow({
      amountFcfa,
      phoneNumber:    input.phoneNumber,
      idempotencyKey,
      metadata: { operator: input.operator, mealOrderId: input.mealOrderId },
    });

    return this.repo.createMealTransaction({
      mealOrderId:           input.mealOrderId,
      amountFcfa,
      idempotencyKey,
      providerTransactionId: result.providerTransactionId,
    });
  }

  async releaseMealOrderEscrow(mealOrderId: string) {
    const txn = await this.repo.findByMealOrderId(mealOrderId);
    if (!txn?.providerTransactionId) return;
    await this.provider.releaseEscrow(txn.providerTransactionId);
    await this.repo.release(txn.id, txn.providerTransactionId);
    await this.payoutKitchen(mealOrderId, txn.amountFcfa).catch((e) =>
      console.error('[PaymentService] payoutKitchen failed', e),
    );
  }

  // ─── Interne : versement médecin ─────────────────────────────────────────

  private async payoutDoctor(consultationId: string, totalFcfa: number) {
    const consult = await this.repo.findConsultationForPayment(consultationId);
    if (!consult) return;

    const commissionEntry = await this.pricingRepo.getByKind(PricingKind.PLATFORM_COMMISSION_PCT);
    const commissionPct   = Number(commissionEntry?.valueNum ?? 15);
    const doctorPayout    = Math.floor(totalFcfa * (1 - commissionPct / 100));
    const doctorPhone     = consult.doctor?.user?.phone;

    if (!doctorPhone || doctorPayout <= 0) return;

    const idempotencyKey = `payout_${consultationId}`;
    await this.provider.payout({ amountFcfa: doctorPayout, phoneNumber: doctorPhone, idempotencyKey });
    await this.repo.createPayout({
      recipientId:    consult.doctorId,
      amountFcfa:     doctorPayout,
      idempotencyKey,
    });

    // Push au médecin
    this.push.sendToUser(consult.doctor?.userId as string, {
      title: '💰 Paiement reçu',
      body:  `${doctorPayout.toLocaleString('fr-FR')} FCFA crédités sur votre compte.`,
      data:  { type: 'payout', consultationId },
    });
  }

  private async payoutCourier(rideId: string, totalFcfa: number) {
    const ride = await this.repo.findRideForPayment(rideId);
    if (!ride?.delivery?.courier) return;

    const commissionEntry = await this.pricingRepo.getByKind(PricingKind.PLATFORM_COMMISSION_PCT);
    const commissionPct   = Number(commissionEntry?.valueNum ?? 15);
    const courierPayout   = Math.floor(totalFcfa * (1 - commissionPct / 100));
    const courierPhone    = ride.delivery.courier.user?.phone;
    const courierUserId   = ride.delivery.courier.user?.id;

    if (!courierPhone || courierPayout <= 0) return;

    const idempotencyKey = `payout_ride_${rideId}`;
    await this.provider.payout({ amountFcfa: courierPayout, phoneNumber: courierPhone, idempotencyKey });
    await this.repo.createPayout({
      recipientId:    ride.delivery.courier.id,
      amountFcfa:     courierPayout,
      idempotencyKey,
    });

    if (courierUserId) {
      this.push.sendToUser(courierUserId, {
        title: '💰 Paiement reçu',
        body:  `${courierPayout.toLocaleString('fr-FR')} FCFA crédités pour la course.`,
        data:  { type: 'payout', rideId },
      });
    }
  }

  private async payoutKitchen(mealOrderId: string, totalFcfa: number) {
    const order = await this.repo.findMealOrderForPayment(mealOrderId);
    if (!order) return;

    const partner = await prisma.partnerProfile.findUnique({
      where:  { id: (order as any).mealPlan.partnerId },
      select: { id: true, phone: true, whatsappNumber: true },
    });
    if (!partner?.phone) return;

    const commissionEntry = await this.pricingRepo.getByKind(PricingKind.PLATFORM_COMMISSION_PCT);
    const commissionPct   = Number(commissionEntry?.valueNum ?? 15);
    const kitchenPayout   = Math.floor(totalFcfa * (1 - commissionPct / 100));
    if (kitchenPayout <= 0) return;

    const idempotencyKey = `payout_meal_${mealOrderId}`;
    await this.provider.payout({
      amountFcfa:     kitchenPayout,
      phoneNumber:    partner.whatsappNumber ?? partner.phone,
      idempotencyKey,
    });
    await this.repo.createPayout({
      recipientId:    partner.id,
      amountFcfa:     kitchenPayout,
      idempotencyKey,
    });
  }
}
