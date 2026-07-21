import { prisma } from '../../infrastructure/prisma/client';
import { CreateReviewInput } from './schema';

export class ReviewRepository {
  create(authorId: string, data: CreateReviewInput, moderation?: { flagged: boolean; moderationNote: string | null }) {
    return prisma.review.create({
      data: {
        authorId,
        rating: data.rating,
        comment: data.comment ?? null,
        refTable: data.refTable,
        refId: data.refId,
        flagged: moderation?.flagged ?? false,
        moderationNote: moderation?.moderationNote ?? null,
      },
    });
  }

  findExisting(authorId: string, refTable: string, refId: string) {
    return prisma.review.findFirst({ where: { authorId, refTable, refId } });
  }

  /** Avis signalés par la modération IA — file d'attente pour l'admin. */
  listFlagged() {
    return prisma.review.findMany({
      where: { flagged: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, rating: true, comment: true, moderationNote: true, createdAt: true,
        refTable: true, refId: true, author: { select: { name: true } },
      },
    });
  }

  clearFlag(id: string) {
    return prisma.review.update({ where: { id }, data: { flagged: false } });
  }

  remove(id: string) {
    return prisma.review.delete({ where: { id } });
  }

  async summary(refTable: string, refId: string) {
    const [agg, recent] = await Promise.all([
      prisma.review.aggregate({
        where: { refTable, refId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.review.findMany({
        // Les avis signalés par la modération IA sont exclus de l'affichage public.
        where: { refTable, refId, comment: { not: null }, flagged: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { rating: true, comment: true, createdAt: true, author: { select: { name: true } } },
      }),
    ]);
    return {
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      count: agg._count._all,
      recent: recent.map((r) => ({
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        authorName: r.author?.name ?? 'Patient',
      })),
    };
  }

  // Éligibilité : l'auteur a-t-il réellement été en relation avec la cible ?
  async hasDeliveredOrderWithPartner(patientId: string, partnerId: string) {
    return prisma.order.count({ where: { patientId, partnerId, status: 'delivered' } });
  }

  async hasDeliveryWithCourier(patientId: string, courierId: string) {
    return prisma.delivery.count({
      where: { courierId, status: 'delivered', order: { patientId } },
    });
  }

  async hasCompletedConsultationWithDoctor(patientId: string, doctorId: string) {
    return prisma.consultation.count({
      where: { doctorId, status: 'completed', appointment: { patientId } },
    });
  }
}
