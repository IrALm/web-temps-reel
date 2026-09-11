import {z} from 'zod';

export const ackSchema = z.object({
  accepted: z.boolean(),
  errorCode: z.string().optional(),
});

export type Ack = z.infer<typeof ackSchema>;
