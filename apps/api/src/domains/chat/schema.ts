import { z } from 'zod';

export const GetOrCreateConversationSchema = z.object({
  refTable: z.string().min(1),
  refId: z.string().min(1),
});

export const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export type GetOrCreateConversationInput = z.infer<typeof GetOrCreateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
