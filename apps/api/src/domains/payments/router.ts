import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { InitEscrowSchema, InitConsultationPaymentSchema, MyPVITWebhookSchema } from './schema';
import { PaymentService } from './service';
import { PaymentRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { PricingRepository } from '../pricing/repository';
import { paymentProvider, pushService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new PaymentService(
  new PaymentRepository(),
  new OrderRepository(),
  new PricingRepository(),
  paymentProvider,
  pushService,
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

// ─── Webhook MyPVIT ───────────────────────────────────────────────────────────
// Pas d'auth JWT — MyPVIT appelle cette route directement.
// Réponse obligatoire : { transactionId, responseCode } — cf. docs MyPVIT section 3.

router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const parsed = MyPVITWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      // Répondre 200 quand même pour éviter les retries MyPVIT sur payload inconnu
      res.json({ error: 'payload_invalide' });
      return;
    }
    const echo = await service.handleWebhook(parsed.data);
    res.json(echo);
  }),
);

export { router as paymentsRouter };
