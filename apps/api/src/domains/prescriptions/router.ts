import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreatePrescriptionSchema, ValidatePrescriptionSchema, IssuePrescriptionSchema } from './schema';
import { PrescriptionService } from './service';
import { PrescriptionRepository } from './repository';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new PrescriptionService(new PrescriptionRepository());

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id, req.user!.userId));
}));

router.post('/', requireAuth, validate(CreatePrescriptionSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.user!.userId, req.body));
}));

// Pharmacien valide l'ordonnance (contrainte légale)
router.patch('/:id/validate', requireAuth, requireRole(UserRole.PARTNER_STAFF), validate(ValidatePrescriptionSchema), asyncHandler(async (req, res) => {
  res.json(await service.validate(req.params.id, req.user!.userId, req.body));
}));

// Médecin émet une ordonnance numérique post-téléconsultation
router.post('/issue', requireAuth, requireRole(UserRole.DOCTOR), validate(IssuePrescriptionSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.issueFromConsultation(req.user!.userId, req.body));
}));

export { router as prescriptionsRouter };
