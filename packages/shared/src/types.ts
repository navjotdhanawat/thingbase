/**
 * User roles
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * Response metadata for tracking and debugging
 */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

/**
 * Standardized error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

/**
 * Standardized error codes used across all API endpoints
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Device-specific
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  DEVICE_NOT_PROVISIONED: 'DEVICE_NOT_PROVISIONED',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Device state stored in Redis
 */
export interface DeviceState {
  deviceId: string;
  tenantId: string;
  online: boolean;
  lastSeen: string;
  state: Record<string, unknown>;
  updatedAt: string;
}

/**
 * WebSocket events
 */
export enum WsEvent {
  DEVICE_STATE_UPDATE = 'device:state:update',
  DEVICE_STATUS_CHANGE = 'device:status:change',
  COMMAND_STATUS_UPDATE = 'command:status:update',
  ERROR = 'error',
}

/**
 * WebSocket device state update payload
 */
export interface WsDeviceStateUpdate {
  deviceId: string;
  state: Record<string, unknown>;
  timestamp: string;
}

/**
 * WebSocket command status update payload
 */
export interface WsCommandStatusUpdate {
  commandId: string;
  deviceId: string;
  status: string;
  error?: string;
  timestamp: string;
}

