import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REDIS_KEYS, JwtPayload } from '@thingbase/shared';
import { CommandsService } from '../commands/commands.service';

interface AuthenticatedSocket extends Socket {
  tenantId: string;
  userId: string;
}

interface SendCommandPayload {
  deviceId: string;
  action: string;
  params?: Record<string, unknown>;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, devices)
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
  },
  namespace: '/devices',
})
export class DeviceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeviceGateway.name);
  private readonly jwtService: JwtService;
  private readonly jwtSecret: string;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CommandsService))
    private readonly commands: CommandsService,
  ) {
    this.jwtSecret = this.configService.get<string>('jwt.secret') || 'secret';
    this.jwtService = new JwtService({ secret: this.jwtSecret });
  }

  async onModuleInit() {
    // Subscribe to Redis channels for device updates
    await this.subscribeToUpdates();
  }

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or auth header
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(`Client ${client.id} rejected: No token provided`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify<JwtPayload>(token);

      // Store tenant ID on socket for later use
      const authSocket = client as AuthenticatedSocket;
      authSocket.tenantId = payload.tenantId;
      authSocket.userId = payload.sub;

      // Join tenant-specific room
      client.join(`tenant:${payload.tenantId}`);

      this.logger.log(`Client ${client.id} connected (tenant: ${payload.tenantId})`);

      // Send current device states
      const devices = await this.prisma.device.findMany({
        where: { tenantId: payload.tenantId },
        select: { id: true, name: true, status: true, lastSeen: true },
      });

      // Get current states from Redis
      const states: Record<string, unknown> = {};
      for (const device of devices) {
        const state = await this.redis.get(REDIS_KEYS.DEVICE_STATE(device.id));
        if (state) {
          states[device.id] = JSON.parse(state);
        }
      }

      client.emit('devices:init', { devices, states });
    } catch (error) {
      this.logger.warn(`Client ${client.id} rejected: Invalid token`);
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe:device')
  async handleSubscribeDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() deviceId: string,
  ) {
    const authSocket = client as AuthenticatedSocket;
    const tenantId = authSocket.tenantId;

    // Verify device belongs to tenant
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!device) {
      client.emit('error', { message: 'Device not found' });
      return { success: false, error: 'Device not found' };
    }

    // Join device-specific room
    client.join(`device:${deviceId}`);

    // Send current state
    const state = await this.redis.get(REDIS_KEYS.DEVICE_STATE(deviceId));
    if (state) {
      client.emit('device:state', { deviceId, state: JSON.parse(state) });
    }

    this.logger.debug(`Client ${client.id} subscribed to device ${deviceId}`);
    return { success: true };
  }

  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribeDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() deviceId: string,
  ) {
    client.leave(`device:${deviceId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from device ${deviceId}`);
    return { success: true };
  }

  /**
   * Handle command from client to device
   */
  @SubscribeMessage('send:command')
  async handleSendCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendCommandPayload,
  ) {
    const authSocket = client as AuthenticatedSocket;
    const tenantId = authSocket.tenantId;
    const userId = authSocket.userId;

    const { deviceId, action, params } = payload;

    try {
      // Verify device belongs to tenant
      const device = await this.prisma.device.findFirst({
        where: { id: deviceId, tenantId },
      });

      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      // Check device is online
      if (device.status !== 'online') {
        return { success: false, error: 'Device is offline' };
      }

      // Send command via MQTT (uses CommandsService)
      const command = await this.commands.sendCommand(tenantId, {
        deviceId,
        type: action,
        payload: params || {},
      });

      this.logger.log(`Command ${action} sent to device ${deviceId} (correlationId: ${command.id})`);

      return {
        success: true,
        commandId: command.id,
        correlationId: command.id,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send command to ${deviceId}`, error);
      return {
        success: false,
        error: error.message || 'Failed to send command',
      };
    }
  }

  /**
   * Subscribe to Redis pub/sub for device updates
   * Uses pattern subscription (psubscribe) for multi-tenant support
   */
  private async subscribeToUpdates() {
    const subscriber = this.redis.getSubscriber();

    // IMPORTANT: When using psubscribe, the event is 'pmessage', not 'message'
    subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      try {
        const data = JSON.parse(message);

        // Extract tenant ID from channel (channel:devices:{tenantId})
        const match = channel.match(/channel:devices:(.+)/);
        if (!match) return;

        const tenantId = match[1];

        // Broadcast to tenant room
        this.server.to(`tenant:${tenantId}`).emit(data.type, data);

        // If device-specific, also broadcast to device room
        if (data.deviceId) {
          this.server.to(`device:${data.deviceId}`).emit(data.type, data);
        }

        this.logger.debug(`Broadcasted ${data.type} to tenant ${tenantId}`);
      } catch (error) {
        this.logger.error('Error processing Redis message', error);
      }
    });

    // Subscribe to all device update channels using pattern
    subscriber.psubscribe('channel:devices:*');
    this.logger.log('Subscribed to device update channels (pattern: channel:devices:*)');
  }
}
