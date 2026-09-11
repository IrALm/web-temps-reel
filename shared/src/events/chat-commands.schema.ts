import {z} from 'zod';

/**
 * Commande envoyée par le client (WebSocket natif ou Socket.IO) pour
 * poster un message. À distinguer de `chatMessageCreatedEventSchema`
 * (chat-events.schema.ts), l'événement publié par le serveur une fois le
 * message accepté et persisté.
 */
export const chatMessageCreateCommandSchema = z.object({
  type: z.literal('chat:message:create'),
  clientMessageId: z.string().min(1),
  channelId: z.string().min(1),
  content: z.string().min(1),
});

export type ChatMessageCreateCommand = z.infer<
  typeof chatMessageCreateCommandSchema
>;
