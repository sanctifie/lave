import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateReviewSchema, SummaryQuerySchema } from './schema';
import { ReviewService } from './service';
import { ReviewRepository } from './repository';

const router: Router = Router();
const service = new ReviewService(new ReviewRepository());

// Résumé public (note moyenne + avis récents) d'une pharmacie / médecin / coursier.
router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const { refTable, refId } = SummaryQuerySchema.parse(req.query);
  res.json({ data: await service.summary(refTable, refId) });
}));

// Le patient note un service qu'il a réellement utilisé.
router.post('/', requireAuth, validate(CreateReviewSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.create(req.user!.userId, req.body) });
}));

export { router as reviewsRouter };
