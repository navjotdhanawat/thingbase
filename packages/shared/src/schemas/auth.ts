import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255).optional(),
  tenantName: z.string().min(1).max(255),
  tenantSlug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export const jwtPayloadSchema = z.object({
  sub: z.string().uuid(), // user id
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

