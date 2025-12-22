import { z } from 'zod';

export const commandStatusSchema = z.enum(['pending', 'sent', 'acked', 'failed', 'timeout']);

export const commandSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  deviceId: z.string().uuid(),
  correlationId: z.string().uuid(),
  type: z.string().min(1).max(100),
  payload: z.record(z.unknown()),
  status: commandStatusSchema.default('pending'),
  errorMessage: z.string().optional().nullable(),
  createdAt: z.coerce.date(),
  sentAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});

export const createCommandSchema = z.object({
  deviceId: z.string().uuid(),
  type: z.string().min(1).max(100),
  payload: z.record(z.unknown()).default({}),
});

// MQTT command payload (sent to device)
export const mqttCommandPayloadSchema = z.object({
  correlationId: z.string().uuid(),
  type: z.string().min(1),
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
});

// MQTT ack payload (received from device)
export const mqttAckPayloadSchema = z.object({
  correlationId: z.string().uuid(),
  status: z.enum(['success', 'error']),
  error: z.string().optional(),
  state: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});

export type CommandStatus = z.infer<typeof commandStatusSchema>;
export type Command = z.infer<typeof commandSchema>;
export type CreateCommand = z.infer<typeof createCommandSchema>;
export type MqttCommandPayload = z.infer<typeof mqttCommandPayloadSchema>;
export type MqttAckPayload = z.infer<typeof mqttAckPayloadSchema>;

