import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Public } from '../../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * MQTT Authentication Controller
 * 
 * This controller provides HTTP endpoints for MQTT broker authentication.
 * It's designed to work with EMQX HTTP Authentication or similar systems.
 * 
 * When a device claims itself via /api/v1/devices/claim, it receives:
 * - username: deviceId (UUID)
 * - password: randomly generated 64-char hex token
 * 
 * These credentials are stored in device_credentials table and validated here.
 */

interface MqttAuthDto {
    username: string;
    password?: string;
    clientid?: string;
    topic?: string;
    acc?: number; // 1=subscribe, 2=publish
}

@ApiTags('MQTT Auth')
@ApiExcludeController() // Hide from Swagger - internal use only
@Controller('mqtt')
@SkipThrottle() // MQTT broker calls this frequently
export class MqttAuthController {
    private readonly logger = new Logger(MqttAuthController.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Authenticate MQTT client (device or system user)
     * Called by EMQX HTTP auth backend on every connect
     * 
     * Returns: { result: "allow" } or { result: "deny" }
     */
    @Public()
    @Post('auth')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'MQTT Authentication' })
    @ApiResponse({ status: 200, description: 'Authentication result' })
    async authenticate(@Body() body: MqttAuthDto) {
        const { username, password } = body;

        this.logger.debug(`MQTT auth request for user: ${username}`);

        // System users (API server, simulator) - check env vars with fallbacks
        const systemApiUser = process.env.MQTT_API_USERNAME || 'iot-api';
        const systemApiPass = process.env.MQTT_API_PASSWORD || 'dev-mqtt-password';
        const systemSimUser = process.env.MQTT_SIMULATOR_USERNAME || 'iot-simulator';
        const systemSimPass = process.env.MQTT_SIMULATOR_PASSWORD || 'dev-mqtt-password';

        if (username === systemApiUser && password === systemApiPass) {
            this.logger.log(`System user ${username} authenticated`);
            return { result: 'allow', is_superuser: true };
        }

        if (username === systemSimUser && password === systemSimPass) {
            this.logger.log(`Simulator ${username} authenticated`);
            return { result: 'allow', is_superuser: true };
        }

        // Device authentication - username is deviceId
        try {
            const credential = await this.prisma.deviceCredential.findFirst({
                where: {
                    deviceId: username,
                    type: 'mqtt',
                    revokedAt: null,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                orderBy: { createdAt: 'desc' },
            });

            if (!credential) {
                this.logger.warn(`MQTT auth denied: No credentials for ${username}`);
                return { result: 'deny' };
            }

            const isValid = await bcrypt.compare(password || '', credential.tokenHash);
            if (isValid) {
                this.logger.log(`Device ${username} authenticated successfully`);
                return { result: 'allow', is_superuser: false };
            }

            this.logger.warn(`MQTT auth denied: Invalid password for ${username}`);
            return { result: 'deny' };
        } catch (error) {
            this.logger.error(`MQTT auth error: ${error.message}`);
            return { result: 'deny' };
        }
    }

    /**
     * Check ACL permissions for topic access
     * Called by EMQX on every publish/subscribe
     * 
     * Topic pattern: iot/{tenantId}/devices/{deviceId}/{type}
     * Devices can only access their own topics
     */
    @Public()
    @Post('acl')
    @HttpCode(HttpStatus.OK)
    async checkAcl(@Body() body: MqttAuthDto) {
        const { username, topic, acc } = body;
        const action = acc === 1 ? 'subscribe' : 'publish';

        // System users have full access
        const systemApiUser = process.env.MQTT_API_USERNAME || 'iot-api';
        const systemSimUser = process.env.MQTT_SIMULATOR_USERNAME || 'iot-simulator';

        if (username === systemApiUser || username === systemSimUser) {
            return { result: 'allow' };
        }

        // Device ACL: iot/{tenantId}/devices/{deviceId}/{messageType}
        // Device can only access topics matching its own deviceId
        const parts = topic?.split('/') || [];

        if (parts.length >= 5 &&
            parts[0] === 'iot' &&
            parts[2] === 'devices' &&
            parts[3] === username) {

            const messageType = parts[4];

            // Write permissions: telemetry, ack, status
            if (acc === 2 && ['telemetry', 'ack', 'status'].includes(messageType)) {
                return { result: 'allow' };
            }

            // Read permissions: command
            if (acc === 1 && messageType === 'command') {
                return { result: 'allow' };
            }
        }

        this.logger.warn(`ACL denied: ${username} tried to ${action} on ${topic}`);
        return { result: 'deny' };
    }

    /**
     * Check if user is superuser (has full access)
     * Only system users (API, simulator) are superusers
     */
    @Public()
    @Post('superuser')
    @HttpCode(HttpStatus.OK)
    async checkSuperuser(@Body() body: { username: string }) {
        const systemApiUser = process.env.MQTT_API_USERNAME || 'iot-api';
        const systemSimUser = process.env.MQTT_SIMULATOR_USERNAME || 'iot-simulator';

        if (body.username === systemApiUser || body.username === systemSimUser) {
            return { result: 'allow' };
        }
        return { result: 'deny' };
    }
}
