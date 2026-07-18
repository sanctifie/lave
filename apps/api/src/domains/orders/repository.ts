import { prisma } from '../../infrastructure/prisma/client';
import { OrderStatus, SubstitutionStatus } from '@mbolo/shared';

type OrderStatusValue = `${OrderStatus}`;
type SubStatusValue = `${SubstitutionStatus}`;

export interface NewOrderItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  substitutionStatus?: SubStatusValue;
  originalName?: string;
  substitutionReason?: string;
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
    },
  ) {
    return prisma.order.create({
      data: {
        patientId,
        prescriptionId: data.prescriptionId,
        partnerId: data.partnerId,
        totalFcfa: data.totalFcfa,
        serviceFeeFcfa: data.serviceFeeFcfa,
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
      // Total recalculé sur les articles restants (les refusés sont exclus).
      const items = await tx.orderItem.findMany({ where: { orderId } });
      const kept = items.filter((i) => i.substitutionStatus !== SubstitutionStatus.REJECTED);
      const totalFcfa = kept.reduce((s, i) => s + i.totalFcfa, 0);
      const allRejected = kept.length === 0;
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          totalFcfa,
          status: (allRejected ? OrderStatus.CANCELLED : OrderStatus.PENDING_PHARMACY) as OrderStatus,
        },
        include: { items: true },
      });
      return { order: updated, allRejected, keptTotalFcfa: totalFcfa };
    });
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        delivery: true,
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
        delivery: { select: { status: true, handoverCode: true } },
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
}
