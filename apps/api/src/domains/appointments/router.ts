import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/asyncHandler';
import { CreateAppointmentSchema } from './schema';
import { AppointmentService } from './service';
import { AppointmentRepository } from './repository';
import { DoctorRepository } from '../doctors/repository';

const router = Router();
const service = new AppointmentService(new AppointmentRepository(), new DoctorRepository());

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.list(req.user!.userId));
}));

router.post('/', requireAuth, validate(CreateAppointmentSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.user!.userId, req.body));
}));

router.patch('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.cancel(req.params.id, req.user!.userId));
}));

export { router as appointmentsRouter };
