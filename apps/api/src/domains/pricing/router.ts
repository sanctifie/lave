import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { UpsertPricingSchema } from './schema';
import { PricingService } from './service';
import { PricingRepository } from './repository';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new PricingService(new PricingRepository());

router.get('/', requireAuth, requireRole(UserRole.ADMIN), asyncHandler(async (_req, res) => {
  res.json(await service.getAll());
}));

router.put('/', requireAuth, requireRole(UserRole.ADMIN), validate(UpsertPricingSchema), asyncHandler(async (req, res) => {
  res.json(await service.upsert(req.body, req.user!.userId));
}));

export { router as pricingRouter };
