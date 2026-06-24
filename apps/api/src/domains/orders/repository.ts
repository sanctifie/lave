import { prisma } from '../../infrastructure/prisma/client';
import { OrderStatus } from '@mbolo/shared';

export class OrderRepository {
  async create(
    patientId: string,
    data: {
      prescriptionId: string;
      partnerId: string;
      items: { name: string; quantity: number; unitPriceFcfa: number }[];
      totalFcfa: number;
      serviceFeeFcfa: number;
    },
  ) {
    return prisma.order.create({
      data: {
        patientId,
        prescriptionId: data.prescriptionId,
        partnerId: data.partnerId,
        totalFcfa: data.totalFcfa,
        serviceFeeFcfa: data.serviceFeeFcfa,
        items: {
          create: data.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPriceFcfa: i.unitPriceFcfa,
            totalFcfa: i.quantity * i.unitPriceFcfa,
          })),
        },
      },
      include: { items: true },
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
