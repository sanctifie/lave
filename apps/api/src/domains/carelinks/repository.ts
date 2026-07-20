import { prisma } from '../../infrastructure/prisma/client';
import { CareLinkStatus } from '@mbolo/shared';

export class CareLinkRepository {
  findUserByPhone(phone: string) {
    return prisma.user.findUnique({
      where:  { phone },
      select: { id: true, name: true, role: true, isActive: true },
    });
  }

  findById(id: string) {
    return prisma.careLink.findUnique({ where: { id } });
  }

  findPair(caregiverId: string, patientId: string) {
    return prisma.careLink.findUnique({
      where: { caregiverId_patientId: { caregiverId, patientId } },
    });
  }

  create(caregiverId: string, patientId: string) {
    return prisma.careLink.create({
      data: { caregiverId, patientId, status: CareLinkStatus.PENDING },
    });
  }

  /** Réactive un lien révoqué (nouvelle invitation) plutôt que d'en créer un doublon. */
  reinvite(id: string) {
    return prisma.careLink.update({
      where: { id },
      data:  { status: CareLinkStatus.PENDING },
    });
  }

  setStatus(id: string, status: CareLinkStatus) {
    return prisma.careLink.update({ where: { id }, data: { status } });
  }

  /** Liens où l'user est le patient (ses aidants). */
  listForPatient(patientId: string) {
    return prisma.careLink.findMany({
      where:   { patientId },
      orderBy: { createdAt: 'desc' },
      include: { caregiver: { select: { id: true, name: true, phone: true } } },
    });
  }

  /** Liens où l'user est l'accompagnant (les patients qu'il gère). */
  listForCaregiver(caregiverId: string) {
    return prisma.careLink.findMany({
      where:   { caregiverId },
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });
  }

  /** Vérifie qu'un lien ACCEPTÉ existe entre l'accompagnant et le patient. */
  acceptedLink(caregiverId: string, patientId: string) {
    return prisma.careLink.findFirst({
      where: { caregiverId, patientId, status: CareLinkStatus.ACCEPTED },
    });
  }

  /** Commandes du patient géré (pour l'accompagnant). */
  ordersForPatient(patientId: string) {
    return prisma.order.findMany({
      where:   { patientId },
      orderBy: { createdAt: 'desc' },
      include: { partner: { select: { legalName: true } }, delivery: { select: { status: true } } },
    });
  }
}
