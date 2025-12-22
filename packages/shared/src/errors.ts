/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// Authentication errors
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super('TOKEN_EXPIRED', 'Token has expired', 401);
  }
}

// Resource errors
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', id ? `${resource} with id ${id} not found` : `${resource} not found`, 404);
  }
}

export class TenantNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('Tenant', id);
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('User', id);
  }
}

export class DeviceNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('Device', id);
  }
}

export class CommandNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('Command', id);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

// Conflict errors
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor() {
    super('Email already exists');
  }
}

export class TenantSlugAlreadyExistsError extends ConflictError {
  constructor() {
    super('Tenant slug already exists');
  }
}

// Device errors
export class DeviceOfflineError extends AppError {
  constructor(deviceId: string) {
    super('DEVICE_OFFLINE', `Device ${deviceId} is offline`, 503);
  }
}

export class DeviceNotProvisionedError extends AppError {
  constructor(deviceId: string) {
    super('DEVICE_NOT_PROVISIONED', `Device ${deviceId} is not provisioned`, 400);
  }
}


