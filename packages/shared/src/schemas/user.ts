import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'user']);
export const userStatusSchema = z.enum(['active', 'inactive', 'pending']);

export const userSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  role: userRoleSchema.default('user'),
  status: userStatusSchema.default('active'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255).optional(),
  role: userRoleSchema.optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: userRoleSchema.default('user'),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type InviteUser = z.infer<typeof inviteUserSchema>;


