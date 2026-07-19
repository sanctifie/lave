import { HTTP } from '../../lib/errors';
import { PrescriptionRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PushService } from '../../infrastructure/push/service';
import {
  PrescriptionStatus,
  PricingKind,
  OrderStatus,
  SubstitutionConsent,
  SubstitutionStatus,
  OrderItemKind,
  RecommendationStatus,
  InsuranceProvider,
} from '@mbolo/shared';
import { CreatePrescriptionInput, ValidatePrescriptionInput } from './schema';
import { prisma } from '../../infrastructure/prisma/client';

export class PrescriptionService {
  constructor(
    private readonly repo: PrescriptionRepository,
    private readonly orderRepo: OrderRepository,
    private readonly deliveryRepo: DeliveryRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly notif: NotificationService,
    private readonly push: PushService,
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

  /**
   * Renouvellement d'ordonnance : le patient relance une ordonnance déjà
   * traitée (traitement chronique). On recrée une ordonnance « en attente » que
   * le pharmacien devra revalider — la dispensation reste sous contrôle légal.
   */
  async renew(sourceId: string, patientId: string) {
    const source = await this.repo.findById(sourceId);
    if (!source) throw HTTP.notFound('Ordonnance introuvable');
    if (source.patientId !== patientId) throw HTTP.forbidden();

    // On ne renouvelle qu'une ordonnance qui a franchi la validation pharmacien.
    const renewable: string[] = [
      PrescriptionStatus.VALIDATED,
      PrescriptionStatus.PARTIALLY_FILLED,
      PrescriptionStatus.FILLED,
    ];
    if (!renewable.includes(source.status)) {
      throw HTTP.unprocessable('Seule une ordonnance déjà validée peut être renouvelée.');
    }

    const rx = await this.repo.renewFrom(sourceId, patientId);
    if (!rx) throw HTTP.notFound('Ordonnance introuvable');

    // Notifie la pharmacie cible du renouvellement
    const partnerPhone = rx.targetPartner?.whatsappNumber ?? rx.targetPartner?.phone;
    if (partnerPhone) {
      await this.notif.send({
        to: partnerPhone,
        message: `Demande de renouvellement de ${rx.patient?.name ?? 'un patient'}. Référence : ${rx.id}. Connectez-vous pour valider.`,
      });
    }

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
    const isOwned      = rx.targetPartnerId === partnerId;
    const isTeleconsult = rx.targetPartnerId === null && (rx as any).source === 'teleconsultation';
    if (!isOwned && !isTeleconsult) throw HTTP.forbidden();
    if (rx.status !== PrescriptionStatus.PENDING_VALIDATION) {
      throw HTTP.unprocessable('Ordonnance déjà traitée');
    }
    // Anti double délivrance : une ordonnance annotée « stupéfiant servi » ne
    // peut plus jamais être re-servie (règle de l'ordonnancier).
    if ((rx as any).controlledNote) {
      throw HTTP.unprocessable('Stupéfiant déjà servi pour cette ordonnance (voir annotation ordonnancier).');
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

    // ── Substitution : le pharmacien peut avoir remplacé un produit indisponible
    // par un équivalent. Le consentement du patient (choisi à l'upload) décide.
    const consent = (rx as any).substitutionConsent ?? SubstitutionConsent.ASK;
    const rawItems = input.items!;
    const hasSubstitution = rawItems.some((i) => i.substituted);
    const controlledItems = rawItems.filter((i) => i.controlled);

    // Un conseil au comptoir (sans ordonnance) ne peut JAMAIS contenir de
    // stupéfiant : ceux-ci exigent une prescription et l'ordonnancier.
    if ((rx as any).type === 'advice' && controlledItems.length > 0) {
      throw HTTP.unprocessable('Un stupéfiant ne peut pas être dispensé sur simple conseil — ordonnance obligatoire.');
    }

    // Garde-fou légal : « produit exact uniquement » → aucune substitution admise.
    if (consent === SubstitutionConsent.DENY && hasSubstitution) {
      throw HTTP.unprocessable(
        "Le patient n'accepte aucun équivalent : dispensez le produit exact ou refusez l'ordonnance.",
      );
    }

    const items = rawItems.map((i) => {
      if (!i.substituted) {
        return { name: i.name, quantity: i.quantity, unitPriceFcfa: i.unitPriceFcfa };
      }
      // allow → accepté d'office ; ask → en attente de l'accord du patient
      const substitutionStatus =
        consent === SubstitutionConsent.ALLOW
          ? SubstitutionStatus.AUTO_ACCEPTED
          : SubstitutionStatus.PENDING;
      return {
        name: i.name,
        quantity: i.quantity,
        unitPriceFcfa: i.unitPriceFcfa,
        substitutionStatus,
        originalName: i.originalName,
        substitutionReason: i.substitutionReason,
      };
    });

    // Un stupéfiant substitué par équivalence est interdit : produit exact requis.
    if (controlledItems.some((i) => i.substituted)) {
      throw HTTP.unprocessable('Un stupéfiant ne peut pas être substitué par un équivalent.');
    }

    const needsPatientApproval = items.some(
      (i) => i.substitutionStatus === SubstitutionStatus.PENDING,
    );
    // Seuls les articles prescrits comptent dans le total ; les conseils
    // officinaux (facultatifs) ne sont facturés que si le patient les ajoute.
    const totalFcfa = items.reduce((s, i) => s + i.quantity * i.unitPriceFcfa, 0);

    // Conseil officinal (cross-sell) : proposé, non imposé. Ajouté à la commande
    // en statut « suggéré » (hors total tant que le patient ne l'a pas accepté).
    const recommendationItems = (input.recommendations ?? []).map((r) => ({
      name: r.name,
      quantity: r.quantity,
      unitPriceFcfa: r.unitPriceFcfa,
      kind: OrderItemKind.RECOMMENDED,
      recommendationStatus: RecommendationStatus.SUGGESTED,
      recommendationNote: r.note,
    }));

    // Tiers-payant : instantané de l'assurance du patient (part caisse calculée
    // dans le repo à partir du total médicaments et du taux de prise en charge).
    const profile = (rx as any).patient?.patientProfile;
    const insuranceProvider = profile?.insuranceProvider ?? InsuranceProvider.NONE;
    const insuranceCoverageRate = profile?.insuranceCoverageRate ?? 0;

    const order = await this.orderRepo.create(rx.patientId, {
      prescriptionId: rxId,
      partnerId,
      items: [...items, ...recommendationItems],
      totalFcfa,
      serviceFeeFcfa,
      status: needsPatientApproval ? OrderStatus.PENDING_SUBSTITUTION : OrderStatus.PENDING_PHARMACY,
      insuranceProvider,
      insuranceCoverageRate,
    });

    // ── Ordonnancier légal : inscription des stupéfiants + annotation « servi »
    // (fait dès la validation, y compris si une substitution reste en attente
    // sur d'autres articles — un stupéfiant n'est jamais substituable).
    if (controlledItems.length > 0) {
      // Boucle stupéfiant : le coursier récupère D'ABORD l'original chez le
      // patient, le pharmacien le vérifie et l'annote de sa main, puis le colis
      // repart avec l'original scellé.
      await prisma.order.update({ where: { id: order.id }, data: { paperStatus: 'to_collect' } });
      await this.repo.recordControlledDispensing({
        partnerId,
        partnerName: (rx as any).targetPartner?.legalName ?? 'Pharmacie',
        prescriptionId: rxId,
        orderId: order.id,
        patientName: rx.patient?.name ?? '—',
        prescriberName: input.prescriberName!,
        items: controlledItems.map((i) => ({ name: i.name, quantity: i.quantity, unitPriceFcfa: i.unitPriceFcfa })),
      });
    }

    // Consentement « me demander » + équivalent proposé : on attend l'accord du
    // patient AVANT de préparer/livrer. Aucune livraison créée à ce stade.
    if (needsPatientApproval) {
      const nb = items.filter((i) => i.substitutionStatus === SubstitutionStatus.PENDING).length;
      await this.notif.send({
        to: rx.patient.phone,
        message:
          `Votre pharmacien propose un équivalent pour ${nb} médicament(s) indisponible(s).\n` +
          `Ouvrez l'app MBOLO pour accepter ou refuser avant préparation.`,
      });
      this.push.sendToUser(rx.patientId, {
        title: '🔁 Équivalent proposé',
        body: `${nb} médicament(s) à valider avant préparation.`,
        data: { type: 'substitution_proposed', orderId: order.id },
      });
      return { prescription: updatedRx, order, delivery: null, pendingSubstitution: true };
    }

    // Course stupéfiant : boucle patient → officine → patient, tarif majoré
    // (configurable ; défaut : 2 × la course de base).
    const controlledFee = controlledItems.length
      ? (await this.pricingRepo.getByKind(PricingKind.CONTROLLED_DELIVERY_FEE))?.valueFcfa ?? deliveryFeeFcfa * 2
      : deliveryFeeFcfa;
    const delivery = await this.deliveryRepo.create(order.id, controlledFee);

    // Notifie le patient (en signalant les équivalents acceptés d'office le cas échéant)
    const autoNote = hasSubstitution
      ? `\n(Un ou plusieurs médicaments ont été remplacés par un équivalent, comme vous l'aviez accepté.)`
      : '';
    const recoNote = recommendationItems.length
      ? `\n💡 Votre pharmacien vous conseille ${recommendationItems.length} produit(s) en complément (facultatif) — à voir dans l'app.`
      : '';
    await this.notif.send({
      to: rx.patient.phone,
      message:
        `Votre ordonnance a été validée ✓\n` +
        `Commande #${order.id.slice(-6).toUpperCase()} — Total : ${totalFcfa + serviceFeeFcfa} FCFA\n` +
        `Livraison : ${deliveryFeeFcfa} FCFA${autoNote}${recoNote}\n` +
        `Procédez au paiement pour confirmer.`,
    });
    this.push.sendToUser(rx.patientId, {
      title: '✅ Ordonnance validée',
      body:  `Commande prête — ${(totalFcfa + serviceFeeFcfa).toLocaleString('fr-FR')} FCFA à régler.`,
      data:  { type: 'prescription_validated', orderId: order.id },
    });

    // Notifie les coursiers disponibles qu'une livraison est prête
    const availableCouriers = await prisma.courier.findMany({
      where:   { isAvailable: true },
      include: { user: { select: { id: true } } },
    });
    for (const courier of availableCouriers) {
      this.push.sendToUser(courier.user.id, {
        title: '📦 Nouvelle livraison disponible',
        body:  'Une commande est prête à être récupérée en pharmacie.',
        data:  { type: 'new_delivery', deliveryId: delivery.id },
      });
    }

    return { prescription: updatedRx, order, delivery };
  }
}
