import { HTTP } from '../../lib/errors';
import { DeliveryRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PaymentRepository } from '../payments/repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PaymentProvider } from '../../infrastructure/providers/payment';
import { DeliveryStatus, OrderStatus, TransactionStatus, PricingKind } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { randomUUID } from 'crypto';
import type { PaymentService } from '../payments/service';
import type { PushService } from '../../infrastructure/push/service';

export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly notif: NotificationService,
    private readonly paymentProvider: PaymentProvider,
    private readonly pricingRepo: PricingRepository,
    private readonly paymentService?: PaymentService,
    private readonly push?: PushService,
  ) {}

  // Le code de remise est le secret du PATIENT : il le montre au coursier à la
  // réception. On le retire donc de toute réponse destinée au coursier — sinon
  // celui-ci pourrait confirmer la livraison sans jamais rencontrer le patient.
  private stripHandoverCode<T extends { handoverCode?: unknown }>(d: T): Omit<T, 'handoverCode'> {
    const { handoverCode: _hidden, ...rest } = d;
    return rest;
  }

  async listAll(courierUserId: string) {
    const [mine, pending] = await Promise.all([
      this.repo.listForCourierByUserId(courierUserId),
      this.repo.listPending(),
    ]);
    const mineIds = new Set((mine as any[]).map((d) => d.id));
    const extra   = (pending as any[]).filter((d) => !mineIds.has(d.id));
    return [...mine, ...extra].map((d) => this.stripHandoverCode(d));
  }

  async acceptDelivery(deliveryId: string, courierUserId: string) {
    const delivery = await this.repo.findById(deliveryId);
    if (!delivery) throw HTTP.notFound('Livraison introuvable');
    if (delivery.status !== DeliveryStatus.PENDING_ASSIGNMENT) {
      throw HTTP.conflict('Livraison déjà prise en charge');
    }
    const updated = await this.repo.assignByUserId(deliveryId, courierUserId);
    if (delivery.orderId) {
      const order = await this.orderRepo.findById(delivery.orderId);
      if (order) {
        await this.notif.send({
          to:      (order as any).patient.phone,
          message: `Un livreur a accepté votre commande #${delivery.orderId.slice(-6).toUpperCase()} et viendra récupérer votre colis à la pharmacie.`,
        });
      }
    }
    return this.stripHandoverCode(updated as any);
  }

  async updateDeliveryStatus(deliveryId: string, courierUserId: string, status: DeliveryStatus) {
    const updated = await this.repo.updateStatusByCourier(deliveryId, courierUserId, status);
    if (!updated) throw HTTP.forbidden('Non autorisé ou livraison introuvable');
    return this.stripHandoverCode(updated as any);
  }

  async setCourierAvailability(userId: string, isAvailable: boolean) {
    return this.repo.setCourierAvailability(userId, isAvailable);
  }

  async getCourierAvailability(userId: string) {
    return { isAvailable: await this.repo.getCourierAvailability(userId) };
  }

  async getById(id: string, requester: { userId: string; role: string }) {
    const d = await this.repo.findById(id);
    if (!d) throw HTTP.notFound('Livraison introuvable');
    // Contrôle d'accès : patient destinataire, ou coursier (assigné, ou libre si
    // la course est encore à prendre). Personne d'autre ne voit ces données
    // (nom/téléphone du patient, adresses).
    const patientId = (d as any).order?.patient?.id ?? null;
    const isPatient = requester.userId === patientId;
    const isCourier = requester.role === 'courier';
    if (!isPatient && !isCourier) throw HTTP.forbidden();
    // Le code de remise reste chez le patient : caviardé pour le coursier.
    return isPatient ? d : this.stripHandoverCode(d as any);
  }

  async listMine(courierId: string) {
    const rows = await this.repo.listForCourier(courierId);
    return (rows as any[]).map((d) => this.stripHandoverCode(d));
  }

  async listPending() {
    const rows = await this.repo.listPending();
    return (rows as any[]).map((d) => this.stripHandoverCode(d));
  }

  async assign(deliveryId: string, courierId: string) {
    const delivery = await this.repo.findById(deliveryId);
    if (!delivery) throw HTTP.notFound('Livraison introuvable');
    if (delivery.status !== DeliveryStatus.PENDING_ASSIGNMENT) {
      throw HTTP.conflict('Livraison déjà assignée');
    }

    const updated = await this.repo.assign(deliveryId, courierId);

    // Notifie le patient de l'assignation
    if (delivery.orderId) {
      const order = await this.orderRepo.findById(delivery.orderId);
      if (order) {
        await this.notif.send({
          to: order.patient.phone,
          message: `Un livreur a été assigné à votre commande #${delivery.orderId.slice(-6).toUpperCase()}. Il viendra récupérer votre colis à la pharmacie.`,
        });
      }
    }

    return updated;
  }

  async updatePosition(deliveryId: string, courierId: string, status: DeliveryStatus, lat: number, lng: number) {
    const delivery = await this.repo.findById(deliveryId);
    if (!delivery) throw HTTP.notFound('Livraison introuvable');
    if (delivery.courierId !== courierId) throw HTTP.forbidden();

    // Màj position du courier dans sa table
    await prisma.courier.update({
      where: { userId: courierId },
      data: { lat, lng },
    });

    return this.repo.updateStatus(deliveryId, status, lat, lng);
  }

  async confirmHandover(deliveryId: string, code: string, requesterId: string) {
    // La confirmation libère l'escrow (mouvement d'argent) : seuls le coursier
    // ASSIGNÉ (flux principal : il saisit le code que le patient lui montre)
    // ou le patient destinataire peuvent la déclencher.
    const existing = await this.repo.findById(deliveryId);
    if (!existing) throw HTTP.notFound('Livraison introuvable');
    const ownerId =
      (existing as any).order?.patient?.id ?? (existing as any).order?.patientId ?? null;
    const courierUserId = (existing as any).courierId
      ? (
          await prisma.courier.findUnique({
            where: { id: (existing as any).courierId },
            select: { userId: true },
          })
        )?.userId ?? null
      : null;
    if (requesterId !== ownerId && requesterId !== courierUserId) throw HTTP.forbidden();

    // Stupéfiant : la remise est verrouillée tant que le pharmacien n'a pas
    // vérifié l'original en main et apposé sa mention (paperStatus = verified).
    const paperStatus = (existing as any).order?.paperStatus ?? 'none';
    if (paperStatus === 'to_collect' || paperStatus === 'collected') {
      throw HTTP.unprocessable(
        "Ordonnance originale non encore vérifiée par le pharmacien — livraison impossible.",
      );
    }

    const delivery = await this.repo.confirmHandover(deliveryId, code);
    if (!delivery) throw HTTP.unprocessable('Code de remise invalide');

    // Mise à jour statut commande
    if (delivery.orderId) {
      await this.orderRepo.updateStatus(delivery.orderId, OrderStatus.DELIVERED);

      // Cachet numérique : l'ordonnance liée est marquée « servie le … par … »
      // (équivalent du cachet daté de l'officine sur l'ordonnance papier).
      try {
        const o = await this.orderRepo.findById(delivery.orderId);
        if (o?.prescriptionId) {
          await prisma.prescription.update({
            where: { id: o.prescriptionId },
            data: { dispensedAt: new Date(), dispensedByName: (o as any).partner?.legalName ?? null },
          });
        }
      } catch { /* le cachet ne doit pas bloquer la livraison */ }

      // ── Paiement à la livraison (COD) : le coursier a encaissé les espèces.
      // On trace la transaction et on verse la part médicaments à la pharmacie.
      const codOrder = await this.orderRepo.findById(delivery.orderId);
      if (codOrder && (codOrder as any).paymentMethod === 'cod' && !(codOrder as any).transaction) {
        const caisseShareFcfa = (codOrder as any).caisseShareFcfa ?? 0;
        const patientDue = Math.max(0, codOrder.totalFcfa - caisseShareFcfa) + codOrder.serviceFeeFcfa;
        const pharmacyAmount = Math.max(0, codOrder.totalFcfa - caisseShareFcfa);
        await prisma.transaction.create({
          data: {
            kind: 'cod', status: 'captured', amountFcfa: patientDue,
            idempotencyKey: randomUUID(), orderId: delivery.orderId, paidAt: new Date(),
          },
        });
        await this.paymentProvider.payout({
          amountFcfa: pharmacyAmount, phoneNumber: codOrder.partner.phone, idempotencyKey: randomUUID(),
        }).catch((e) => console.error('[COD payout] échec', e));
        await this.notif.send({
          to: codOrder.partner.whatsappNumber ?? codOrder.partner.phone,
          message: `Espèces encaissées (${patientDue} FCFA) — versement de ${pharmacyAmount} FCFA pour la commande #${delivery.orderId.slice(-6).toUpperCase()}.`,
        }).catch(() => {});
      }

      // ── Libération de l'escrow (idempotent : skip si déjà libéré) ──────
      const txn = await this.paymentRepo.findByOrderId(delivery.orderId);
      if (txn?.providerTransactionId && txn.status !== TransactionStatus.RELEASED) {
        await this.paymentProvider.releaseEscrow(txn.providerTransactionId);
        await this.paymentRepo.release(txn.id, txn.providerTransactionId);

        // Payout vers la pharmacie — AUCUNE marge sur le médicament : elle
        // reçoit l'intégralité de la part médicaments encaissée (part patient).
        // La part caisse (tiers-payant) est recouvrée par la pharmacie via son
        // bordereau ; la plateforme se rémunère uniquement sur les frais de
        // service et de livraison, jamais sur le prix du médicament.
        const order = await this.orderRepo.findById(delivery.orderId);
        if (order) {
          const caisseShareFcfa = (order as any).caisseShareFcfa ?? 0;
          const pharmacyAmount  = Math.max(0, order.totalFcfa - caisseShareFcfa);
          await this.paymentProvider.payout({
            amountFcfa: pharmacyAmount,
            phoneNumber: order.partner.phone,
            idempotencyKey: randomUUID(),
          });

          // Notifie le patient et la pharmacie
          await Promise.all([
            this.notif.send({
              to: order.patient.phone,
              message: `Livraison confirmée ✓ Merci d'avoir utilisé MBOLO Santé !`,
            }),
            this.notif.send({
              to: order.partner.whatsappNumber ?? order.partner.phone,
              message: `Paiement de ${pharmacyAmount} FCFA en cours de virement pour la commande #${delivery.orderId.slice(-6).toUpperCase()}.`,
            }),
          ]);
        }
      }
    }

    // ── Repas : libération escrow + notification patient ──────────────────
    if (delivery.mealOrderId) {
      if (this.paymentService) {
        this.paymentService.releaseMealOrderEscrow(delivery.mealOrderId).catch((e) =>
          console.error('[DeliveryService] meal escrow release failed', e),
        );
      }
      if (this.push) {
        const mealOrder = await prisma.mealOrder.findUnique({
          where:  { id: delivery.mealOrderId },
          select: { patientId: true, mealPlan: { select: { name: true } } },
        });
        if (mealOrder) {
          this.push.sendToUser(mealOrder.patientId, {
            title: '🥗 Repas livré',
            body:  `${mealOrder.mealPlan.name} a été livré. Bon appétit !`,
            data:  { type: 'meal_delivered', mealOrderId: delivery.mealOrderId },
          });
        }
      }
    }

    return delivery;
  }
}
