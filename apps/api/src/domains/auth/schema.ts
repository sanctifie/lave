import { z } from 'zod';

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Numéro de téléphone invalide'),
});

export const VerifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string().length(6, 'Le code OTP doit contenir 6 chiffres'),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
