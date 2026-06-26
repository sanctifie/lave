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

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;
