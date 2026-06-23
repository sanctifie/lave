import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { UpdateDeliveryStatusSchema, HandoverSchema } from './schema';
import { DeliveryService } from './service';
import { DeliveryRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PaymentRepository } from '../payments/repository';
import { notificationService, paymentProvider } from '../../infrastructure/container';
import { UserRole, DeliveryStatus } from '@mbolo/shared';

const router = Router();
const service = new DeliveryService(
  new DeliveryRepository(),
  new OrderRepository(),
  new PaymentRepository(),
  notificationService,
  paymentProvider,
);

// Courier : liste les livraisons disponibles
router.get('/pending', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (_req, res) => {
  res.json(await service.listPending());
}));

// Courier : mes livraisons
router.get('/mine', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

// Détail d'une livraison
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
}));

// Courier : s'auto-assigne une livraison
router.patch('/:id/assign', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json(await service.assign(req.params.id, req.user!.userId));
}));

// Courier : met à jour position + statut
router.patch(
  '/:id/position',
  requireAuth,
  requireRole(UserRole.COURIER),
  validate(UpdateDeliveryStatusSchema),
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.query as Record<string, string>;
    if (!lat || !lng) throw new Error('lat et lng requis en query params');
    res.json(
      await service.updatePosition(
        req.params.id,
        req.user!.userId,
        req.body.status as DeliveryStatus,
        parseFloat(lat),
        parseFloat(lng),
      ),
    );
  }),
);

// Patient : confirme la réception avec le code de remise → déclenche escrow release
router.post(
  '/:id/handover',
  requireAuth,
  validate(HandoverSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.confirmHandover(req.params.id, req.body.code));
  }),
);

export { router as deliveriesRouter };
