import { z } from 'zod';

export const InitEscrowSchema = z.object({
  orderId: z.string().cuid(),
  phoneNumber: z.string(),
});

export type InitEscrowInput = z.infer<typeof InitEscrowSchema>;
