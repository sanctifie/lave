import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateRideRequestSchema, UpdateRideStatusSchema } from './schema';
import { RideService } from './service';
import { RideRepository } from './repository';
import { PricingRepository } from '../pricing/repository';
import { PaymentService } from '../payments/service';
import { PaymentRepository } from '../payments/repository';
import { OrderRepository } from '../orders/repository';
import { notificationService, paymentProvider, pushService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router = Router();
const paymentService = new PaymentService(
  new PaymentRepository(),
  new OrderRepository(),
  new PricingRepository(),
  paymentProvider,
  pushService,
);
const service = new RideService(
  new RideRepository(),
  new PricingRepository(),
  notificationService,
  paymentService,
);

router.post(
  '/',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(CreateRideRequestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.requestRide(req.user!.userId, req.body) });
  }),
);

router.get(
  '/mine',
  requireAuth,
  requireRole(UserRole.PATIENT),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listMine(req.user!.userId) });
  }),
);

router.get(
  '/available',
  requireAuth,
  requireRole(UserRole.COURIER),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listAvailable() });
  }),
);

router.get(
  '/courier/mine',
  requireAuth,
  requireRole(UserRole.COURIER),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listForCourier(req.user!.userId) });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getById(req.params.id) });
  }),
);

router.patch(
  '/:id/accept',
  requireAuth,
  requireRole(UserRole.COURIER),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.acceptRide(req.params.id, req.user!.userId) });
  }),
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(UserRole.COURIER),
  validate(UpdateRideStatusSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateStatus(req.params.id, req.user!.userId, req.body.status) });
  }),
);

export { router as ridesRouter };
