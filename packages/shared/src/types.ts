/**
 * User roles
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

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

