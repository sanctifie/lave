import { HTTP } from '../../lib/errors';
import { OrderRepository } from './repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PharmacyActionInput } from './schema';
import { OrderStatus } from '@mbolo/shared';

export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly notif: NotificationService,
  ) {}

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
