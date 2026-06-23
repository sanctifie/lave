import { HTTP } from '../../lib/errors';
import { PrescriptionRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PrescriptionStatus, PricingKind } from '@mbolo/shared';
import { CreatePrescriptionInput, ValidatePrescriptionInput } from './schema';

export class PrescriptionService {
  constructor(
    private readonly repo: PrescriptionRepository,
    private readonly orderRepo: OrderRepository,
    private readonly deliveryRepo: DeliveryRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly notif: NotificationService,
  ) {}

  async create(patientId: string, input: CreatePrescriptionInput, file?: Express.Multer.File) {
    const rx = await this.repo.create(patientId, input);

    if (file) {
      await this.repo.attachMedia(rx.id, patientId, file.filename, file.mimetype);
    }

    // Notifie la pharmacie cible
    const partnerPhone = rx.targetPartner?.whatsappNumber ?? rx.targetPartner?.phone;
    if (partnerPhone) {
      await this.notif.send({
        to: partnerPhone,
        message: `Nouvelle ordonnance reçue de ${rx.patient?.name ?? 'un patient'}. Référence : ${rx.id}. Connectez-vous pour valider.`,
      });
    }

    return rx;
  }

  async getById(id: string, requesterId: string) {
    const rx = await this.repo.findWithMedia(id);
    if (!rx) throw HTTP.notFound('Ordonnance introuvable');
    if (rx.patientId !== requesterId) throw HTTP.forbidden();
    return rx;
  }

  async listMine(patientId: string) {
    return this.repo.listForPatient(patientId);
  }

  async listForPartner(partnerId: string) {
    return this.repo.listForPartner(partnerId);
  }

  async validate(rxId: string, pharmacistUserId: string, partnerId: string, input: ValidatePrescriptionInput) {
    const rx = await this.repo.findById(rxId);
    if (!rx) throw HTTP.notFound('Ordonnance introuvable');
    if (rx.targetPartnerId !== partnerId) throw HTTP.forbidden();
    if (rx.status !== PrescriptionStatus.PENDING_VALIDATION) {
      throw HTTP.unprocessable('Ordonnance déjà traitée');
    }

    if (!input.approved) {
      const updated = await this.repo.reject(rxId, pharmacistUserId, input.rejectionReason!);
      // Notifie le patient du refus
      await this.notif.send({
        to: rx.patient.phone,
        message: `Votre ordonnance a été refusée : ${input.rejectionReason}. Contactez votre pharmacien.`,
      });
      return { prescription: updated };
    }

    // ── Validation + création auto de la commande ─────────────────────
    const updatedRx = await this.repo.validate(rxId, pharmacistUserId);

    const [serviceFeeEntry, deliveryFeeEntry] = await Promise.all([
      this.pricingRepo.getByKind(PricingKind.SERVICE_FEE),
      this.pricingRepo.getByKind(PricingKind.DELIVERY_BASE),
    ]);
    const serviceFeeFcfa = serviceFeeEntry?.valueFcfa ?? 500;
    const deliveryFeeFcfa = deliveryFeeEntry?.valueFcfa ?? 1000;

    const items = input.items!;
    const totalFcfa = items.reduce((s, i) => s + i.quantity * i.unitPriceFcfa, 0);

    const order = await this.orderRepo.create(rx.patientId, {
      prescriptionId: rxId,
      partnerId,
      items,
      totalFcfa,
      serviceFeeFcfa,
    });

    const delivery = await this.deliveryRepo.create(order.id, deliveryFeeFcfa);

    // Notifie le patient
    await this.notif.send({
      to: rx.patient.phone,
      message:
        `Votre ordonnance a été validée ✓\n` +
        `Commande #${order.id.slice(-6).toUpperCase()} — Total : ${totalFcfa + serviceFeeFcfa} FCFA\n` +
        `Livraison : ${deliveryFeeFcfa} FCFA\n` +
        `Procédez au paiement pour confirmer.`,
    });

    return { prescription: updatedRx, order, delivery };
  }
}
