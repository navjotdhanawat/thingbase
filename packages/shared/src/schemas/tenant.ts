import { z } from 'zod';

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).default('free'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  }),
});

export const updateTenantSchema = createTenantSchema.partial();

export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenant = z.infer<typeof createTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;


