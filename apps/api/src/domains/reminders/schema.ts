import { z } from 'zod';

const TIME = z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM attendu');

export const CreateReminderSchema = z.object({
  medication: z.string().trim().min(1).max(120),
  times: z.array(TIME).min(1).max(6),
  durationDays: z.number().int().min(1).max(365),
});

// Lecture IA d'une posologie en texte libre → horaires proposés.
export const ParsePosologySchema = z.object({
  instructions: z.string().trim().min(1).max(500),
});

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;
