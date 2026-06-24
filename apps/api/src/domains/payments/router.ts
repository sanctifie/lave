import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { InitEscrowSchema, InitConsultationPaymentSchema, MeSombWebhookSchema } from './schema';
import { PaymentService } from './service';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PricingRepository } from '../pricing/repository';
import { paymentProvider } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new PaymentService(
  new PaymentRepository(),
  new OrderRepository(),
  new PricingRepository(),
  paymentProvider,
);

// ─── Commandes ────────────────────────────────────────────────────────────────

router.post(
  '/escrow',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(InitEscrowSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.initEscrow(req.user!.userId, req.body) });
  }),
);

// ─── Téléconsultation ─────────────────────────────────────────────────────────

router.post(
  '/consultation',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(InitConsultationPaymentSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.initConsultationPayment(req.user!.userId, req.body) });
  }),
);

router.get(
  '/consultation/:consultationId/status',
  requireAuth,
  requireRole(UserRole.PATIENT),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getConsultationPaymentStatus(req.user!.userId, req.params.consultationId) });
  }),
);

// ─── Webhook MeSomb (sans auth JWT) ───────────────────────────────────────────

router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const parsed = MeSombWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Payload invalide' });
      return;
    }
    const result = await service.handleWebhook(parsed.data);
    res.json(result);
  }),
);

export { router as paymentsRouter };
