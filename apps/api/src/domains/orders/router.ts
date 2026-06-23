import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateOrderSchema } from './schema';
import { OrderService } from './service';
import { OrderRepository } from './repository';
import { PrescriptionRepository } from '../prescriptions/repository';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new OrderService(new OrderRepository(), new PrescriptionRepository());

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id, req.user!.userId));
}));

router.post('/', requireAuth, requireRole(UserRole.PATIENT), validate(CreateOrderSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.user!.userId, req.body));
}));

export { router as ordersRouter };
