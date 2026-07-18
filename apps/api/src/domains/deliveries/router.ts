import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { HTTP } from '../../lib/errors';
import { asyncHandler } from '../../lib/asyncHandler';
import { UpdateDeliveryStatusSchema, HandoverSchema } from './schema';
import { DeliveryService } from './service';
import { DeliveryRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PaymentRepository } from '../payments/repository';
import { PricingRepository } from '../pricing/repository';
import { PaymentService } from '../payments/service';
import { notificationService, paymentProvider, pushService } from '../../infrastructure/container';
import { UserRole, DeliveryStatus } from '@mbolo/shared';

const router: Router = Router();
const paymentService = new PaymentService(
  new PaymentRepository(),
  new OrderRepository(),
  new PricingRepository(),
  paymentProvider,
  pushService,
);
const service = new DeliveryService(
  new DeliveryRepository(),
  new OrderRepository(),
  new PaymentRepository(),
  notificationService,
  paymentProvider,
  new PricingRepository(),
  paymentService,
  pushService,
);

// Courier : liste combinée (mes livraisons + disponibles)
router.get('/', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json({ data: await service.listAll(req.user!.userId) });
}));

// Courier : disponibilité actuelle
router.get('/me/availability', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json({ data: await service.getCourierAvailability(req.user!.userId) });
}));

// Courier : toggle disponibilité
router.patch('/me/availability', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  const { isAvailable } = req.body ?? {};
  if (typeof isAvailable !== 'boolean') throw HTTP.unprocessable('isAvailable doit être un booléen');
  res.json({ data: await service.setCourierAvailability(req.user!.userId, isAvailable) });
}));

// Courier : accepter une livraison disponible
router.patch('/:id/accept', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json({ data: await service.acceptDelivery(req.params.id, req.user!.userId) });
}));

// Courier : avancer le statut (sans GPS)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(UserRole.COURIER),
  validate(UpdateDeliveryStatusSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateDeliveryStatus(req.params.id, req.user!.userId, req.body.status as DeliveryStatus) });
  }),
);

// Courier : liste les livraisons disponibles (legacy)
router.get('/pending', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (_req, res) => {
  res.json(await service.listPending());
}));

// Courier : mes livraisons (legacy)
router.get('/mine', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

// Détail d'une livraison (patient destinataire ou coursier uniquement)
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id, { userId: req.user!.userId, role: req.user!.role }));
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

// Patient : confirme la réception avec le code de remise → déclenche escrow release.
// Rate-limité : le code fait 6 chiffres, on bloque le brute-force par utilisateur.
router.post(
  '/:id/handover',
  requireAuth,
  rateLimit({ prefix: 'handover', windowSec: 900, max: 10, key: (req) => (req as any).user?.userId ?? req.ip ?? 'unknown' }),
  validate(HandoverSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.confirmHandover(req.params.id, req.body.code, req.user!.userId));
  }),
);

export { router as deliveriesRouter };
