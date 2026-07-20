import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { InviteCaregiverSchema } from './schema';
import { CareLinkService } from './service';
import { CareLinkRepository } from './repository';
import { notificationService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();
const service = new CareLinkService(new CareLinkRepository(), notificationService);

// Vue combinée : mes aidants + les comptes que je gère.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.listMine(req.user!.userId) });
}));

// Le patient invite un accompagnant par téléphone.
router.post('/', requireAuth, requireRole(UserRole.PATIENT), validate(InviteCaregiverSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.invite(req.user!.userId, req.body.caregiverPhone) });
}));

// L'accompagnant accepte une invitation.
router.patch('/:id/accept', requireAuth, requireRole(UserRole.ACCOMPAGNANT), asyncHandler(async (req, res) => {
  res.json({ data: await service.accept(req.params.id, req.user!.userId) });
}));

// Patient ou accompagnant rompt le lien.
router.patch('/:id/revoke', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.revoke(req.params.id, req.user!.userId) });
}));

// L'accompagnant consulte les commandes d'un patient qu'il gère.
router.get('/patients/:patientId/orders', requireAuth, requireRole(UserRole.ACCOMPAGNANT), asyncHandler(async (req, res) => {
  res.json({ data: await service.patientOrders(req.user!.userId, req.params.patientId) });
}));

export { router as careLinksRouter };
