import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { UpdateDeliveryStatusSchema, HandoverSchema } from './schema';
import { DeliveryService } from './service';
import { DeliveryRepository } from './repository';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new DeliveryService(new DeliveryRepository());

router.get('/pending', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (_req, res) => {
  res.json(await service.listPending());
}));

router.get('/mine', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
}));

router.patch('/:id/assign', requireAuth, requireRole(UserRole.COURIER), asyncHandler(async (req, res) => {
  res.json(await service.assign(req.params.id, req.user!.userId));
}));

router.patch('/:id/status', requireAuth, requireRole(UserRole.COURIER), validate(UpdateDeliveryStatusSchema), asyncHandler(async (req, res) => {
  const { lat, lng } = req.query as Record<string, string>;
  res.json(await service.updateStatus(req.params.id, req.body.status, lat ? +lat : undefined, lng ? +lng : undefined));
}));

router.post('/:id/handover', requireAuth, validate(HandoverSchema), asyncHandler(async (req, res) => {
  res.json(await service.confirmHandover(req.params.id, req.body.code));
}));

export { router as deliveriesRouter };
