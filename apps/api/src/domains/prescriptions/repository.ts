import { prisma } from '../../infrastructure/prisma/client';
import { PrescriptionStatus, PrescriptionSource, MediaKind } from '@mbolo/shared';

export class PrescriptionRepository {
  async create(
    patientId: string,
    data: { type: string; targetPartnerId: string; substitutionConsent?: string; notes?: string },
  ) {
    return prisma.prescription.create({
      data: {
        patientId,
        type: data.type as Parameters<typeof prisma.prescription.create>[0]['data']['type'],
        targetPartnerId: data.targetPartnerId,
        ...(data.notes ? { notes: data.notes } : {}),
        ...(data.substitutionConsent
          ? {
              substitutionConsent: data.substitutionConsent as Parameters<
                typeof prisma.prescription.create
              >[0]['data']['substitutionConsent'],
            }
          : {}),
      },
      include: { targetPartner: true, patient: { select: { name: true } } },
    });
  }

  /**
   * Renouvellement : recrée une ordonnance à partir d'une existante (même
   * pharmacie, même type, même consentement de substitution) et recopie le(s)
   * scan(s) d'origine. Le statut repart à « en attente de validation » : le
   * pharmacien reste le dispensateur légal et doit tout revalider.
   */
  async renewFrom(sourceId: string, patientId: string) {
    const source = await prisma.prescription.findUnique({
      where: { id: sourceId },
      include: { targetPartner: true },
    });
    if (!source) return null;

    const media = await prisma.media.findMany({
      where: { refTable: 'prescriptions', refId: sourceId },
    });

    return prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.create({
        data: {
          patientId,
          type: source.type,
          targetPartnerId: source.targetPartnerId,
          substitutionConsent: source.substitutionConsent,
          status: PrescriptionStatus.PENDING_VALIDATION,
          notes: `Renouvellement de l'ordonnance #${sourceId.slice(-6).toUpperCase()}`,
        },
        include: { targetPartner: true, patient: { select: { name: true } } },
      });
      // Recopie les scans d'origine (nouvelles lignes Media pointant le même fichier).
      for (const m of media) {
        await tx.media.create({
          data: {
            kind: m.kind,
            url: m.url,
            mimeType: m.mimeType,
            uploadedById: patientId,
            refTable: 'prescriptions',
            refId: rx.id,
          },
        });
      }
      return rx;
    });
  }

  async attachMedia(prescriptionId: string, uploadedById: string, filename: string, mimeType: string) {
    return prisma.media.create({
      data: {
        kind: MediaKind.PRESCRIPTION_SCAN,
        url: `/uploads/${filename}`,
        mimeType,
        uploadedById,
        refTable: 'prescriptions',
        refId: prescriptionId,
      },
    });
  }

  async findById(id: string) {
    return prisma.prescription.findUnique({
      where: { id },
      include: {
        // Allergies + assurance : sécurité pharmaceutique et tiers-payant.
        patient: {
          select: {
            name: true,
            phone: true,
            patientProfile: {
              select: {
                allergies: true,
                insuranceProvider: true,
                insuranceCoverageRate: true,
              },
            },
          },
        },
        targetPartner: true,
        orders: true,
      },
    });
  }

  async findWithMedia(id: string) {
    const [rx, media] = await Promise.all([
      this.findById(id),
      prisma.media.findMany({ where: { refTable: 'prescriptions', refId: id } }),
    ]);
    return rx ? { ...rx, media } : null;
  }

  async listForPatient(patientId: string) {
    return prisma.prescription.findMany({
      where: { patientId },
      include: { targetPartner: { select: { legalName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForPartner(partnerId: string) {
    return prisma.prescription.findMany({
      where: {
        OR: [
          { targetPartnerId: partnerId },
          { targetPartnerId: null, source: PrescriptionSource.TELECONSULTATION },
        ],
      },
      include: { patient: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validate(id: string, validatedById: string) {
    return prisma.prescription.update({
      where: { id },
      data: { validatedById, validatedAt: new Date(), status: PrescriptionStatus.VALIDATED },
    });
  }

  /**
   * Ordonnancier légal (stupéfiants) : inscrit chaque article contrôlé avec un
   * numéro d'ordre séquentiel propre à la pharmacie, puis annote l'ordonnance
   * « déjà servi » (équivalent numérique de l'annotation pour les confrères —
   * bloque toute re-délivrance/renouvellement).
   */
  async recordControlledDispensing(params: {
    partnerId: string;
    partnerName: string;
    prescriptionId: string;
    orderId: string | null;
    patientName: string;
    prescriberName: string;
    items: { name: string; quantity: number; unitPriceFcfa: number }[];
  }) {
    return prisma.$transaction(async (tx) => {
      const last = await tx.dispensingRecord.findFirst({
        where: { partnerId: params.partnerId },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      });
      let seq = (last?.seq ?? 0) + 1;
      const seqs: number[] = [];
      for (const it of params.items) {
        await tx.dispensingRecord.create({
          data: {
            partnerId: params.partnerId,
            seq,
            patientName: params.patientName,
            medication: it.name,
            quantity: it.quantity,
            priceFcfa: it.quantity * it.unitPriceFcfa,
            prescriberName: params.prescriberName,
            prescriptionId: params.prescriptionId,
            orderId: params.orderId,
          },
        });
        seqs.push(seq);
        seq += 1;
      }
      const note = `Stupéfiant(s) servi(s) le ${new Date().toLocaleDateString('fr-FR')} — ${params.partnerName} — ordonnancier n° ${seqs.join(', ')}`;
      await tx.prescription.update({
        where: { id: params.prescriptionId },
        data: { controlledNote: note },
      });
      return { seqs, note };
    });
  }

  /** Ordonnancier : registre chronologique de la pharmacie. */
  async listDispensingRecords(partnerId: string) {
    return prisma.dispensingRecord.findMany({
      where: { partnerId },
      orderBy: { seq: 'desc' },
    });
  }

  /** Cachet numérique : l'ordonnance a été servie (équivalent du cachet daté). */
  async stampDispensed(id: string, partnerName: string) {
    return prisma.prescription.update({
      where: { id },
      data: { dispensedAt: new Date(), dispensedByName: partnerName },
    });
  }

  async reject(id: string, validatedById: string, rejectionReason: string) {
    return prisma.prescription.update({
      where: { id },
      data: { validatedById, validatedAt: new Date(), status: PrescriptionStatus.REJECTED, rejectionReason },
    });
  }

  async issueFromConsultation(data: { patientId: string; consultationId: string; issuedById: string }) {
    return prisma.prescription.create({
      data: {
        ...data,
        source: PrescriptionSource.TELECONSULTATION,
        issuedAt: new Date(),
        status: PrescriptionStatus.PENDING_VALIDATION,
      },
    });
  }
}
