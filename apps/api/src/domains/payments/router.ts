import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { InitEscrowSchema } from './schema';
import { PaymentService } from './service';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { paymentProvider } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new PaymentService(new PaymentRepository(), new OrderRepository(), paymentProvider);

// Patient : initie l'escrow après validation pharmacien
router.post(
  '/escrow',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(InitEscrowSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.initEscrow(req.user!.userId, req.body));
  }),
);

export { router as paymentsRouter };
