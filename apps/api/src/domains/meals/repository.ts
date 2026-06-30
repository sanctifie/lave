import { prisma } from '../../infrastructure/prisma/client';

export class MealRepository {
  async listActivePlans(partnerId?: string) {
    return prisma.mealPlan.findMany({
      where: { isActive: true, ...(partnerId ? { partnerId } : {}) },
      include: { items: { where: { isAvailable: true }, orderBy: { name: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPlanById(id: string) {
    return prisma.mealPlan.findUnique({
      where: { id },
      include: { items: { orderBy: { name: 'asc' } } },
    });
  }

  async createPlan(partnerId: string, data: {
    name: string;
    description?: string;
    items: { name: string; unitPriceFcfa: number }[];
  }) {
    return prisma.mealPlan.create({
      data: {
        partnerId,
        name: data.name,
        description: data.description,
        items: { create: data.items },
      },
      include: { items: true },
    });
  }

  async togglePlanItem(itemId: string, isAvailable: boolean) {
    return prisma.mealPlanItem.update({ where: { id: itemId }, data: { isAvailable } });
  }

  async createOrder(patientId: string, data: {
    mealPlanId: string;
    totalFcfa: number;
    deliveryFeeFcfa: number;
    notes?: string;
  }) {
    return prisma.mealOrder.create({
      data: {
        patientId,
        mealPlanId: data.mealPlanId,
        totalFcfa: data.totalFcfa,
        deliveryFeeFcfa: data.deliveryFeeFcfa,
        notes: data.notes,
        delivery: { create: { feeFcfa: data.deliveryFeeFcfa } },
      },
      include: {
        mealPlan: { include: { items: true } },
        delivery: true,
      },
    });
  }

  async findOrderById(id: string) {
    return prisma.mealOrder.findUnique({
      where: { id },
      include: {
        mealPlan: { include: { items: true } },
        delivery: { include: { tracking: { orderBy: { recordedAt: 'desc' } } } },
        transaction: true,
      },
    });
  }

  async listOrdersForPatient(patientId: string) {
    return prisma.mealOrder.findMany({
      where: { patientId },
      include: {
        mealPlan: { select: { name: true, partnerId: true } },
        delivery: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listOrdersForKitchen(partnerId: string) {
    return prisma.mealOrder.findMany({
      where: { mealPlan: { partnerId } },
      include: {
        mealPlan: { select: { name: true } },
        delivery: { select: { status: true, handoverCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
