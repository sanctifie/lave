import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { InitEscrowSchema } from './schema';
import { PaymentService } from './service';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { UserRole } from '@mbolo/shared';

const router = Router();

// Le provider réel sera injecté au démarrage (étape 4)
// Pour l'instant on lève une erreur propre si utilisé sans provider branché
function notImplementedProvider(): never {
  throw new Error('PaymentProvider non configuré');
}

const stubProvider = { initEscrow: notImplementedProvider, captureEscrow: notImplementedProvider, releaseEscrow: notImplementedProvider, payout: notImplementedProvider };
const service = new PaymentService(new PaymentRepository(), new OrderRepository(), stubProvider);

router.post('/escrow', requireAuth, requireRole(UserRole.PATIENT), validate(InitEscrowSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.initEscrow(req.user!.userId, req.body));
}));

export { router as paymentsRouter };
