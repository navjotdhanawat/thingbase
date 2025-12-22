import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix with versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('IoT SaaS Platform API')
    .setDescription(`
## Overview
Multi-tenant IoT platform API for device management, telemetry, and real-time control.

## Authentication
All protected endpoints require a Bearer JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Rate Limits
- 10 requests/second
- 50 requests/10 seconds  
- 100 requests/minute

## WebSocket
Real-time updates available at \`/devices\` namespace with Socket.IO.
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication & user management')
    .addTag('Devices', 'Device registry & provisioning')
    .addTag('Commands', 'Device command & control')
    .addTag('Telemetry', 'Device telemetry data')
    .addTag('Alerts', 'Alert rules & notifications')
    .addTag('Device Types', 'Device type schemas')
    .addTag('Users', 'User management')
    .addTag('Audit', 'Audit logging')
    .addTag('Health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'IoT SaaS API Documentation',
  });

  // Enable CORS - allow all localhost origins in development
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // In development, allow all localhost origins
      if (process.env.NODE_ENV !== 'production') {
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
      }
      
      // In production, check against allowed origins
      const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);
  logger.log(`🚀 API server running on http://localhost:${port}`);
  logger.log(`📚 API docs: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health check: http://localhost:${port}/api/health`);
}

bootstrap();

