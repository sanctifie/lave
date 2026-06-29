import { HTTP } from '../../lib/errors';
import { MealRepository } from './repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PricingKind } from '@mbolo/shared';
import { CreateMealPlanInput, CreateMealOrderInput } from './schema';
import { prisma } from '../../infrastructure/prisma/client';
import type { PushService } from '../../infrastructure/push/service';

export class MealService {
  constructor(
    private readonly repo: MealRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly notif: NotificationService,
    private readonly push?: PushService,
  ) {}

  async listPlans(partnerId?: string) {
    return this.repo.listActivePlans(partnerId);
  }

  async getPlan(id: string) {
    const plan = await this.repo.findPlanById(id);
    if (!plan) throw HTTP.notFound('Menu introuvable');
    return plan;
  }

  async createPlan(userId: string, input: CreateMealPlanInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerProfileId: true },
    });
    if (!user?.partnerProfileId) throw HTTP.forbidden('Profil cuisine introuvable');
    return this.repo.createPlan(user.partnerProfileId, input);
  }

  async toggleItem(itemId: string, isAvailable: boolean) {
    return this.repo.togglePlanItem(itemId, isAvailable);
  }

  async placeOrder(patientId: string, input: CreateMealOrderInput) {
    const plan = await this.repo.findPlanById(input.mealPlanId);
    if (!plan) throw HTTP.notFound('Menu introuvable');
    if (!plan.isActive) throw HTTP.unprocessable('Ce menu n\'est plus disponible');

    const deliveryEntry = await this.pricingRepo.getByKind(PricingKind.MEAL_DELIVERY_FEE);
    const deliveryFeeFcfa = deliveryEntry?.valueFcfa ?? 500;

    const availableItems = plan.items.filter((i) => i.isAvailable);
    if (availableItems.length === 0) throw HTTP.unprocessable('Aucun article disponible dans ce menu');
    const itemsTotal = availableItems.reduce((sum, i) => sum + i.unitPriceFcfa, 0);
    const totalFcfa = itemsTotal + deliveryFeeFcfa;

    const order = await this.repo.createOrder(patientId, {
      mealPlanId: input.mealPlanId,
      totalFcfa,
      deliveryFeeFcfa,
      notes: input.notes,
    });

    const partner = await prisma.partnerProfile.findUnique({
      where: { id: plan.partnerId },
      select: { phone: true, whatsappNumber: true, staff: { select: { id: true } } },
    });
    if (partner) {
      await this.notif.send({
        to: partner.whatsappNumber ?? partner.phone,
        message: `Nouvelle commande repas : ${plan.name}. Total : ${totalFcfa} FCFA.`,
      });

      // Push à chaque membre du staff cuisine (best-effort).
      if (this.push) {
        for (const member of partner.staff) {
          this.push.sendToUser(member.id, {
            title: '🥗 Nouvelle commande repas',
            body:  `${plan.name} — ${totalFcfa.toLocaleString('fr-FR')} FCFA`,
            data:  { type: 'meal_ordered', mealOrderId: order.id },
          });
        }
      }
    }

    return order;
  }

  async listMine(patientId: string) {
    return this.repo.listOrdersForPatient(patientId);
  }

  async getOrder(id: string) {
    const order = await this.repo.findOrderById(id);
    if (!order) throw HTTP.notFound('Commande introuvable');
    return order;
  }

  async listForKitchen(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerProfileId: true },
    });
    if (!user?.partnerProfileId) throw HTTP.forbidden();
    return this.repo.listOrdersForKitchen(user.partnerProfileId);
  }
}
