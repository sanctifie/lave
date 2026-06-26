import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { RequestOtpSchema, VerifyOtpSchema } from './schema';
import { AuthService } from './service';
import { AuthRepository } from './repository';

const router = Router();
const service = new AuthService(new AuthRepository());

// POST /auth/otp/request
router.post(
  '/otp/request',
  validate(RequestOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await service.requestOtp(req.body.phone);
    res.json(result);
  }),
);

// POST /auth/otp/verify
router.post(
  '/otp/verify',
  validate(VerifyOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await service.verifyOtp(req.body.phone, req.body.code);
    res.json(result);
  }),
);

export { router as authRouter };
