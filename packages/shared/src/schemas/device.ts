import { z } from 'zod';
import { deviceTypeSchemaDefinition } from './device-type';

export const deviceStatusSchema = z.enum(['pending', 'provisioned', 'online', 'offline']);

// Device type summary (included with device responses)
export const deviceTypeSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  color: z.string(),
  schema: deviceTypeSchemaDefinition,
});

export const deviceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  typeId: z.string().uuid().optional().nullable(),
  type: deviceTypeSummarySchema.optional().nullable(),
  name: z.string().min(1).max(255),
  externalId: z.string().max(255).optional().nullable(),
  status: deviceStatusSchema.default('pending'),
  lastSeen: z.coerce.date().optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(255),
  typeId: z.string().uuid().optional(),
  externalId: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  typeId: z.string().uuid().optional().nullable(),
  externalId: z.string().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const deviceCredentialSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  type: z.enum(['mqtt', 'provision']),
  expiresAt: z.coerce.date().optional().nullable(),
  revokedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date(),
});

export type DeviceStatus = z.infer<typeof deviceStatusSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type CreateDevice = z.infer<typeof createDeviceSchema>;
export type UpdateDevice = z.infer<typeof updateDeviceSchema>;
export type DeviceCredential = z.infer<typeof deviceCredentialSchema>;

