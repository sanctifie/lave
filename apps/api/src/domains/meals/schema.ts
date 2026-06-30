import { z } from 'zod';

export const CreateMealPlanSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        unitPriceFcfa: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const CreateMealOrderSchema = z.object({
  mealPlanId: z.string().cuid(),
  notes: z.string().optional(),
});

export const UpdateMealPlanItemSchema = z.object({
  isAvailable: z.boolean(),
});

export type CreateMealPlanInput = z.infer<typeof CreateMealPlanSchema>;
export type CreateMealOrderInput = z.infer<typeof CreateMealOrderSchema>;
