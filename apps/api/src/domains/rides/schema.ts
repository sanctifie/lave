import { z } from 'zod';

export const CreateRideRequestSchema = z.object({
  type: z.enum(['home', 'hospital', 'exam']),
  originLat: z.number(),
  originLng: z.number(),
  originLandmark: z.string().min(2),
  destLat: z.number(),
  destLng: z.number(),
  destLandmark: z.string().min(2),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const UpdateRideStatusSchema = z.object({
  status: z.enum(['en_route', 'arrived', 'completed', 'cancelled']),
});

export type CreateRideRequestInput = z.infer<typeof CreateRideRequestSchema>;
export type UpdateRideStatusInput = z.infer<typeof UpdateRideStatusSchema>;
