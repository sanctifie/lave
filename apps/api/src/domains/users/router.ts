import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { UpdateMeSchema, SavePushTokenSchema } from './schema';
import { UserService } from './service';
import { UserRepository } from './repository';

const router = Router();
const service = new UserService(new UserRepository());

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getMe(req.user!.userId));
}));

router.patch('/me', requireAuth, validate(UpdateMeSchema), asyncHandler(async (req, res) => {
  res.json({ data: await service.updateMe(req.user!.userId, req.body) });
}));

router.post('/me/push-token', requireAuth, validate(SavePushTokenSchema), asyncHandler(async (req, res) => {
  await service.savePushToken(req.user!.userId, req.body);
  res.json({ data: { saved: true } });
}));

export { router as usersRouter };
