import { z } from 'zod';
import { PrescriptionType } from '@mbolo/shared';

export const CreatePrescriptionSchema = z.object({
  type: z.nativeEnum(PrescriptionType).default(PrescriptionType.DRUG),
  targetPartnerId: z.string().cuid('ID pharmacie invalide'),
});

export const ValidatePrescriptionSchema = z
  .object({
    approved: z.boolean(),
    items: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().int().positive(),
          unitPriceFcfa: z.number().int().positive(),
        }),
      )
      .optional(),
    rejectionReason: z.string().min(5).optional(),
  })
  .refine(
    (d) => {
      if (d.approved) return d.items && d.items.length > 0;
      return !!d.rejectionReason;
    },
    { message: 'items requis si approuvé — rejectionReason requis si refusé' },
  );

export const IssuePrescriptionSchema = z.object({
  consultationId: z.string().cuid(),
  items: z
    .array(z.object({ name: z.string(), dosage: z.string().optional(), quantity: z.number().int().positive() }))
    .min(1),
});

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type ValidatePrescriptionInput = z.infer<typeof ValidatePrescriptionSchema>;
export type IssuePrescriptionInput = z.infer<typeof IssuePrescriptionSchema>;
