import {z} from 'zod';

export const userRoleSchema = z.enum([
  'manager',
  'waiter',
  'cook',
]);

export const userSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
  role: userRoleSchema,
});

export type User = z.infer<typeof userSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;