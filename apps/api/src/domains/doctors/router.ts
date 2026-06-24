import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { RegisterDoctorSchema, UpdateAvailabilitySchema } from './schema';
import { DoctorService } from './service';
import { DoctorRepository } from './repository';
import { UserRole } from '@mbolo/shared';

const router  = Router();
const service = new DoctorService(new DoctorRepository());

/** Liste tous les médecins vérifiés, filtrable par spécialité et disponibilité */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const specialty    = typeof req.query.specialty    === 'string' ? req.query.specialty    : undefined;
  const availableNow = req.query.availableNow === 'true';
  const list = await service.list({ specialty, availableNow });
  res.json({ data: list });
}));

/** Créneaux disponibles pour un médecin à une date donnée */
router.get('/:id/slots', requireAuth, asyncHandler(async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
  const slots = await service.getSlots(req.params.id, date);
  res.json({ data: slots });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.getById(req.params.id) });
}));

router.post(
  '/register',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(RegisterDoctorSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.register(req.user!.userId, req.body) });
  }),
);

router.patch(
  '/me/availability',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(UpdateAvailabilitySchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.setAvailability(req.user!.userId, req.body.isAvailableNow) });
  }),
);

export { router as doctorsRouter };
