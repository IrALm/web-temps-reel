import {z} from 'zod';

export const chatMessageSchema = z.object({
  channelId: z.string().min(1),
  authorId: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.coerce.date(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
