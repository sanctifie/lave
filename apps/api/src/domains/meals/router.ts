import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateMealOrderSchema, CreateMealPlanSchema, UpdateMealPlanItemSchema } from './schema';
import { MealService } from './service';
import { MealRepository } from './repository';
import { PricingRepository } from '../pricing/repository';
import { notificationService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router = Router();
const service = new MealService(
  new MealRepository(),
  new PricingRepository(),
  notificationService,
);

// ─── Menus ────────────────────────────────────────────────────────────────────

router.get(
  '/plans',
  requireAuth,
  asyncHandler(async (req, res) => {
    const partnerId = req.query.partnerId as string | undefined;
    res.json({ data: await service.listPlans(partnerId) });
  }),
);

router.get(
  '/plans/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getPlan(req.params.id) });
  }),
);

router.post(
  '/plans',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF),
  validate(CreateMealPlanSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.createPlan(req.user!.userId, req.body) });
  }),
);

router.patch(
  '/plans/items/:itemId/availability',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF),
  validate(UpdateMealPlanItemSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.toggleItem(req.params.itemId, req.body.isAvailable) });
  }),
);

// ─── Commandes repas ──────────────────────────────────────────────────────────

router.post(
  '/orders',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(CreateMealOrderSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.placeOrder(req.user!.userId, req.body) });
  }),
);

router.get(
  '/orders/mine',
  requireAuth,
  requireRole(UserRole.PATIENT),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listMine(req.user!.userId) });
  }),
);

router.get(
  '/orders/kitchen',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listForKitchen(req.user!.userId) });
  }),
);

router.get(
  '/orders/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getOrder(req.params.id) });
  }),
);

export { router as mealsRouter };
