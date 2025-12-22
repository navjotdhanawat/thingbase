import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import type { ApiResponse, ResponseMeta } from '@thingbase/shared';

/**
 * Response interceptor that wraps all API responses in standard format:
 * { success: true, data: <response>, meta: { requestId, timestamp } }
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        // Get request ID from middleware
        const requestId = (request as any).requestId || 'unknown';

        return next.handle().pipe(
            map((data) => {
                // If data is already in ApiResponse format, just add meta
                if (data && typeof data === 'object' && 'success' in data) {
                    return {
                        ...data,
                        meta: this.buildMeta(requestId),
                    };
                }

                // Wrap raw data in standard format
                return {
                    success: true,
                    data,
                    meta: this.buildMeta(requestId),
                };
            }),
        );
    }

    private buildMeta(requestId: string): ResponseMeta {
        return {
            requestId,
            timestamp: new Date().toISOString(),
        };
    }
}
