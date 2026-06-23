import { prisma } from '../../infrastructure/prisma/client';
import { DeliveryStatus } from '@mbolo/shared';

export class DeliveryRepository {
  async create(orderId: string, feeFcfa: number) {
    return prisma.delivery.create({ data: { orderId, feeFcfa } });
  }

  async findById(id: string) {
    return prisma.delivery.findUnique({ where: { id }, include: { tracking: true } });
  }

  async assign(id: string, courierId: string) {
    return prisma.delivery.update({
      where: { id },
      data: { courierId, status: DeliveryStatus.ASSIGNED, assignedAt: new Date() },
    });
  }

  async updateStatus(id: string, status: DeliveryStatus, lat?: number, lng?: number) {
    return prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.update({ where: { id }, data: { status } });
      if (lat !== undefined && lng !== undefined) {
        await tx.tracking.create({ data: { deliveryId: id, lat, lng, status } });
      }
      return delivery;
    });
  }

  async confirmHandover(id: string, code: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id } });
    if (!delivery || delivery.handoverCode !== code) return null;
    return prisma.delivery.update({
      where: { id },
      data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
    });
  }

  async listForCourier(courierId: string) {
    return prisma.delivery.findMany({ where: { courierId }, include: { order: true } });
  }

  async listPending() {
    return prisma.delivery.findMany({ where: { status: DeliveryStatus.PENDING_ASSIGNMENT } });
  }
}
