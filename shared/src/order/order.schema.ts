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
});

export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  constraints: z.array(z.string()).default([]),
});

export const orderSchema = z.object({
  tableNumber: z.number().int().min(1),
  items: z.array(orderItemSchema).min(1),
  status: orderStatusSchema,
});

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
