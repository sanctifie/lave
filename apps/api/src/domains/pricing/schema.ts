import { z } from 'zod';
import { PricingKind } from '@mbolo/shared';

export const UpsertPricingSchema = z.object({
  kind: z.nativeEnum(PricingKind),
  valueFcfa: z.number().int().positive().optional(),
  valueNum: z.number().positive().optional(),
}).refine(d => d.valueFcfa !== undefined || d.valueNum !== undefined, 'valueFcfa ou valueNum requis');

export type UpsertPricingInput = z.infer<typeof UpsertPricingSchema>;
