import { z } from 'zod';

// Cibles notables : pharmacie, médecin, coursier (polymorphisme via refTable).
export const REVIEW_TABLES = ['partner_profiles', 'doctor_profiles', 'couriers'] as const;

export const CreateReviewSchema = z.object({
  refTable: z.enum(REVIEW_TABLES),
  refId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const SummaryQuerySchema = z.object({
  refTable: z.enum(REVIEW_TABLES),
  refId: z.string().cuid(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
