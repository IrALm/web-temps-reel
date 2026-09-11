import {z} from 'zod';

export const chatMessageCreatedEventSchema = z.object({
  eventId: z.number().int(),
  messageId: z.string().min(1),
  channelId: z.string().min(1),
  authorId: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.coerce.date(),
});

export type ChatMessageCreatedEvent = z.infer<typeof chatMessageCreatedEventSchema>;
