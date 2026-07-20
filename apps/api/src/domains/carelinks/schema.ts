import { z } from 'zod';

// Le patient invite un accompagnant par son numéro de téléphone.
export const InviteCaregiverSchema = z.object({
  caregiverPhone: z
    .string()
    .trim()
    .min(6, 'Numéro invalide')
    .max(20, 'Numéro invalide'),
});

export type InviteCaregiverInput = z.infer<typeof InviteCaregiverSchema>;
