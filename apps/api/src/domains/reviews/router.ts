import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateReviewSchema, SummaryQuerySchema } from './schema';
import { ReviewService } from './service';
import { ReviewRepository } from './repository';
import { aiProvider } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();
const service = new ReviewService(new ReviewRepository(), aiProvider);

// Résumé public (note moyenne + avis récents) d'une pharmacie / médecin / coursier.
router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const { refTable, refId } = SummaryQuerySchema.parse(req.query);
  res.json({ data: await service.summary(refTable, refId) });
}));

// Le patient note un service qu'il a réellement utilisé.
router.post('/', requireAuth, validate(CreateReviewSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.create(req.user!.userId, req.body) });
}));

// Admin : file de modération des avis signalés par l'IA.
router.get('/flagged', requireAuth, requireRole(UserRole.ADMIN), asyncHandler(async (_req, res) => {
  res.json({ data: await service.listFlagged() });
}));

// Admin : approuver (lever le flag) ou supprimer un avis signalé.
router.patch('/:id/moderate', requireAuth, requireRole(UserRole.ADMIN), asyncHandler(async (req, res) => {
  const action = req.body?.action === 'remove' ? 'remove' : 'approve';
  res.json({ data: await service.moderate(req.params.id, action) });
}));

export { router as reviewsRouter };
