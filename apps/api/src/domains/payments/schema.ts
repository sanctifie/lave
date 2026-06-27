import { z } from 'zod';

export const InitEscrowSchema = z.object({
  orderId:     z.string().cuid(),
  phoneNumber: z.string(),
});

export const InitConsultationPaymentSchema = z.object({
  consultationId: z.string().cuid(),
  phoneNumber:    z.string().min(8).max(15),
  operator:       z.enum(['airtel', 'moov']),
});

/** Webhook MyPVIT — payload reçu après traitement opérateur */
export const MyPVITWebhookSchema = z.object({
  transactionId:       z.string(),
  merchantReferenceId: z.string().optional(),
  status:              z.string(),             // "SUCCESS" | "FAILED"
  amount:              z.number().optional(),
  fees:                z.number().optional(),
  totalAmount:         z.number().optional(),
  customerID:          z.string().optional(),
  operator:            z.string().optional(),
  code:                z.number(),             // à renvoyer tel quel dans l'accusé
  amountCredited:      z.number().optional(),
  chargeOwner:         z.string().optional(),
});

export const InitRidePaymentSchema = z.object({
  rideId:      z.string().cuid(),
  phoneNumber: z.string().min(8).max(15),
  operator:    z.enum(['airtel', 'moov']),
});

export const InitMealPaymentSchema = z.object({
  mealOrderId: z.string().cuid(),
  phoneNumber: z.string().min(8).max(15),
  operator:    z.enum(['airtel', 'moov']),
});

export type InitEscrowInput              = z.infer<typeof InitEscrowSchema>;
export type InitConsultationPaymentInput = z.infer<typeof InitConsultationPaymentSchema>;
export type InitRidePaymentInput         = z.infer<typeof InitRidePaymentSchema>;
export type InitMealPaymentInput         = z.infer<typeof InitMealPaymentSchema>;
export type MyPVITWebhookInput           = z.infer<typeof MyPVITWebhookSchema>;
