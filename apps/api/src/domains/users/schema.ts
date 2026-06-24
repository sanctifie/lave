import { z } from 'zod';

export const UpdateMeSchema = z.object({
  name: z.string().min(2).optional(),
});

export const SavePushTokenSchema = z.object({
  pushToken: z.string().startsWith('ExponentPushToken['),
});

export type UpdateMeInput    = z.infer<typeof UpdateMeSchema>;
export type SavePushTokenInput = z.infer<typeof SavePushTokenSchema>;
