import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { RegisterDoctorSchema, UpdateAvailabilitySchema, UpdateProfileSchema, UpdateScheduleSchema } from './schema';
import { DoctorService } from './service';
import { DoctorRepository } from './repository';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();
const service = new DoctorService(new DoctorRepository());

/** Spécialités médicales disponibles */
router.get('/specialties', requireAuth, asyncHandler(async (_req, res) => {
  res.json({ data: await service.listSpecialties() });
}));

/** Profil du médecin connecté */
router.get(
  '/me',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getMyProfile(req.user!.userId) });
  }),
);

/** Mise à jour spécialité / tarif / bio */
router.patch(
  '/me/profile',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(UpdateProfileSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateMyProfile(req.user!.userId, req.body) });
  }),
);

/** Remplacement complet du planning hebdomadaire */
router.put(
  '/me/schedule',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(UpdateScheduleSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateSchedule(req.user!.userId, req.body) });
  }),
);

/** Liste tous les médecins vérifiés, filtrable par spécialité et disponibilité */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const specialty    = typeof req.query.specialty    === 'string' ? req.query.specialty    : undefined;
  const availableNow = req.query.availableNow === 'true';
  const list = await service.list({ specialty, availableNow });
  res.json({ data: list });
}));

/** Nombre de médecins libres maintenant — utilisé par le mobile pour activer/désactiver l'option "Immédiat" */
router.get('/available-now/count', requireAuth, asyncHandler(async (req, res) => {
  const specialty = typeof req.query.specialty === 'string' ? req.query.specialty : undefined;
  const count = await service.countAvailableNow(specialty);
  res.json({ data: { count, available: count > 0 } });
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
