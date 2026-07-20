import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateAppointmentSchema, CompleteConsultationSchema } from './schema';
import { AppointmentService } from './service';
import { AppointmentRepository } from './repository';
import { DoctorRepository } from '../doctors/repository';
import { PricingRepository } from '../pricing/repository';
import { videoProvider, notificationService, pushService } from '../../infrastructure/container';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();
const service = new AppointmentService(
  new AppointmentRepository(),
  new DoctorRepository(),
  new PricingRepository(),
  videoProvider,
  notificationService,
  pushService,
);

/** Liste — patient voit ses RDV, médecin voit sa file */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const list = await service.list(req.user!.userId, req.user!.role);
  res.json({ data: list });
}));

/** Détail d'un RDV (patient ou médecin concerné) */
// Médecin : dossier médical du patient de SON rendez-vous
router.get('/:id/patient-record', requireAuth, requireRole(UserRole.DOCTOR), asyncHandler(async (req, res) => {
  res.json({ data: await service.getPatientRecord(req.params.id, req.user!.userId) });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const appt = await service.getById(req.params.id, req.user!.userId);
  res.json({ data: appt });
}));

/** Patient crée un RDV */
router.post(
  '/',
  requireAuth,
  validate(CreateAppointmentSchema),
  asyncHandler(async (req, res) => {
    const appt = await service.create(req.user!.userId, req.body);
    res.status(201).json({ data: appt });
  }),
);

/** Médecin démarre la session vidéo */
router.post(
  '/:id/start',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  asyncHandler(async (req, res) => {
    const result = await service.start(req.params.id, req.user!.userId);
    res.json({ data: result });
  }),
);

/** Médecin clôture avec notes + ordonnance optionnelle */
router.post(
  '/:id/complete',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  validate(CompleteConsultationSchema),
  asyncHandler(async (req, res) => {
    const result = await service.complete(req.params.id, req.user!.userId, req.body);
    res.json({ data: result });
  }),
);

/** Patient entre en salle d'attente (10 min avant le RDV) */
router.post('/:id/waiting-room', requireAuth, asyncHandler(async (req, res) => {
  const result = await service.enterWaitingRoom(req.params.id, req.user!.userId);
  res.json({ data: result });
}));

/** Patient annule son RDV */
router.patch('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const appt = await service.cancel(req.params.id, req.user!.userId);
  res.json({ data: appt });
}));

export { router as appointmentsRouter };
