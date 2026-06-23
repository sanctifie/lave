import { z } from 'zod';

export const UpdateMeSchema = z.object({
  name: z.string().min(2).optional(),
});

export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
