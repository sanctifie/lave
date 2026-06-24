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

export const UpdateProfileSchema = z.object({
  specialtyId:         z.string().cuid().optional(),
  consultationFeeFcfa: z.number().int().positive().optional(),
  bio:                 z.string().max(500).optional(),
  languages:           z.array(z.string()).optional(),
});

const TimeRegex = /^\d{2}:\d{2}$/;

export const UpdateScheduleSchema = z.object({
  slots: z.array(z.object({
    dayOfWeek:    z.number().int().min(0).max(6),
    startTimeUtc: z.string().regex(TimeRegex, 'Format HH:MM requis'),
    endTimeUtc:   z.string().regex(TimeRegex, 'Format HH:MM requis'),
  })),
});

export type RegisterDoctorInput  = z.infer<typeof RegisterDoctorSchema>;
export type UpdateProfileInput   = z.infer<typeof UpdateProfileSchema>;
export type UpdateScheduleInput  = z.infer<typeof UpdateScheduleSchema>;
