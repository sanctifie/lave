import { z } from 'zod';
import { AppointmentType } from '@mbolo/shared';

export const CreateAppointmentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(AppointmentType.IMMEDIATE),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal(AppointmentType.SCHEDULED),
    doctorId: z.string().cuid(),
    scheduledAt: z.coerce.date().refine((d) => d > new Date(), 'La date doit être dans le futur'),
    notes: z.string().optional(),
  }),
]);

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
