import { prisma } from '../../infrastructure/prisma/client';
import { CreateReviewInput } from './schema';

export class ReviewRepository {
  create(authorId: string, data: CreateReviewInput) {
    return prisma.review.create({
      data: {
        authorId,
        rating: data.rating,
        comment: data.comment ?? null,
        refTable: data.refTable,
        refId: data.refId,
      },
    });
  }

  findExisting(authorId: string, refTable: string, refId: string) {
    return prisma.review.findFirst({ where: { authorId, refTable, refId } });
  }

  async summary(refTable: string, refId: string) {
    const [agg, recent] = await Promise.all([
      prisma.review.aggregate({
        where: { refTable, refId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.review.findMany({
        where: { refTable, refId, comment: { not: null } },
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
