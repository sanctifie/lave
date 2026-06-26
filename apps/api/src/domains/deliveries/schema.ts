import { z } from 'zod';
import { DeliveryStatus } from '@mbolo/shared';

export const UpdateDeliveryStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
});

export const HandoverSchema = z.object({
  code: z.string().min(4),
});

export type UpdateDeliveryStatusInput = z.infer<typeof UpdateDeliveryStatusSchema>;
