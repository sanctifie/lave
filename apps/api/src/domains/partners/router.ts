import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import {
  CreatePartnerSchema,
  ListPartnersSchema,
  CreateProductSchema,
  UpdateProductSchema,
  ListProductsSchema,
  UpdateDutySchema,
} from './schema';
import { PartnerService } from './service';
import { PartnerRepository } from './repository';
import { UserRole, PartnerType } from '@mbolo/shared';

const router: Router = Router();
const service = new PartnerService(new PartnerRepository());

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { type } = ListPartnersSchema.parse(req.query);
  const list = await service.list(type as PartnerType | undefined);
  res.json({ data: list });
}));

// ── Poste de dispensation : catalogue produits (staff pharmacie) ─────────────
// Déclaré avant `/:id` pour éviter la collision de routes.
router.get('/me/products', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const opts = ListProductsSchema.parse(req.query);
  res.json({ data: await service.listProducts(req.user!.userId, opts) });
}));

router.get('/me/products/barcode/:code', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  res.json({ data: await service.findByBarcode(req.user!.userId, req.params.code) });
}));

router.post('/me/products', requireAuth, requireRole(UserRole.PARTNER_STAFF), validate(CreateProductSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.createProduct(req.user!.userId, req.body) });
}));

router.patch('/me/products/:id', requireAuth, requireRole(UserRole.PARTNER_STAFF), validate(UpdateProductSchema), asyncHandler(async (req, res) => {
  res.json({ data: await service.updateProduct(req.user!.userId, req.params.id, req.body) });
}));

router.delete('/me/products/:id', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  res.json({ data: await service.deleteProduct(req.user!.userId, req.params.id) });
}));

// ── Garde & vitrine (staff pharmacie) ───────────────────────────────────────
router.patch('/me/duty', requireAuth, requireRole(UserRole.PARTNER_STAFF), validate(UpdateDutySchema), asyncHandler(async (req, res) => {
  res.json({ data: await service.updateDuty(req.user!.userId, req.body) });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json({ data: await service.getById(req.params.id) });
}));

router.post('/', requireAuth, requireRole(UserRole.ADMIN), validate(CreatePartnerSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.create(req.body) });
}));

export { router as partnersRouter };
