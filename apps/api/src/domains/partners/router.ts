import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreatePartnerSchema, ListPartnersSchema } from './schema';
import { PartnerService } from './service';
import { PartnerRepository } from './repository';
import { UserRole, PartnerType } from '@mbolo/shared';

const router = Router();
const service = new PartnerService(new PartnerRepository());

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { type } = ListPartnersSchema.parse(req.query);
  const list = await service.list(type as PartnerType | undefined);
  res.json({ data: list });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.getById(req.params.id) });
}));

router.post('/', requireAuth, requireRole(UserRole.ADMIN), validate(CreatePartnerSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.create(req.body) });
}));

export { router as partnersRouter };
