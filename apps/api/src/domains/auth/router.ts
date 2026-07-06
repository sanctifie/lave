import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { rateLimit } from '../../middleware/rateLimit';
import { asyncHandler } from '../../lib/asyncHandler';
import { RequestOtpSchema, VerifyOtpSchema } from './schema';
import { AuthService } from './service';
import { AuthRepository } from './repository';

const router: Router = Router();
const service = new AuthService(new AuthRepository());

const phoneKey = (req: { body?: { phone?: string } }) => req.body?.phone ?? 'unknown';

// POST /auth/otp/request
// Double limite : par IP (anti-flood) et par numéro (anti-spam SMS ciblé / coût).
router.post(
  '/otp/request',
  rateLimit({ prefix: 'otp_req_ip',    windowSec: 900, max: 10 }),
  rateLimit({ prefix: 'otp_req_phone', windowSec: 900, max: 3, key: phoneKey }),
  validate(RequestOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await service.requestOtp(req.body.phone);
    res.json(result);
  }),
);

// POST /auth/otp/verify
// Limite par IP en complément du compteur d'essais par code (anti-brute-force).
router.post(
  '/otp/verify',
  rateLimit({ prefix: 'otp_verify_ip', windowSec: 900, max: 20 }),
  validate(VerifyOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await service.verifyOtp(req.body.phone, req.body.code);
    res.json(result);
  }),
);

export { router as authRouter };
