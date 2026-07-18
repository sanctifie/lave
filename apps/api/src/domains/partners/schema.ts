import { z } from 'zod';
import { PartnerType } from '@mbolo/shared';

export const CreatePartnerSchema = z.object({
  type: z.nativeEnum(PartnerType),
  legalName: z.string().min(2),
  phone: z.string(),
  whatsappNumber: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  landmark: z.string().min(3),
});

export const ListPartnersSchema = z.object({
  type: z.nativeEnum(PartnerType).optional(),
});

// ── Catalogue produits (poste de dispensation) ──────────────────────────────
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(120),
  barcode: z.string().min(3).max(64).nullable().optional(),
  priceFcfa: z.number().int().positive(),
  inStock: z.boolean().optional(),
  isAdvice: z.boolean().optional(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  barcode: z.string().min(3).max(64).nullable().optional(),
  priceFcfa: z.number().int().positive().optional(),
  inStock: z.boolean().optional(),
  isAdvice: z.boolean().optional(),
});

export const ListProductsSchema = z.object({
  q: z.string().max(64).optional(),
  adviceOnly: z.coerce.boolean().optional(),
});

// ── Garde & vitrine ─────────────────────────────────────────────────────────
export const UpdateDutySchema = z.object({
  isOnDuty: z.boolean().optional(),
  openingHours: z.string().max(200).nullable().optional(),
});

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ListProductsInput  = z.infer<typeof ListProductsSchema>;
export type UpdateDutyInput    = z.infer<typeof UpdateDutySchema>;
