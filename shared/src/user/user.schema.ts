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

export const loginSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
});

/** Utilisateur authentifié tel que renvoyé par `POST /auth/login` (jamais le mot de passe). */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: userRoleSchema,
});

export type User = z.infer<typeof userSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type Login = z.infer<typeof loginSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;