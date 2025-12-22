import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MQTT_TOPICS } from '@thingbase/shared';

export interface MqttMessage {
  topic: string;
  payload: Buffer;
  tenantId?: string;
  deviceId?: string;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private messageHandlers: Map<string, (message: MqttMessage) => void> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const mqttUrl = this.configService.get<string>('mqtt.url');
    
    try {
      this.client = mqtt.connect(mqttUrl!, {
        clientId: `iot-api-${Date.now()}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        this.logger.error('MQTT connection error', error);
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });

      this.client.on('reconnect', () => {
        this.logger.warn('Reconnecting to MQTT broker...');
      });
    } catch (error) {
      this.logger.error('Failed to connect to MQTT broker', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(false, () => {
          this.logger.log('Disconnected from MQTT broker');
          resolve();
        });
      });
    }
  }

  /**
   * Subscribe to device topics
   */
  private subscribeToTopics() {
    if (!this.client) return;

    const topics = [
      MQTT_TOPICS.ALL_TELEMETRY,
      MQTT_TOPICS.ALL_ACK,
      MQTT_TOPICS.ALL_STATUS,
    ];

    this.client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to topics', err);
      } else {
        this.logger.log(`Subscribed to topics: ${topics.join(', ')}`);
      }
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private handleMessage(topic: string, payload: Buffer) {
    // Parse tenant and device ID from topic
    const topicParts = topic.split('/');
    const tenantId = topicParts[1];
    const deviceId = topicParts[3];
    const messageType = topicParts[4]; // telemetry, ack, status

    const message: MqttMessage = {
      topic,
      payload,
      tenantId,
      deviceId,
    };

    // Find and call appropriate handler
    const handler = this.messageHandlers.get(messageType);
    if (handler) {
      try {
        handler(message);
      } catch (error) {
        this.logger.error(`Error handling ${messageType} message`, error);
      }
    } else {
      this.logger.debug(`No handler for message type: ${messageType}`);
    }
  }

  /**
   * Register a handler for a message type
   */
  registerHandler(messageType: string, handler: (message: MqttMessage) => void) {
    this.messageHandlers.set(messageType, handler);
    this.logger.log(`Registered handler for ${messageType} messages`);
  }

  /**
   * Publish a command to a device
   */
  async publishCommand(tenantId: string, deviceId: string, payload: object): Promise<void> {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    const topic = MQTT_TOPICS.COMMAND(tenantId, deviceId);
    const message = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to publish to ${topic}`, err);
          reject(err);
        } else {
          this.logger.debug(`Published command to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Check if MQTT client is connected
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}


