import { prisma } from '../../infrastructure/prisma/client';
import { DeliveryStatus } from '@mbolo/shared';

const DELIVERY_INCLUDE = {
  order: {
    include: {
      partner: { select: { id: true, legalName: true, landmark: true, phone: true } },
      patient: { select: { id: true, name: true, phone: true } },
      items:   true,
    },
  },
  tracking: true,
} as const;

export class DeliveryRepository {
  async create(orderId: string, feeFcfa: number) {
    return prisma.delivery.create({ data: { orderId, feeFcfa } });
  }

  async findById(id: string) {
    return prisma.delivery.findUnique({ where: { id }, include: DELIVERY_INCLUDE });
  }

  /** Crée le profil coursier s'il n'existe pas encore */
  async ensureCourierProfile(userId: string) {
    return prisma.courier.upsert({
      where:  { userId },
      update: {},
      create: { userId },
    });
  }

  async listForCourierByUserId(userId: string) {
    return prisma.delivery.findMany({
      where:   { courier: { userId } },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPending() {
    return prisma.delivery.findMany({
      where:   { status: DeliveryStatus.PENDING_ASSIGNMENT },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignByUserId(id: string, courierUserId: string) {
    const courier = await this.ensureCourierProfile(courierUserId);
    return prisma.delivery.update({
      where: { id },
      data:  { courierId: courier.id, status: DeliveryStatus.ASSIGNED, assignedAt: new Date() },
    });
  }

  async updateStatusByCourier(id: string, courierUserId: string, status: DeliveryStatus) {
    const delivery = await prisma.delivery.findUnique({
      where:   { id },
      include: { courier: { select: { userId: true } } },
    });
    if (!delivery || delivery.courier?.userId !== courierUserId) return null;
    return prisma.delivery.update({ where: { id }, data: { status } });
  }

  /** Reste de l'ancien API — non supprimé pour ne pas casser l'existant */
  async assign(id: string, courierId: string) {
    return prisma.delivery.update({
      where: { id },
      data:  { courierId, status: DeliveryStatus.ASSIGNED, assignedAt: new Date() },
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
      data:  { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
    });
  }

  async listForCourier(courierId: string) {
    return prisma.delivery.findMany({ where: { courierId }, include: DELIVERY_INCLUDE });
  }

  async setCourierAvailability(userId: string, isAvailable: boolean) {
    return prisma.courier.upsert({
      where:  { userId },
      update: { isAvailable },
      create: { userId, isAvailable },
    });
  }
}

