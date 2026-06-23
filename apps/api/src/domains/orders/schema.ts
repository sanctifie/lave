import { z } from 'zod';

export const CreateOrderSchema = z.object({
  prescriptionId: z.string().cuid(),
  partnerId: z.string().cuid(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().positive(),
    unitPriceFcfa: z.number().int().positive(),
  })).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
