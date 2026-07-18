import { z } from 'zod';
import { InsuranceProvider } from '@mbolo/shared';

export const UpdateMeSchema = z.object({
  name: z.string().min(2).optional(),
});

export const SavePushTokenSchema = z.object({
  pushToken: z.string().startsWith('ExponentPushToken['),
});

export const UpdatePatientProfileSchema = z.object({
  dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
  bloodType:   z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).nullable().optional(),
  allergies:   z.array(z.string()).optional(),
  // Tiers-payant
  insuranceProvider:     z.nativeEnum(InsuranceProvider).optional(),
  insuranceNumber:       z.string().min(1).max(64).nullable().optional(),
  insuranceCoverageRate: z.number().int().min(0).max(100).nullable().optional(),
});

export type UpdateMeInput             = z.infer<typeof UpdateMeSchema>;
export type SavePushTokenInput        = z.infer<typeof SavePushTokenSchema>;
export type UpdatePatientProfileInput = z.infer<typeof UpdatePatientProfileSchema>;
