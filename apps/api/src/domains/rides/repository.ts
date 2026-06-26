import { prisma } from '../../infrastructure/prisma/client';

const RIDE_INCLUDE = {
  request: true,
  delivery: {
    include: {
      tracking: { orderBy: { recordedAt: 'desc' as const }, take: 10 },
      courier: { include: { user: { select: { name: true, phone: true } } } },
    },
  },
} as const;

export class RideRepository {
  async createWithDelivery(patientId: string, data: {
    type: string;
    originLat: number; originLng: number; originLandmark: string;
    destLat: number; destLng: number; destLandmark: string;
    scheduledAt?: Date;
    notes?: string;
    fareEstFcfa: number;
    distanceKm: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.rideRequest.create({
        data: {
          patientId,
          type: data.type as any,
          originLat: data.originLat,
          originLng: data.originLng,
          originLandmark: data.originLandmark,
          destLat: data.destLat,
          destLng: data.destLng,
          destLandmark: data.destLandmark,
          scheduledAt: data.scheduledAt,
          notes: data.notes,
        },
      });

      const ride = await tx.ride.create({
        data: { requestId: request.id, fareEstFcfa: data.fareEstFcfa },
      });

      await tx.delivery.create({
        data: {
          rideId: ride.id,
          feeFcfa: data.fareEstFcfa,
          distanceKm: data.distanceKm,
        },
      });

      return tx.ride.findUnique({ where: { id: ride.id }, include: RIDE_INCLUDE });
    });
  }

  async findById(id: string) {
    return prisma.ride.findUnique({ where: { id }, include: RIDE_INCLUDE });
  }

  async listForPatient(patientId: string) {
    return prisma.rideRequest.findMany({
      where: { patientId },
      include: {
        ride: { include: { delivery: { select: { status: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPending() {
    return prisma.ride.findMany({
      where: { status: 'pending' as any },
      include: RIDE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForCourier(courierId: string) {
    return prisma.ride.findMany({
      where: { courierId },
      include: RIDE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptRide(rideId: string, courierUserId: string) {
    return prisma.$transaction(async (tx) => {
      const courier = await tx.courier.upsert({
        where: { userId: courierUserId },
        update: {},
        create: { userId: courierUserId },
      });

      await tx.ride.update({
        where: { id: rideId },
        data: { courierId: courier.id, status: 'assigned' as any },
      });

      await tx.delivery.updateMany({
        where: { rideId },
        data: { courierId: courier.id, status: 'assigned', assignedAt: new Date() },
      });

      return tx.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
    });
  }

  async updateStatus(rideId: string, status: string) {
    const data: Record<string, unknown> = { status };
    if (status === 'en_route') data.startedAt = new Date();
    if (status === 'completed') data.endedAt = new Date();
    return prisma.ride.update({ where: { id: rideId }, data, include: RIDE_INCLUDE });
  }
}
