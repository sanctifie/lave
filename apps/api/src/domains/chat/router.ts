import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { GetOrCreateConversationSchema, SendMessageSchema } from './schema';
import { ChatService } from './service';
import { ChatRepository } from './repository';

const router = Router();
const service = new ChatService(new ChatRepository());

// Crée ou récupère une conversation via refTable + refId
router.post(
  '/conversations',
  requireAuth,
  validate(GetOrCreateConversationSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getOrCreate(req.body, req.user!.userId, req.user!.role) });
  }),
);

// Liste les messages (polling ou chargement initial)
router.get(
  '/conversations/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const after = req.query.after as string | undefined;
    res.json({ data: await service.listMessages(req.params.id, req.user!.userId, req.user!.role, after) });
  }),
);

// Envoie un message
router.post(
  '/conversations/:id/messages',
  requireAuth,
  validate(SendMessageSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({
      data: await service.send(req.params.id, req.user!.userId, req.user!.role, req.body),
    });
  }),
);

export { router as chatRouter };
