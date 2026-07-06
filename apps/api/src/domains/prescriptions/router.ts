import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreatePrescriptionSchema, IssuePrescriptionSchema, ValidatePrescriptionSchema } from './schema';
import { PrescriptionService } from './service';
import { PrescriptionRepository } from './repository';
import { OrderRepository } from '../orders/repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { notificationService, pushService } from '../../infrastructure/container';
import { upload } from '../../infrastructure/upload';
import { UserRole } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { HTTP } from '../../lib/errors';

const router: Router = Router();
const repo    = new PrescriptionRepository();
const service = new PrescriptionService(
  repo,
  new OrderRepository(),
  new DeliveryRepository(),
  new PricingRepository(),
  notificationService,
  pushService,
);

// Patient : liste ses ordonnances
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

// Patient : upload une ordonnance (multipart)
router.post(
  '/',
  requireAuth,
  requireRole(UserRole.PATIENT),
  upload.single('scan'),
  asyncHandler(async (req, res) => {
    const input = CreatePrescriptionSchema.parse(
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body,
    );
    res.status(201).json(await service.create(req.user!.userId, input, req.file));
  }),
);

// Patient : voir une ordonnance
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id, req.user!.userId));
}));

// Pharmacien : voir les ordonnances en attente de son officine
router.get('/partner/inbox', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await prisma.partnerProfile.findFirst({
    where: { staff: { some: { id: req.user!.userId } } },
  });
  if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
  res.json(await service.listForPartner(partner.id));
}));

// Pharmacien : voir le détail d'une ordonnance de son officine
router.get('/partner/:id', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await prisma.partnerProfile.findFirst({
    where: { staff: { some: { id: req.user!.userId } } },
  });
  if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
  const rx = await repo.findWithMedia(req.params.id);
  if (!rx) throw HTTP.notFound('Ordonnance introuvable');
  const isOwned      = rx.targetPartnerId === partner.id;
  const isTeleconsult = rx.targetPartnerId === null && (rx as any).source === 'teleconsultation';
  if (!isOwned && !isTeleconsult) throw HTTP.forbidden();
  res.json(rx);
}));

// Pharmacien : valide (+ crée la commande) ou refuse
router.patch(
  '/:id/validate',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF),
  validate(ValidatePrescriptionSchema),
  asyncHandler(async (req, res) => {
    const partner = await prisma.partnerProfile.findFirst({
      where: { staff: { some: { id: req.user!.userId } } },
    });
    if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
    res.json(await service.validate(req.params.id, req.user!.userId, partner.id, req.body));
  }),
);

// Médecin : émet une ordonnance numérique post-téléconsultation
router.post(
  '/issue',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(IssuePrescriptionSchema),
  asyncHandler(async (_req, res) => {
    res.status(501).json({ message: 'Implémenté lors de la tranche téléconsultation' });
  }),
);

export { router as prescriptionsRouter };
