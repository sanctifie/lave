import { z } from 'zod';
import { AppointmentType } from '@mbolo/shared';

export const CreateAppointmentSchema = z.discriminatedUnion('type', [
  z.object({
    type:           z.literal(AppointmentType.IMMEDIATE),
    chiefComplaint: z.string().max(500).optional(),
  }),
  z.object({
    type:           z.literal(AppointmentType.SCHEDULED),
    doctorId:       z.string().cuid(),
    scheduledAt:    z.coerce.date().refine((d) => d > new Date(), 'La date doit être dans le futur'),
    chiefComplaint: z.string().max(500).optional(),
  }),
]);

export const CompleteConsultationSchema = z.object({
  notes:        z.string().min(1, 'Les notes sont obligatoires'),
  prescription: z.string().max(2000).optional(),
});

export type CreateAppointmentInput    = z.infer<typeof CreateAppointmentSchema>;
export type CompleteConsultationInput = z.infer<typeof CompleteConsultationSchema>;
