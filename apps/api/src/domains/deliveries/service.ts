import { HTTP } from '../../lib/errors';
import { DeliveryRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PaymentRepository } from '../payments/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PaymentProvider } from '../../infrastructure/providers/payment';
import { DeliveryStatus, OrderStatus } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { randomUUID } from 'crypto';

export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly notif: NotificationService,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async getById(id: string) {
    const d = await this.repo.findById(id);
    if (!d) throw HTTP.notFound('Livraison introuvable');
    return d;
  }

  async listMine(courierId: string) {
    return this.repo.listForCourier(courierId);
  }

  async listPending() {
    return this.repo.listPending();
  }

  async assign(deliveryId: string, courierId: string) {
    const delivery = await this.repo.findById(deliveryId);
    if (!delivery) throw HTTP.notFound('Livraison introuvable');
    if (delivery.status !== DeliveryStatus.PENDING_ASSIGNMENT) {
      throw HTTP.conflict('Livraison déjà assignée');
    }

    const updated = await this.repo.assign(deliveryId, courierId);

    // Notifie le patient de l'assignation
    if (delivery.orderId) {
      const order = await this.orderRepo.findById(delivery.orderId);
      if (order) {
        await this.notif.send({
          to: order.patient.phone,
          message: `Un livreur a été assigné à votre commande #${delivery.orderId.slice(-6).toUpperCase()}. Il viendra récupérer votre colis à la pharmacie.`,
        });
      }
    }

    return updated;
  }

  async updatePosition(deliveryId: string, courierId: string, status: DeliveryStatus, lat: number, lng: number) {
    const delivery = await this.repo.findById(deliveryId);
    if (!delivery) throw HTTP.notFound('Livraison introuvable');
    if (delivery.courierId !== courierId) throw HTTP.forbidden();

    // Màj position du courier dans sa table
    await prisma.courier.update({
      where: { userId: courierId },
      data: { lat, lng },
    });

    return this.repo.updateStatus(deliveryId, status, lat, lng);
  }

  async confirmHandover(deliveryId: string, code: string) {
    const delivery = await this.repo.confirmHandover(deliveryId, code);
    if (!delivery) throw HTTP.unprocessable('Code de remise invalide');

    // Mise à jour statut commande
    if (delivery.orderId) {
      await this.orderRepo.updateStatus(delivery.orderId, OrderStatus.DELIVERED);

      // ── Libération de l'escrow ────────────────────────────────────────
      const txn = await this.paymentRepo.findByOrderId(delivery.orderId);
      if (txn?.providerTransactionId) {
        await this.paymentProvider.releaseEscrow(txn.providerTransactionId);
        await this.paymentRepo.release(txn.id, txn.providerTransactionId);

        // Payout vers la pharmacie (stub pour l'instant)
        const order = await this.orderRepo.findById(delivery.orderId);
        if (order) {
          const pharmacyAmount = Math.round(order.totalFcfa * 0.85); // 85% après commission
          await this.paymentProvider.payout({
            amountFcfa: pharmacyAmount,
            phoneNumber: order.partner.phone,
            idempotencyKey: randomUUID(),
          });

          // Notifie le patient et la pharmacie
          await Promise.all([
            this.notif.send({
              to: order.patient.phone,
              message: `Livraison confirmée ✓ Merci d'avoir utilisé MBOLO Santé !`,
            }),
            this.notif.send({
              to: order.partner.whatsappNumber ?? order.partner.phone,
              message: `Paiement de ${pharmacyAmount} FCFA en cours de virement pour la commande #${delivery.orderId.slice(-6).toUpperCase()}.`,
            }),
          ]);
        }
      }
    }

    return delivery;
  }
}
