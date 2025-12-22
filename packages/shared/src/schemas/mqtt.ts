import { z } from 'zod';

// Telemetry payload from device
export const mqttTelemetryPayloadSchema = z.object({
  timestamp: z.string().datetime().optional(),
  data: z.record(z.unknown()),
});

export type MqttTelemetryPayload = z.infer<typeof mqttTelemetryPayloadSchema>;

// Device status payload (LWT and online)
export const mqttStatusPayloadSchema = z.object({
  status: z.enum(['online', 'offline']),
  timestamp: z.string().datetime().optional(),
});

export type MqttStatusPayload = z.infer<typeof mqttStatusPayloadSchema>;
