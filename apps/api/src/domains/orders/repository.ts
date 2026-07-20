import { prisma } from '../../infrastructure/prisma/client';
import {
  OrderStatus,
  SubstitutionStatus,
  OrderItemKind,
  RecommendationStatus,
  InsuranceProvider,
} from '@mbolo/shared';

// Tiers-payant : part prise en charge par la caisse sur le total médicaments.
// Arrondi à l'entier FCFA le plus proche. Aucun impact sur le prix — simple
// répartition de qui paie (assuré / caisse).
export function caisseShareOf(totalFcfa: number, coverageRate: number): number {
  const rate = Math.max(0, Math.min(100, coverageRate));
  return Math.round((totalFcfa * rate) / 100);
}

type OrderStatusValue = `${OrderStatus}`;
type SubStatusValue = `${SubstitutionStatus}`;
type ItemKindValue = `${OrderItemKind}`;
type RecoStatusValue = `${RecommendationStatus}`;

export interface NewOrderItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  substitutionStatus?: SubStatusValue;
  originalName?: string;
  substitutionReason?: string;
  kind?: ItemKindValue;
  recommendationStatus?: RecoStatusValue;
  recommendationNote?: string;
}

// Un article compte dans le total à régler s'il n'est ni un équivalent refusé,
// ni un conseil officinal non encore accepté (suggéré ou écarté).
function countsTowardTotal(i: {
  substitutionStatus: string;
  recommendationStatus: string;
}): boolean {
  if (i.substitutionStatus === SubstitutionStatus.REJECTED) return false;
  if (
    i.recommendationStatus === RecommendationStatus.SUGGESTED ||
    i.recommendationStatus === RecommendationStatus.DECLINED
  ) {
    return false;
  }
  return true;
}

export class OrderRepository {
  async create(
    patientId: string,
    data: {
      prescriptionId: string;
      partnerId: string;
      items: NewOrderItem[];
      totalFcfa: number;
      serviceFeeFcfa: number;
      status?: OrderStatusValue;
      insuranceProvider?: `${InsuranceProvider}`;
      insuranceCoverageRate?: number;
    },
  ) {
    const coverageRate = data.insuranceCoverageRate ?? 0;
    const provider = data.insuranceProvider ?? InsuranceProvider.NONE;
    const caisseShareFcfa = provider === InsuranceProvider.NONE ? 0 : caisseShareOf(data.totalFcfa, coverageRate);
    return prisma.order.create({
      data: {
        patientId,
        prescriptionId: data.prescriptionId,
        partnerId: data.partnerId,
        totalFcfa: data.totalFcfa,
        serviceFeeFcfa: data.serviceFeeFcfa,
        insuranceProvider: provider as InsuranceProvider,
        insuranceCoverageRate: coverageRate,
        caisseShareFcfa,
        ...(data.status ? { status: data.status as OrderStatus } : {}),
        items: {
          create: data.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPriceFcfa: i.unitPriceFcfa,
            totalFcfa: i.quantity * i.unitPriceFcfa,
            substitutionStatus: (i.substitutionStatus ?? SubstitutionStatus.NONE) as SubstitutionStatus,
            originalName: i.originalName ?? null,
            substitutionReason: i.substitutionReason ?? null,
            kind: (i.kind ?? OrderItemKind.PRESCRIBED) as OrderItemKind,
            recommendationStatus: (i.recommendationStatus ?? RecommendationStatus.NONE) as RecommendationStatus,
            recommendationNote: i.recommendationNote ?? null,
          })),
        },
      },
      include: { items: true },
    });
  }

  /** Applique la décision du patient sur les équivalents proposés d'une commande. */
  async applySubstitutionDecision(
    orderId: string,
    decisions: { itemId: string; accepted: boolean }[],
  ) {
    return prisma.$transaction(async (tx) => {
      for (const d of decisions) {
        await tx.orderItem.update({
          where: { id: d.itemId },
          data: {
            substitutionStatus: (d.accepted
              ? SubstitutionStatus.ACCEPTED
              : SubstitutionStatus.REJECTED) as SubstitutionStatus,
          },
        });
      }
      // Total recalculé sur les articles facturables (équivalents refusés et
      // conseils non acceptés exclus).
      const items = await tx.orderItem.findMany({ where: { orderId } });
      const billable = items.filter(countsTowardTotal);
      const totalFcfa = billable.reduce((s, i) => s + i.totalFcfa, 0);
      // « Tout refusé » se juge sur les seuls articles prescrits.
      const keptPrescribed = items.filter(
        (i) => i.kind !== OrderItemKind.RECOMMENDED && i.substitutionStatus !== SubstitutionStatus.REJECTED,
      );
      const allRejected = keptPrescribed.length === 0;
      // Tiers-payant : la part caisse suit le nouveau total médicaments.
      const current = await tx.order.findUnique({ where: { id: orderId } });
      const caisseShareFcfa =
        current && current.insuranceProvider !== InsuranceProvider.NONE
          ? caisseShareOf(totalFcfa, current.insuranceCoverageRate)
          : 0;
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          totalFcfa,
          caisseShareFcfa,
          status: (allRejected ? OrderStatus.CANCELLED : OrderStatus.PENDING_PHARMACY) as OrderStatus,
        },
        include: { items: true },
      });
      return { order: updated, allRejected, keptTotalFcfa: totalFcfa };
    });
  }

  /** Applique le choix du patient sur les articles conseillés (conseil officinal). */
  async applyRecommendationDecision(
    orderId: string,
    decisions: { itemId: string; accepted: boolean }[],
  ) {
    return prisma.$transaction(async (tx) => {
      for (const d of decisions) {
        await tx.orderItem.update({
          where: { id: d.itemId },
          data: {
            recommendationStatus: (d.accepted
              ? RecommendationStatus.ACCEPTED
              : RecommendationStatus.DECLINED) as RecommendationStatus,
          },
        });
      }
      const items = await tx.orderItem.findMany({ where: { orderId } });
      const totalFcfa = items.filter(countsTowardTotal).reduce((s, i) => s + i.totalFcfa, 0);
      // Tiers-payant : la part caisse suit le nouveau total médicaments.
      const current = await tx.order.findUnique({ where: { id: orderId } });
      const caisseShareFcfa =
        current && current.insuranceProvider !== InsuranceProvider.NONE
          ? caisseShareOf(totalFcfa, current.insuranceCoverageRate)
          : 0;
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { totalFcfa, caisseShareFcfa },
        include: { items: true },
      });
      return { order: updated, totalFcfa };
    });
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        // Le code de remise appartient au PATIENT : il l'affiche au coursier à
        // la réception, et c'est le coursier qui le saisit pour confirmer.
        delivery: { select: { id: true, status: true, feeFcfa: true, courierId: true, handoverCode: true } },
        transaction: true,
        patient: { select: { name: true, phone: true } },
        partner: { select: { legalName: true, whatsappNumber: true, phone: true } },
      },
    });
  }

  async listForPatient(patientId: string) {
    return prisma.order.findMany({
      where: { patientId },
      include: {
        items: true,
        delivery: { select: { status: true } },
        partner:  { select: { legalName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForPartner(partnerId: string) {
    return prisma.order.findMany({
      where: { partnerId },
      include: { items: true, patient: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    return prisma.order.update({ where: { id }, data: { status } });
  }

  async setPaymentMethod(id: string, method: 'escrow' | 'cod') {
    return prisma.order.update({ where: { id }, data: { paymentMethod: method as any } });
  }

  // Commandes « réalisées » = ni annulées ni refusées par la pharmacie.
  private get realizedWhere() {
    return { status: { notIn: [OrderStatus.CANCELLED, OrderStatus.PHARMACY_REJECTED] as OrderStatus[] } };
  }

  /** Tableau de bord : agrégats de CA et articles pour une pharmacie. */
  async statsForPartner(partnerId: string) {
    const where = { partnerId, ...this.realizedWhere };
    const [agg, items] = await Promise.all([
      prisma.order.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalFcfa: true, caisseShareFcfa: true },
      }),
      prisma.orderItem.findMany({
        where: { order: where },
        select: { name: true, totalFcfa: true, quantity: true, kind: true, recommendationStatus: true },
      }),
    ]);
    return { agg, items };
  }

  /** Encaissements : commandes avec l'état de paiement et de livraison. */
  async earningsForPartner(partnerId: string) {
    return prisma.order.findMany({
      where: { partnerId, ...this.realizedWhere },
      select: {
        id: true,
        totalFcfa: true,
        caisseShareFcfa: true,
        status: true,
        createdAt: true,
        transaction: { select: { status: true } },
        delivery: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Bordereau tiers-payant : commandes avec une part caisse à récupérer. */
  async insuranceClaimsForPartner(partnerId: string) {
    return prisma.order.findMany({
      where: { partnerId, caisseShareFcfa: { gt: 0 }, ...this.realizedWhere },
      select: {
        id: true,
        createdAt: true,
        insuranceProvider: true,
        insuranceCoverageRate: true,
        caisseShareFcfa: true,
        totalFcfa: true,
        patient: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
