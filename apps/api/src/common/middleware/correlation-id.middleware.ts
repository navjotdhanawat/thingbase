import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Middleware to add correlation/request ID to all requests
 * - Uses existing header if provided
 * - Generates new UUID if not present
 * - Attaches to request and response headers
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        // Get existing request ID or generate new one
        const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();

        // Attach to request for use in handlers
        (req as any).requestId = requestId;

        // Add to response headers
        res.setHeader(REQUEST_ID_HEADER, requestId);

        // Log request
        const { method, originalUrl } = req;
        const userAgent = req.get('user-agent') || '';

        res.on('finish', () => {
            const { statusCode } = res;
            const contentLength = res.get('content-length');

            this.logger.log(
                `${method} ${originalUrl} ${statusCode} ${contentLength || '-'} - ${userAgent} [${requestId}]`
            );
        });

        next();
    }
}
