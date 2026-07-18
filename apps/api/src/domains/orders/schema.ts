import { z } from 'zod';

export const CreateOrderSchema = z.object({
  prescriptionId: z.string().cuid(),
  partnerId: z.string().cuid(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().int().positive(),
        unitPriceFcfa: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const PharmacyActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('prepare') }),
  z.object({ action: z.literal('ready') }),
  z.object({
    action: z.literal('reject'),
    reason: z.string().min(5),
  }),
]);

// Décision du patient sur les équivalents proposés (par article).
export const SubstitutionDecisionSchema = z.object({
  decisions: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        accepted: z.boolean(),
      }),
    )
    .min(1),
});

// Choix du patient sur les conseils officinaux proposés (par article).
export const RecommendationDecisionSchema = z.object({
  decisions: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        accepted: z.boolean(),
      }),
    )
    .min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type PharmacyActionInput = z.infer<typeof PharmacyActionSchema>;
export type SubstitutionDecisionInput = z.infer<typeof SubstitutionDecisionSchema>;
export type RecommendationDecisionInput = z.infer<typeof RecommendationDecisionSchema>;
