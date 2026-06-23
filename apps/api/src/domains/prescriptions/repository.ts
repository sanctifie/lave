import { prisma } from '../../infrastructure/prisma/client';
import { PrescriptionStatus, PrescriptionSource } from '@mbolo/shared';

export class PrescriptionRepository {
  async create(patientId: string, data: { type: string; source?: PrescriptionSource }) {
    return prisma.prescription.create({ data: { patientId, ...data } as Parameters<typeof prisma.prescription.create>[0]['data'] });
  }

  async findById(id: string) {
    return prisma.prescription.findUnique({
      where: { id },
      include: { patient: { select: { name: true, phone: true } }, orders: true },
    });
  }

  async listForPatient(patientId: string) {
    return prisma.prescription.findMany({
      where: { patientId },
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

  async issueFromConsultation(data: {
    patientId: string;
    consultationId: string;
    issuedById: string;
  }) {
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
