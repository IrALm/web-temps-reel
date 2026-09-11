import {z} from 'zod';
import {orderItemSchema, orderStatusSchema} from '../order/order.schema';

export const orderCreatedEventSchema = z.object({
  eventId: z.number().int(),
  orderId: z.string().min(1),
  tableNumber: z.number().int().min(1),
  waiterId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  status: orderStatusSchema,
  createdAt: z.coerce.date(),
});

export const orderStatusUpdatedEventSchema = z.object({
  eventId: z.number().int(),
  orderId: z.string().min(1),
  previousStatus: orderStatusSchema,
  status: orderStatusSchema,
  /** Horodatage de l'événement lui-même (ajouté par EventLogService), pas de la ligne `Order` en base. */
  createdAt: z.coerce.date(),
});

export type OrderCreatedEvent = z.infer<typeof orderCreatedEventSchema>;
export type OrderStatusUpdatedEvent = z.infer<typeof orderStatusUpdatedEventSchema>;
