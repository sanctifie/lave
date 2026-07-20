import { HTTP } from '../../lib/errors';
import { OrderRepository } from './repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PushService } from '../../infrastructure/push/service';
import { PharmacyActionInput, SubstitutionDecisionInput, RecommendationDecisionInput } from './schema';
import {
  OrderStatus,
  PricingKind,
  SubstitutionStatus,
  RecommendationStatus,
  OrderItemKind,
  TransactionStatus,
  DeliveryStatus,
} from '@mbolo/shared';
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

  /**
   * Le patient ajoute ou écarte les conseils officinaux proposés par le
   * pharmacien. N'affecte que les articles « conseillés » (jamais les prescrits) ;
   * la commande n'est pas bloquée par ce choix, seul le total est recalculé.
   */
  async decideRecommendation(orderId: string, patientId: string, input: RecommendationDecisionInput) {
    const order = await this.repo.findById(orderId);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.patientId !== patientId) throw HTTP.forbidden();
    // On ne touche pas à une commande déjà en préparation/livrée/annulée.
    const editable =
      order.status === OrderStatus.PENDING_PHARMACY || order.status === OrderStatus.PHARMACY_ACCEPTED;
    if (!editable) throw HTTP.unprocessable('Cette commande ne peut plus être modifiée');

    // On ne décide que des articles réellement « suggérés ».
    const suggestedIds = new Set(
      order.items
        .filter((i) => i.recommendationStatus === RecommendationStatus.SUGGESTED)
        .map((i) => i.id),
    );
    const decisions = input.decisions.filter((d) => suggestedIds.has(d.itemId));
    if (decisions.length === 0) throw HTTP.unprocessable('Aucun conseil en attente sur cette commande');

    const { order: updated, totalFcfa } = await this.repo.applyRecommendationDecision(orderId, decisions);
    const nbAdded = decisions.filter((d) => d.accepted).length;
    if (nbAdded > 0) {
      await this.notif.send({
        to: order.patient.phone,
        message:
          `${nbAdded} produit(s) conseillé(s) ajouté(s) à votre commande #${orderId.slice(-6).toUpperCase()}.\n` +
          `Nouveau total : ${totalFcfa + order.serviceFeeFcfa} FCFA. Procédez au paiement pour confirmer.`,
      });
    }
    return { order: updated, totalFcfa };
  }

  /** Le patient choisit le mode de paiement (Mobile Money séquestre ou espèces). */
  async choosePaymentMethod(orderId: string, patientId: string, method: 'escrow' | 'cod') {
    const order = await this.repo.findById(orderId);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.patientId !== patientId) throw HTTP.forbidden();
    // Modifiable tant que la commande n'est pas payée / expédiée / livrée.
    const editable =
      order.status === OrderStatus.PENDING_PHARMACY || order.status === OrderStatus.PHARMACY_ACCEPTED;
    if (!editable) throw HTTP.unprocessable('Le mode de paiement ne peut plus être modifié.');
    if ((order as any).transaction) throw HTTP.unprocessable('Un paiement est déjà en cours.');
    return this.repo.setPaymentMethod(orderId, method);
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

  /** Tableau de bord business : CA, panier moyen, conseils, top produits. */
  async statsForPartner(partnerId: string) {
    const { agg, items } = await this.repo.statsForPartner(partnerId);
    const ordersCount   = agg._count._all;
    const revenueFcfa   = agg._sum.totalFcfa ?? 0;
    const caisseFcfa    = agg._sum.caisseShareFcfa ?? 0;
    const avgBasketFcfa = ordersCount ? Math.round(revenueFcfa / ordersCount) : 0;

    const advice = items.filter(
      (i) => i.kind === OrderItemKind.RECOMMENDED && i.recommendationStatus === RecommendationStatus.ACCEPTED,
    );
    const adviceCount       = advice.length;
    const adviceRevenueFcfa = advice.reduce((s, i) => s + i.totalFcfa, 0);

    // Top produits (par CA) sur les articles réellement facturés.
    const billable = items.filter(
      (i) => i.kind !== OrderItemKind.RECOMMENDED || i.recommendationStatus === RecommendationStatus.ACCEPTED,
    );
    const byName = new Map<string, { name: string; qty: number; revenueFcfa: number }>();
    for (const i of billable) {
      const e = byName.get(i.name) ?? { name: i.name, qty: 0, revenueFcfa: 0 };
      e.qty += i.quantity;
      e.revenueFcfa += i.totalFcfa;
      byName.set(i.name, e);
    }
    const topProducts = [...byName.values()].sort((a, b) => b.revenueFcfa - a.revenueFcfa).slice(0, 5);

    return { ordersCount, revenueFcfa, caisseFcfa, avgBasketFcfa, adviceCount, adviceRevenueFcfa, topProducts };
  }

  /** Encaissements : versé / en séquestre (à verser) / en attente de paiement. */
  async earningsForPartner(partnerId: string) {
    const orders = await this.repo.earningsForPartner(partnerId);
    let releasedFcfa = 0;
    let escrowFcfa = 0;
    let pendingFcfa = 0;
    const rows = orders.map((o) => {
      // La pharmacie perçoit 100 % du prix médicament (aucune marge plateforme).
      const dueFcfa = o.totalFcfa;
      const txn = o.transaction?.status;
      const delivered = o.delivery?.status === DeliveryStatus.DELIVERED || o.status === OrderStatus.DELIVERED;
      let state: 'released' | 'escrow' | 'pending';
      if (delivered || txn === TransactionStatus.RELEASED) {
        state = 'released';
        releasedFcfa += dueFcfa;
      } else if (txn === TransactionStatus.HELD || txn === TransactionStatus.CAPTURED) {
        state = 'escrow';
        escrowFcfa += dueFcfa;
      } else {
        state = 'pending';
        pendingFcfa += dueFcfa;
      }
      return { orderId: o.id, dueFcfa, state, createdAt: o.createdAt };
    });
    return { releasedFcfa, escrowFcfa, pendingFcfa, rows };
  }

  /** Bordereau tiers-payant : créances part-caisse à récupérer. */
  async insuranceClaimsForPartner(partnerId: string) {
    const orders = await this.repo.insuranceClaimsForPartner(partnerId);
    const totalFcfa = orders.reduce((s, o) => s + o.caisseShareFcfa, 0);
    const byProvider: Record<string, number> = {};
    for (const o of orders) {
      byProvider[o.insuranceProvider] = (byProvider[o.insuranceProvider] ?? 0) + o.caisseShareFcfa;
    }
    const rows = orders.map((o) => ({
      orderId: o.id,
      patientName: o.patient?.name ?? '—',
      provider: o.insuranceProvider,
      coverageRate: o.insuranceCoverageRate,
      caisseShareFcfa: o.caisseShareFcfa,
      totalFcfa: o.totalFcfa,
      createdAt: o.createdAt,
    }));
    return { totalFcfa, count: orders.length, byProvider, rows };
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
