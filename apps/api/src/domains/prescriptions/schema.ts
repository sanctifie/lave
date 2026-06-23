import { z } from 'zod';
import { PrescriptionType } from '@mbolo/shared';

export const CreatePrescriptionSchema = z.object({
  type: z.nativeEnum(PrescriptionType).default(PrescriptionType.DRUG),
  mediaIds: z.array(z.string().cuid()).min(1, 'Au moins un scan requis'),
});

export const ValidatePrescriptionSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const IssuePrescriptionSchema = z.object({
  consultationId: z.string().cuid(),
  items: z.array(z.object({
    name: z.string(),
    dosage: z.string().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
});

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type ValidatePrescriptionInput = z.infer<typeof ValidatePrescriptionSchema>;
export type IssuePrescriptionInput = z.infer<typeof IssuePrescriptionSchema>;
