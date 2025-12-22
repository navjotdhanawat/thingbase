import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CODES, type ApiResponse, type ResponseMeta } from '@thingbase/shared';

/**
 * HTTP exception filter that formats all errors in standard format:
 * { success: false, error: { code, message, details }, meta: { requestId, timestamp } }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = (request as any).requestId || 'unknown';

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let code = ERROR_CODES.INTERNAL_ERROR;
        let message = 'Internal server error';
        let details: Record<string, unknown> | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const resp = exceptionResponse as any;
                message = resp.message || exception.message;
                code = resp.code || this.statusToCode(status);
                details = resp.errors || resp.details;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            this.logger.error(`Unhandled error: ${message}`, exception.stack);
        }

        const meta: ResponseMeta = {
            requestId,
            timestamp: new Date().toISOString(),
        };

        const errorResponse: ApiResponse<never> = {
            success: false,
            error: {
                code,
                message,
                details,
            },
            meta,
        };

        // Log the error
        this.logger.warn(
            `[${requestId}] ${request.method} ${request.url} -> ${status} ${code}: ${message}`,
        );

        response.status(status).json(errorResponse);
    }

    private statusToCode(status: number): string {
        switch (status) {
            case 400:
                return ERROR_CODES.BAD_REQUEST;
            case 401:
                return ERROR_CODES.UNAUTHORIZED;
            case 403:
                return ERROR_CODES.FORBIDDEN;
            case 404:
                return ERROR_CODES.NOT_FOUND;
            case 409:
                return ERROR_CODES.CONFLICT;
            case 429:
                return ERROR_CODES.RATE_LIMITED;
            case 503:
                return ERROR_CODES.SERVICE_UNAVAILABLE;
            default:
                return ERROR_CODES.INTERNAL_ERROR;
        }
    }
}
