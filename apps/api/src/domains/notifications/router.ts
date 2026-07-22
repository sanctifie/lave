import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../lib/asyncHandler';
import { NotificationService } from './service';
import { NotificationRepository } from './repository';

const router: Router = Router();
const service = new NotificationService(new NotificationRepository());

// Ma cloche : 50 dernières notifications.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.listMine(req.user!.userId) });
}));

// Compteur de non-lues (pour la pastille).
router.get('/unread-count', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: { count: await service.unreadCount(req.user!.userId) } });
}));

// Tout marquer comme lu (avant /:id pour éviter le conflit de route).
router.patch('/read-all', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.markAllRead(req.user!.userId) });
}));

// Marquer une notification comme lue.
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.markRead(req.params.id, req.user!.userId) });
}));

export { router as notificationsRouter };
