import { HTTP } from '../../lib/errors';
import { RideRepository } from './repository';
import { PricingRepository } from '../pricing/repository';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PushService } from '../../infrastructure/push/service';
import { PricingKind } from '@mbolo/shared';
import { CreateRideRequestInput } from './schema';
import { prisma } from '../../infrastructure/prisma/client';
import type { PaymentService } from '../payments/service';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class RideService {
  constructor(
    private readonly repo: RideRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly notif: NotificationService,
    private readonly paymentService?: PaymentService,
    private readonly push?: PushService,
  ) {}

  /** Calcule la distance, le tarif estimé et les paramètres tarifaires courants. */
  async estimateFare(originLat: number, originLng: number, destLat: number, destLng: number) {
    const [baseEntry, perKmEntry] = await Promise.all([
      this.pricingRepo.getByKind(PricingKind.RIDE_BASE_FEE),
      this.pricingRepo.getByKind(PricingKind.RIDE_PER_KM),
    ]);

    const baseFee = baseEntry?.valueFcfa ?? 1500;
    const perKm = perKmEntry?.valueFcfa ?? 200;
    // On arrondit la distance AVANT de calculer le tarif pour que le montant
    // facturé corresponde exactement à la distance affichée au patient.
    const distanceKm = Math.round(haversineKm(originLat, originLng, destLat, destLng) * 100) / 100;
    const fareEstFcfa = Math.ceil(baseFee + distanceKm * perKm);

    return {
      distanceKm,
      fareEstFcfa,
      baseFee,
      perKm,
    };
  }

  async requestRide(patientId: string, input: CreateRideRequestInput) {
    const { distanceKm, fareEstFcfa } = await this.estimateFare(
      input.originLat, input.originLng, input.destLat, input.destLng,
    );

    return this.repo.createWithDelivery(patientId, {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      fareEstFcfa,
      distanceKm,
    });
  }

  async listMine(patientId: string) {
    return this.repo.listForPatient(patientId);
  }

  async getById(id: string) {
    const ride = await this.repo.findById(id);
    if (!ride) throw HTTP.notFound('Course introuvable');
    return ride;
  }

  async listAvailable() {
    return this.repo.listPending();
  }

  async listForCourier(courierUserId: string) {
    const courier = await prisma.courier.findUnique({ where: { userId: courierUserId } });
    if (!courier) return [];
    return this.repo.listForCourier(courier.id);
  }

  async acceptRide(rideId: string, courierUserId: string) {
    const ride = await this.repo.findById(rideId);
    if (!ride) throw HTTP.notFound('Course introuvable');
    if ((ride.status as string) !== 'pending') throw HTTP.conflict('Course déjà prise en charge');

    const updated = await this.repo.acceptRide(rideId, courierUserId);

    const patient = await prisma.user.findUnique({
      where: { id: ride.request.patientId },
      select: { phone: true },
    });
    if (patient) {
      await this.notif.send({
        to: patient.phone,
        message: `Un chauffeur a accepté votre demande de transport. Il est en route vers vous.`,
      });
    }

    return updated;
  }

  async updateStatus(rideId: string, courierUserId: string, status: string) {
    const ride = await this.repo.findById(rideId);
    if (!ride) throw HTTP.notFound('Course introuvable');

    const courier = await prisma.courier.findUnique({ where: { userId: courierUserId } });
    if (!courier || ride.courierId !== courier.id) throw HTTP.forbidden();

    const updated = await this.repo.updateStatus(rideId, status);
    const patientId = ride.request.patientId;

    if (status === 'arrived' && this.push) {
      this.push.sendToUser(patientId, {
        title: '🚗 Chauffeur arrivé',
        body:  'Votre chauffeur vous attend au point de départ.',
        data:  { type: 'ride_arrived', rideId },
      });
    }

    if (status === 'completed') {
      if (this.push) {
        this.push.sendToUser(patientId, {
          title: '✅ Course terminée',
          body:  'Votre course est terminée. Merci d\'avoir utilisé MBOLO.',
          data:  { type: 'ride_completed', rideId },
        });
      }
      if (this.paymentService) {
        this.paymentService.releaseRideEscrow(rideId).catch((e) =>
          console.error('[RideService] escrow release failed', e),
        );
      }
    }

    return updated;
  }
}
