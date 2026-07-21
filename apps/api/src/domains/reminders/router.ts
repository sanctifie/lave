import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateReminderSchema, ParsePosologySchema } from './schema';
import { ReminderService } from './service';
import { ReminderRepository } from './repository';
import { aiProvider } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();
const service = new ReminderService(new ReminderRepository(), aiProvider);

// Patient : ses rappels actifs (source de vérité serveur, survit au changement de tel).
router.get('/', requireAuth, requireRole(UserRole.PATIENT), asyncHandler(async (req, res) => {
  res.json({ data: await service.listMine(req.user!.userId) });
}));

// Patient : crée un rappel.
router.post('/', requireAuth, requireRole(UserRole.PATIENT), validate(CreateReminderSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.create(req.user!.userId, req.body) });
}));

// Patient : lecture IA d'une posologie en texte libre → horaires proposés.
router.post('/parse', requireAuth, requireRole(UserRole.PATIENT), validate(ParsePosologySchema), asyncHandler(async (req, res) => {
  res.json({ data: await service.parsePosology(req.body.instructions) });
}));

// Patient : désactive un rappel.
router.delete('/:id', requireAuth, requireRole(UserRole.PATIENT), asyncHandler(async (req, res) => {
  res.json({ data: await service.remove(req.params.id, req.user!.userId) });
}));

export { router as remindersRouter };
