import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { PharmacyActionSchema, SubstitutionDecisionSchema, RecommendationDecisionSchema } from './schema';
import { OrderService } from './service';
import { OrderRepository } from './repository';
import { DeliveryRepository } from '../deliveries/repository';
import { PricingRepository } from '../pricing/repository';
import { notificationService, pushService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { HTTP } from '../../lib/errors';

const router: Router = Router();
const service = new OrderService(
  new OrderRepository(),
  notificationService,
  new DeliveryRepository(),
  new PricingRepository(),
  pushService,
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
