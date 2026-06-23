import { z } from 'zod';

export const RegisterDoctorSchema = z.object({
  cnomNumber: z.string().min(4),
  specialtyId: z.string().cuid(),
  bio: z.string().optional(),
  languages: z.array(z.string()).default(['fr']),
  consultationFeeFcfa: z.number().int().positive(),
});

export const UpdateAvailabilitySchema = z.object({
  isAvailableNow: z.boolean(),
});

export type RegisterDoctorInput = z.infer<typeof RegisterDoctorSchema>;
