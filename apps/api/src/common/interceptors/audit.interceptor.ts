import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

export const AUDIT_KEY = 'audit';

export interface AuditOptions {
  action: string;
  resourceType: string;
  resourceIdParam?: string; // The request param that contains the resource ID
  includeBody?: boolean;
}

/**
 * Decorator to mark a controller method for audit logging
 */
export const Audited = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_KEY,
      context.getHandler(),
    );

    // Skip if no @Audited decorator
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Get resource ID from params, body, or response
          let resourceId: string | undefined;

          if (auditOptions.resourceIdParam) {
            resourceId = request.params[auditOptions.resourceIdParam];
          } else if (response?.data?.id) {
            resourceId = response.data.id;
          }

          // Build metadata
          const metadata: Record<string, unknown> = {
            method: request.method,
            path: request.path,
            duration: Date.now() - startTime,
          };

          if (auditOptions.includeBody && request.body) {
            // Redact sensitive fields to prevent secret leakage in audit logs
            const sensitiveFields = [
              'password',
              'passwordHash',
              'token',
              'refreshToken',
              'accessToken',
              'currentPassword',
              'newPassword',
              'provisionToken',
              'claimToken',
              'mqttPassword',
              'secret',
              'apiKey',
            ];

            const safeBody = { ...request.body };
            for (const field of sensitiveFields) {
              if (field in safeBody) {
                safeBody[field] = '[REDACTED]';
              }
            }
            metadata.body = safeBody;
          }

          if (request.query && Object.keys(request.query).length > 0) {
            metadata.query = request.query;
          }

          // Create audit log
          this.auditService.log({
            tenantId: user.tenantId,
            userId: user.id,
            action: auditOptions.action,
            resourceType: auditOptions.resourceType,
            resourceId,
            metadata,
          });
        },
        error: (error) => {
          // Log failed actions too
          this.auditService.log({
            tenantId: user.tenantId,
            userId: user.id,
            action: `${auditOptions.action}_failed`,
            resourceType: auditOptions.resourceType,
            resourceId: auditOptions.resourceIdParam
              ? request.params[auditOptions.resourceIdParam]
              : undefined,
            metadata: {
              method: request.method,
              path: request.path,
              error: error.message,
              statusCode: error.status || 500,
            },
          });
        },
      }),
    );
  }
}

