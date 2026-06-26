import { HTTP } from '../../lib/errors';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PricingRepository } from '../pricing/repository';
import { PaymentProvider } from '../../infrastructure/providers/payment';
import { PushService } from '../../infrastructure/push/service';
import { InitEscrowInput, InitConsultationPaymentInput, MyPVITWebhookInput } from './schema';
import { PricingKind, ConsultationStatus } from '@mbolo/shared';
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
}
