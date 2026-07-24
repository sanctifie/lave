import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { PharmacyActionSchema, SubstitutionDecisionSchema, RecommendationDecisionSchema, ChoosePaymentMethodSchema } from './schema';
import { OrderService } from './service';
import { OrderRepository } from './repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { PaymentRepository } from '../payments/repository';
import { PaymentService } from '../payments/service';
import { notificationService, paymentProvider, pushService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { HTTP } from '../../lib/errors';

const router: Router = Router();
const paymentService = new PaymentService(
  new PaymentRepository(),
  new OrderRepository(),
  new PricingRepository(),
  paymentProvider,
  pushService,
);
const service = new OrderService(
  new OrderRepository(),
  notificationService,
  new DeliveryRepository(),
  new PricingRepository(),
  pushService,
  paymentService,
);

// Patient : liste ses commandes
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.listMine(req.user!.userId));
}));

// Pharmacien : liste les commandes de son officine (avant /:id pour éviter le conflit)
router.get('/partner/list', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await prisma.partnerProfile.findFirst({
    where: { staff: { some: { id: req.user!.userId } } },
  });
  if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
  res.json(await service.listForPartner(partner.id));
}));

// Pharmacien : tableau de bord business / encaissements / bordereau CNAMGS
async function resolvePartner(userId: string) {
  const partner = await prisma.partnerProfile.findFirst({ where: { staff: { some: { id: userId } } } });
  if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
  return partner;
}

router.get('/partner/stats', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await resolvePartner(req.user!.userId);
  res.json(await service.statsForPartner(partner.id));
}));

router.get('/partner/earnings', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await resolvePartner(req.user!.userId);
  res.json(await service.earningsForPartner(partner.id));
}));

router.get('/partner/insurance-claims', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await resolvePartner(req.user!.userId);
  res.json(await service.insuranceClaimsForPartner(partner.id));
}));

// Patient : détail d'une commande
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id, req.user!.userId));
}));

// Patient : accepte / refuse les équivalents proposés par le pharmacien
router.patch(
  '/:id/substitution-decision',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(SubstitutionDecisionSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.decideSubstitution(req.params.id, req.user!.userId, req.body));
  }),
);

// Patient : ajoute / écarte les conseils officinaux proposés par le pharmacien
router.patch(
  '/:id/recommendation-decision',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(RecommendationDecisionSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.decideRecommendation(req.params.id, req.user!.userId, req.body));
  }),
);

// Patient : choisit le mode de paiement (Mobile Money séquestre ou espèces COD)
router.patch(
  '/:id/payment-method',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validate(ChoosePaymentMethodSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.choosePaymentMethod(req.params.id, req.user!.userId, req.body.method) });
  }),
);

// Coursier — étape 1 : original récupéré CHEZ LE PATIENT (course stupéfiant)
router.patch(
  '/:id/paper-collected',
  requireAuth,
  requireRole(UserRole.COURIER),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { delivery: { select: { courierId: true } } },
    });
    if (!order) throw HTTP.notFound('Commande introuvable');
    if ((order as any).paperStatus !== 'to_collect') throw HTTP.unprocessable('Aucun original à récupérer');
    const courier = await prisma.courier.findUnique({ where: { userId: req.user!.userId } });
    if (!courier || order.delivery?.courierId !== courier.id) throw HTTP.forbidden();
    const updated = await prisma.order.update({ where: { id: order.id }, data: { paperStatus: 'collected' } });
    res.json({ data: { paperStatus: updated.paperStatus } });
  }),
);

// Pharmacien — étape 2 : original vérifié en main, mention manuscrite apposée,
// scellé au colis. Sans cette étape, la remise au patient reste verrouillée.
router.patch(
  '/:id/paper-verified',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF),
  asyncHandler(async (req, res) => {
    const partner = await prisma.partnerProfile.findFirst({
      where: { staff: { some: { id: req.user!.userId } } },
    });
    if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.partnerId !== partner.id) throw HTTP.notFound('Commande introuvable');
    if ((order as any).paperStatus !== 'collected') throw HTTP.unprocessable('Original non encore déposé par le coursier');
    const updated = await prisma.order.update({ where: { id: order.id }, data: { paperStatus: 'verified' } });
    res.json({ data: { paperStatus: updated.paperStatus } });
  }),
);

// Pharmacien : action sur une commande (prepare / ready / reject)
router.patch(
  '/:id/pharmacy-action',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF),
  validate(PharmacyActionSchema),
  asyncHandler(async (req, res) => {
    const partner = await prisma.partnerProfile.findFirst({
      where: { staff: { some: { id: req.user!.userId } } },
    });
    if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
    res.json(await service.partnerAction(req.params.id, partner.id, req.body));
  }),
);

export { router as ordersRouter };
