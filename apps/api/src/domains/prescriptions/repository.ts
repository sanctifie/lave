import { prisma } from '../../infrastructure/prisma/client';
import { PrescriptionStatus, PrescriptionSource, MediaKind } from '@mbolo/shared';

export class PrescriptionRepository {
  async create(
    patientId: string,
    data: { type: string; targetPartnerId: string; substitutionConsent?: string },
  ) {
    return prisma.prescription.create({
      data: {
        patientId,
        type: data.type as Parameters<typeof prisma.prescription.create>[0]['data']['type'],
        targetPartnerId: data.targetPartnerId,
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
        // Allergies incluses : sécurité pharmaceutique (contrôle à la dispensation).
        patient: { select: { name: true, phone: true, patientProfile: { select: { allergies: true } } } },
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
