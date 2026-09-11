import {z} from 'zod';

export const orderStatusSchema = z.enum([
  'pending',
  'in_preparation',
  'served',
  'cancelled',
]);

export const menuItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string().min(1),
  /** URL relative (fichier local servi par le frontend) ou absolue (API externe). */
  imageUrl: z.string().min(1).optional(),
});

export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  constraints: z.array(z.string()).default([]),
});

export const orderSchema = z.object({
  tableNumber: z.number().int().min(1),
  waiterId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  status: orderStatusSchema,
});

export const createOrderSchema = orderSchema.omit({status: true});

export const updateOrderStatusSchema = z.object({
  expectedStatus: orderStatusSchema,
  requestedStatus: orderStatusSchema,
});

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatus = z.infer<typeof updateOrderStatusSchema>;
