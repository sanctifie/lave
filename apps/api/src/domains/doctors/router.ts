import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { RegisterDoctorSchema, UpdateAvailabilitySchema } from './schema';
import { DoctorService } from './service';
import { DoctorRepository } from './repository';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new DoctorService(new DoctorRepository());

router.get('/', requireAuth, asyncHandler(async (_req, res) => {
  res.json(await service.list());
}));

router.get('/available', requireAuth, asyncHandler(async (_req, res) => {
  res.json(await service.listAvailableNow());
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
}));

router.post('/register', requireAuth, requireRole(UserRole.DOCTOR), validate(RegisterDoctorSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.register(req.user!.userId, req.body));
}));

router.patch('/me/availability', requireAuth, requireRole(UserRole.DOCTOR), validate(UpdateAvailabilitySchema), asyncHandler(async (req, res) => {
  res.json(await service.setAvailability(req.user!.userId, req.body.isAvailableNow));
}));

export { router as doctorsRouter };
