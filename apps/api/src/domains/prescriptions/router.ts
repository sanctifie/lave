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
import { createHmac } from 'crypto';
import QRCode from 'qrcode';

/** Signature courte anti-falsification du QR (dérivée du secret serveur). */
function rxSig(id: string): string {
  return createHmac('sha256', process.env.JWT_SECRET ?? 'dev').update(`rx:${id}`).digest('hex').slice(0, 16);
}

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

// Patient : QR de son ordonnance (PNG) — à montrer en pharmacie pour vérification
router.get('/:id/qr', requireAuth, asyncHandler(async (req, res) => {
  const rx = await prisma.prescription.findUnique({ where: { id: req.params.id }, select: { patientId: true } });
  if (!rx) throw HTTP.notFound('Ordonnance introuvable');
  if (rx.patientId !== req.user!.userId) throw HTTP.forbidden();
  const payload = `MBOLO-RX:${req.params.id}:${rxSig(req.params.id)}`;
  const png = await QRCode.toBuffer(payload, { width: 480, margin: 1 });
  res.setHeader('Content-Type', 'image/png');
  res.send(png);
}));

// Pharmacien : vérifie un QR scanné — statut de clôture de l'ordonnance
// (équivalent MBOLO du téléservice e-prescription : servie ? stupéfiant déjà servi ?)
router.get('/verify/:id', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  if (req.query.sig !== rxSig(req.params.id)) throw HTTP.forbidden('QR invalide ou falsifié');
  const rx = await prisma.prescription.findUnique({
    where: { id: req.params.id },
    select: {
      status: true, createdAt: true, dispensedAt: true, dispensedByName: true,
      controlledNote: true, targetPartner: { select: { legalName: true } },
    },
  });
  if (!rx) throw HTTP.notFound('Ordonnance inconnue de MBOLO');
  res.json({
    data: {
      status: rx.status,
      createdAt: rx.createdAt,
      dispensedAt: rx.dispensedAt,
      dispensedByName: rx.dispensedByName,
      controlledServed: !!rx.controlledNote,
      controlledNote: rx.controlledNote,
      pharmacyName: rx.targetPartner?.legalName ?? null,
    },
  });
}));

// Patient : renouvelle une ordonnance déjà validée (traitement chronique)
router.post(
  '/:id/renew',
  requireAuth,
  requireRole(UserRole.PATIENT),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.renew(req.params.id, req.user!.userId));
  }),
);

// Pharmacien : ordonnancier légal (registre des stupéfiants dispensés)
router.get('/partner/register', requireAuth, requireRole(UserRole.PARTNER_STAFF), asyncHandler(async (req, res) => {
  const partner = await prisma.partnerProfile.findFirst({
    where: { staff: { some: { id: req.user!.userId } } },
  });
  if (!partner) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
  res.json({ data: await repo.listDispensingRecords(partner.id) });
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
