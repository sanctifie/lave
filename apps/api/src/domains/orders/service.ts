import { HTTP } from '../../lib/errors';
import { OrderRepository } from './repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PushService } from '../../infrastructure/push/service';
import { PharmacyActionInput, SubstitutionDecisionInput } from './schema';
import { OrderStatus, PricingKind, SubstitutionStatus } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';

export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly notif: NotificationService,
    // Optionnels : requis seulement pour decideSubstitution (crée la livraison).
    private readonly deliveryRepo?: DeliveryRepository,
    private readonly pricingRepo?: PricingRepository,
    private readonly push?: PushService,
  ) {}

  /**
   * Le patient accepte/refuse les équivalents proposés par le pharmacien.
   * - Tout refusé → commande annulée.
   * - Au moins un article conservé → la commande repart (préparation + livraison).
   */
  async decideSubstitution(orderId: string, patientId: string, input: SubstitutionDecisionInput) {
    const order = await this.repo.findById(orderId);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.patientId !== patientId) throw HTTP.forbidden();
    if (order.status !== OrderStatus.PENDING_SUBSTITUTION) {
      throw HTTP.unprocessable('Aucun équivalent en attente sur cette commande');
    }

    // On ne décide que des articles réellement « en attente ».
    const pendingIds = new Set(
      order.items.filter((i) => i.substitutionStatus === SubstitutionStatus.PENDING).map((i) => i.id),
    );
    const decisions = input.decisions.filter((d) => pendingIds.has(d.itemId));
    if (decisions.length === 0) throw HTTP.unprocessable('Décisions invalides');

    const { order: updated, allRejected } = await this.repo.applySubstitutionDecision(orderId, decisions);

    if (allRejected) {
      await this.notif.send({
        to: order.patient.phone,
        message: `Commande #${orderId.slice(-6).toUpperCase()} annulée : équivalents refusés. Contactez votre pharmacien pour une autre solution.`,
      });
      return { order: updated, cancelled: true };
    }

    // Au moins un article conservé → on enclenche préparation + livraison.
    let deliveryFeeFcfa = 1000;
    if (this.pricingRepo) {
      const entry = await this.pricingRepo.getByKind(PricingKind.DELIVERY_BASE);
      deliveryFeeFcfa = entry?.valueFcfa ?? 1000;
    }
    const delivery = this.deliveryRepo ? await this.deliveryRepo.create(orderId, deliveryFeeFcfa) : null;

    await this.notif.send({
      to: order.patient.phone,
      message:
        `Équivalents acceptés ✓ — Commande #${orderId.slice(-6).toUpperCase()}\n` +
        `Nouveau total : ${updated.totalFcfa + order.serviceFeeFcfa} FCFA (livraison ${deliveryFeeFcfa} FCFA)\n` +
        `Procédez au paiement pour confirmer.`,
    });
    this.push?.sendToUser(patientId, {
      title: '✅ Équivalents validés',
      body: `Commande prête — ${(updated.totalFcfa + order.serviceFeeFcfa).toLocaleString('fr-FR')} FCFA à régler.`,
      data: { type: 'substitution_accepted', orderId },
    });

    if (this.push && delivery) {
      const couriers = await prisma.courier.findMany({
        where: { isAvailable: true },
        include: { user: { select: { id: true } } },
      });
      for (const c of couriers) {
        this.push.sendToUser(c.user.id, {
          title: '📦 Nouvelle livraison disponible',
          body: 'Une commande est prête à être récupérée en pharmacie.',
          data: { type: 'new_delivery', deliveryId: delivery.id },
        });
      }
    }

    return { order: updated, delivery, cancelled: false };
  }

  async getById(id: string, requesterId: string) {
    const order = await this.repo.findById(id);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.patientId !== requesterId) throw HTTP.forbidden();
    return order;
  }

  async listMine(patientId: string) {
    return this.repo.listForPatient(patientId);
  }

  async listForPartner(partnerId: string) {
    return this.repo.listForPartner(partnerId);
  }

  async partnerAction(orderId: string, partnerId: string, input: PharmacyActionInput) {
    const order = await this.repo.findById(orderId);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.partnerId !== partnerId) throw HTTP.forbidden();

    switch (input.action) {
      case 'prepare': {
        if (order.status !== OrderStatus.PHARMACY_ACCEPTED && order.status !== OrderStatus.PENDING_PHARMACY) {
          throw HTTP.unprocessable('Statut incompatible');
        }
        const updated = await this.repo.updateStatus(orderId, OrderStatus.PREPARING);
        await this.notif.send({
          to: order.patient.phone,
          message: `Votre commande #${orderId.slice(-6).toUpperCase()} est en cours de préparation.`,
        });
        return updated;
      }

      case 'ready': {
        if (order.status !== OrderStatus.PREPARING) throw HTTP.unprocessable('Statut incompatible');
        const updated = await this.repo.updateStatus(orderId, OrderStatus.READY_FOR_PICKUP);
        await this.notif.send({
          to: order.patient.phone,
          message: `Votre commande est prête ! Un livreur va être assigné.`,
        });
        return updated;
      }

      case 'reject': {
        const updated = await this.repo.updateStatus(orderId, OrderStatus.PHARMACY_REJECTED);
        await this.notif.send({
          to: order.patient.phone,
          message: `Votre commande a été refusée : ${input.reason}. Contactez la pharmacie.`,
        });
        return updated;
      }
    }
  }
}
