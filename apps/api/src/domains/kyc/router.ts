import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../lib/asyncHandler';
import { upload } from '../../infrastructure/upload';
import { HTTP } from '../../lib/errors';
import { KycService, KycType } from './service';
import { aiProvider } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();
const service = new KycService(aiProvider);

const TYPES: KycType[] = ['partner', 'doctor', 'courier'];
function asType(v: string): KycType {
  if (!TYPES.includes(v as KycType)) throw HTTP.unprocessable('Type KYC invalide');
  return v as KycType;
}

// Partenaire / médecin / coursier : dépose un justificatif KYC (multipart).
router.post(
  '/document',
  requireAuth,
  requireRole(UserRole.PARTNER_STAFF, UserRole.DOCTOR, UserRole.COURIER),
  upload.single('document'),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.uploadDocument(req.user!.userId, req.user!.role, req.file) });
  }),
);

// Admin : file des vérifications en attente (avec justificatifs).
router.get('/verifications', requireAuth, requireRole(UserRole.ADMIN), asyncHandler(async (_req, res) => {
  res.json({ data: await service.listPending() });
}));

// Admin : pré-contrôle IA (vision) d'un justificatif.
router.post('/verifications/:type/:id/screen', requireAuth, requireRole(UserRole.ADMIN), asyncHandler(async (req, res) => {
  res.json({ data: await service.screen(asType(req.params.type), req.params.id) });
}));

// Admin : décision finale (verified / rejected).
router.patch('/verifications/:type/:id', requireAuth, requireRole(UserRole.ADMIN), asyncHandler(async (req, res) => {
  const status = req.body?.status === 'verified' ? 'verified' : 'rejected';
  res.json({ data: await service.decide(asType(req.params.type), req.params.id, status) });
}));

export { router as kycRouter };
