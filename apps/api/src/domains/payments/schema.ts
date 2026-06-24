import { z } from 'zod';

export const InitEscrowSchema = z.object({
  orderId:     z.string().cuid(),
  phoneNumber: z.string(),
});

export const InitConsultationPaymentSchema = z.object({
  consultationId: z.string().cuid(),
  phoneNumber:    z.string().min(8).max(15),
  operator:       z.enum(['orange', 'airtel']),
});

export const MeSombWebhookSchema = z.object({
  status:  z.string(),
  success: z.boolean().optional(),
  transaction: z.object({
    pk:        z.string().optional(),
    status:    z.string().optional(),
    amount:    z.number().optional(),
    reference: z.string().optional(),
  }).optional(),
  // format plat (certaines versions)
  reference: z.string().optional(),
});

export type InitEscrowInput              = z.infer<typeof InitEscrowSchema>;
export type InitConsultationPaymentInput = z.infer<typeof InitConsultationPaymentSchema>;
export type MeSombWebhookInput           = z.infer<typeof MeSombWebhookSchema>;
