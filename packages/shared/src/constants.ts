// Auth decorator keys
export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Command status constants
export const COMMAND_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  ACKED: 'acked',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
} as const;

// MQTT Topics
export const MQTT_TOPICS = {
  // Device publishes to:
  TELEMETRY: (tenantId: string, deviceId: string) =>
    `iot/${tenantId}/devices/${deviceId}/telemetry`,
  ACK: (tenantId: string, deviceId: string) =>
    `iot/${tenantId}/devices/${deviceId}/ack`,
  STATUS: (tenantId: string, deviceId: string) =>
    `iot/${tenantId}/devices/${deviceId}/status`,

  // Server publishes to:
  COMMAND: (tenantId: string, deviceId: string) =>
    `iot/${tenantId}/devices/${deviceId}/command`,

  // Wildcard subscriptions:
  ALL_TELEMETRY: 'iot/+/devices/+/telemetry',
  ALL_ACK: 'iot/+/devices/+/ack',
  ALL_STATUS: 'iot/+/devices/+/status',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  // Device state shadow
  DEVICE_STATE: (deviceId: string) => `device:${deviceId}:state`,
  
  // Session and tokens
  SESSION: (sessionId: string) => `session:${sessionId}`,
  REFRESH_TOKEN: (userId: string) => `refresh:${userId}`,
  
  // Rate limiting
  RATE_LIMIT: (key: string) => `ratelimit:${key}`,
  
  // Pub/sub channels
  DEVICE_UPDATES_CHANNEL: (tenantId: string) => `channel:devices:${tenantId}`,
  COMMAND_UPDATES_CHANNEL: (tenantId: string) => `channel:commands:${tenantId}`,
  
  // Command correlation tracking
  COMMAND_CORRELATION: (correlationId: string) => `cmd:correlation:${correlationId}`,
} as const;
