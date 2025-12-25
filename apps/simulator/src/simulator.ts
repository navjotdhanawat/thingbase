import mqtt, { MqttClient } from 'mqtt';
import chalk from 'chalk';
import { MQTT_TOPICS } from '@thingbase/shared';

export type DevicePreset =
  | 'thermostat'
  | 'switch'
  | 'water-pump'
  | 'egg-incubator'
  | 'soil-sensor'
  | 'generic'
  // New presets
  | 'temp-humidity'
  | 'relay-4ch'
  | 'led-strip'
  | 'doorbell';

export interface SimulatorConfig {
  mqttUrl: string;
  mqttUsername?: string;  // MQTT authentication username
  mqttPassword?: string;  // MQTT authentication password
  tenantId: string;
  deviceId: string;
  telemetryIntervalMs: number;
  preset?: DevicePreset;
  // Legacy config for backward compatibility
  temperatureRange?: { min: number; max: number };
  humidityRange?: { min: number; max: number };
  commandFailRate: number;
  commandLatencyMs: number;
}

interface DeviceState {
  power: boolean;
  brightness: number;
  color: string;
  mode: string;
  [key: string]: unknown;
}

// Telemetry generators for different device types
const TELEMETRY_GENERATORS: Record<DevicePreset, () => Record<string, unknown>> = {
  thermostat: () => ({
    temperature: randomInRange(18, 30, 1),
    humidity: randomInRange(40, 80, 1),
    power: Math.random() > 0.3,
    mode: randomChoice(['off', 'heat', 'cool', 'auto']),
  }),

  switch: () => ({
    power: Math.random() > 0.5,
    energy_kwh: randomInRange(0, 15, 2),
    current: randomInRange(0, 15, 2),
    voltage: randomInRange(110, 125, 0),
  }),

  'water-pump': () => ({
    running: Math.random() > 0.4,
    flow_rate: randomInRange(0, 100, 1),
    pressure: randomInRange(100, 500, 0),
    motor_temp: randomInRange(30, 65, 1),
  }),

  'egg-incubator': () => {
    // Egg incubation specific ranges
    return {
      temperature: randomInRange(37.2, 38.5, 1),
      humidity: randomInRange(55, 75, 1),
      rotation_angle: Math.floor(Math.random() * 90),
      heater_on: Math.random() > 0.5,
      days_elapsed: Math.floor(Math.random() * 21) + 1,
    };
  },

  'soil-sensor': () => ({
    moisture: randomInRange(15, 85, 1),
    ph: randomInRange(5.5, 7.5, 1),
    nitrogen: randomInRange(50, 300, 0),
    temperature: randomInRange(12, 28, 1),
  }),

  generic: () => ({
    value: randomInRange(0, 100, 2),
    battery: Math.floor(Math.random() * 20 + 80),
    rssi: Math.floor(Math.random() * 40 - 80),
    temp: randomInRange(18, 30, 1),
    humidity: randomInRange(40, 80, 1),
    power: Math.random() > 0.5,
    rotation: Math.floor(Math.random() * 360),
    // boolean values
    spray: randomChoice([true, false]),

  }),

  // New device presets
  'temp-humidity': () => ({
    temperature: randomInRange(18, 28, 1),
    humidity: randomInRange(40, 70, 1),
    battery: Math.floor(Math.random() * 20 + 80),
    rssi: Math.floor(Math.random() * 40 - 80),
  }),

  'relay-4ch': () => ({
    relay1: Math.random() > 0.5,
    relay2: Math.random() > 0.5,
    relay3: Math.random() > 0.5,
    relay4: Math.random() > 0.5,
    wifi_rssi: Math.floor(Math.random() * 40 - 80),
    uptime: Math.floor(Math.random() * 86400),
  }),

  'led-strip': () => ({
    power: Math.random() > 0.3,
    brightness: Math.floor(Math.random() * 100),
    color_r: Math.floor(Math.random() * 255),
    color_g: Math.floor(Math.random() * 255),
    color_b: Math.floor(Math.random() * 255),
    effect: randomChoice(['solid', 'rainbow', 'pulse', 'chase', 'twinkle', 'fire']),
  }),

  doorbell: () => ({
    motion_detected: Math.random() > 0.7,
    door_open: Math.random() > 0.8,
    battery: Math.floor(Math.random() * 20 + 80),
    last_ring: Math.random() > 0.9 ? new Date().toISOString() : null,
  }),
};

function randomInRange(min: number, max: number, precision: number): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(precision));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class DeviceSimulator {
  private client: MqttClient | null = null;
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;
  private state: DeviceState;
  private readonly config: SimulatorConfig;
  private readonly clientId: string;
  private readonly preset: DevicePreset;

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.clientId = `sim-${config.deviceId}-${Date.now()}`;
    this.preset = config.preset || 'thermostat';

    // Initialize default state
    this.state = {
      power: true,
      brightness: 100,
      color: '#ffffff',
      mode: 'normal',
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { mqttUrl, tenantId, deviceId } = this.config;

      // Configure LWT (Last Will and Testament)
      const statusTopic = MQTT_TOPICS.STATUS(tenantId, deviceId);

      this.client = mqtt.connect(mqttUrl, {
        clientId: this.clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
        // MQTT authentication credentials
        username: this.config.mqttUsername,
        password: this.config.mqttPassword,
        will: {
          topic: statusTopic,
          payload: JSON.stringify({ status: 'offline', timestamp: new Date().toISOString() }),
          qos: 1,
          retain: true,
        },
      });

      this.client.on('connect', () => {
        console.log(chalk.green(`✓ Device ${deviceId} connected to MQTT broker`));
        console.log(chalk.cyan(`  Device Type: ${this.preset}`));

        // Publish online status
        this.publishStatus('online');

        // Subscribe to command topic
        const commandTopic = MQTT_TOPICS.COMMAND(tenantId, deviceId);
        this.client!.subscribe(commandTopic, { qos: 1 }, (err) => {
          if (err) {
            console.error(chalk.red(`Failed to subscribe to commands: ${err.message}`));
          } else {
            console.log(chalk.blue(`📡 Subscribed to: ${commandTopic}`));
          }
        });

        // Start telemetry
        this.startTelemetry();
        resolve();
      });

      this.client.on('message', (topic, payload) => {
        this.handleCommand(payload.toString());
      });

      this.client.on('error', (error) => {
        console.error(chalk.red(`MQTT error: ${error.message}`));
        reject(error);
      });

      this.client.on('close', () => {
        console.log(chalk.yellow(`Device ${deviceId} disconnected`));
      });

      this.client.on('reconnect', () => {
        console.log(chalk.yellow(`Device ${deviceId} reconnecting...`));
      });
    });
  }

  async stop(): Promise<void> {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }

    if (this.client) {
      // Publish offline status
      await this.publishStatus('offline');

      return new Promise((resolve) => {
        this.client!.end(false, () => {
          console.log(chalk.gray(`Device ${this.config.deviceId} stopped`));
          resolve();
        });
      });
    }
  }

  private startTelemetry(): void {
    const { telemetryIntervalMs, deviceId } = this.config;

    console.log(chalk.blue(`📊 Starting telemetry (every ${telemetryIntervalMs}ms)`));

    // this.telemetryTimer = setInterval(() => {
    //   this.publishTelemetry();
    // }, telemetryIntervalMs);

    // Publish initial telemetry
    this.publishTelemetry();
  }

  private publishTelemetry(): void {
    const { tenantId, deviceId } = this.config;

    // Generate telemetry based on preset
    const generator = TELEMETRY_GENERATORS[this.preset];
    const sensorData = generator();

    // Add common fields
    const telemetry = {
      timestamp: new Date().toISOString(),
      data: {
        ...sensorData,
        battery: Math.floor(Math.random() * 20 + 80), // 80-100%
        rssi: Math.floor(Math.random() * 40 - 80), // -80 to -40 dBm
      },
    };

    const topic = MQTT_TOPICS.TELEMETRY(tenantId, deviceId);
    this.client?.publish(topic, JSON.stringify(telemetry), { qos: 0 });

    // Format output based on preset
    const summary = this.formatTelemetrySummary(sensorData);
    console.log(chalk.gray(`  📤 Telemetry: ${summary}`));
  }

  private formatTelemetrySummary(data: Record<string, unknown>): string {
    const entries = Object.entries(data)
      .filter(([key]) => !['battery', 'rssi'].includes(key))
      .slice(0, 4)
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return `${key}=${value ? 'ON' : 'OFF'}`;
        }
        if (typeof value === 'number') {
          const unit = this.getUnit(key);
          return `${key}=${value}${unit}`;
        }
        return `${key}=${value}`;
      });

    return entries.join(', ');
  }

  private getUnit(key: string): string {
    const units: Record<string, string> = {
      temperature: '°C',
      humidity: '%',
      pressure: 'kPa',
      flow_rate: 'L/min',
      motor_temp: '°C',
      moisture: '%',
      ph: 'pH',
      nitrogen: 'ppm',
      voltage: 'V',
      current: 'A',
      energy_kwh: 'kWh',
      rotation_angle: '°',
      days_elapsed: 'd',
    };
    return units[key] || '';
  }

  private publishStatus(status: 'online' | 'offline'): void {
    const { tenantId, deviceId } = this.config;
    const topic = MQTT_TOPICS.STATUS(tenantId, deviceId);
    const payload = {
      status,
      timestamp: new Date().toISOString(),
    };

    this.client?.publish(topic, JSON.stringify(payload), { qos: 1, retain: true });
    console.log(chalk.magenta(`  📡 Status: ${status}`));
  }

  private handleCommand(payloadStr: string): void {
    const { tenantId, deviceId, commandFailRate, commandLatencyMs } = this.config;

    try {
      const command = JSON.parse(payloadStr);
      const { correlationId, action, params } = command;

      console.log(chalk.cyan(`  📥 Command received: ${action} (${correlationId})`));

      // Simulate processing delay
      setTimeout(() => {
        // Simulate random failures
        const shouldFail = Math.random() < commandFailRate;

        let ackPayload: Record<string, unknown>;

        if (shouldFail) {
          ackPayload = {
            correlationId,
            status: 'error',
            error: 'Simulated failure',
            timestamp: new Date().toISOString(),
          };
          console.log(chalk.red(`  ❌ Command failed: ${action}`));
        } else {
          // Process the command
          this.processCommand(action, params);

          ackPayload = {
            correlationId,
            status: 'success',
            state: this.state,
            timestamp: new Date().toISOString(),
          };
          console.log(chalk.green(`  ✓ Command executed: ${action}`));
        }

        // Publish acknowledgement
        const ackTopic = MQTT_TOPICS.ACK(tenantId, deviceId);
        this.client?.publish(ackTopic, JSON.stringify(ackPayload), { qos: 1 });

      }, commandLatencyMs);

    } catch (error) {
      console.error(chalk.red('Failed to parse command:'), error);
    }
  }

  private processCommand(action: string, params: Record<string, unknown>): void {
    switch (action) {
      case 'set_state':
        // Handle dynamic key-value state updates from widget controls
        for (const [key, value] of Object.entries(params)) {
          this.state[key] = value;
          console.log(chalk.blue(`    → Set ${key} = ${JSON.stringify(value)}`));
        }
        break;
      case 'setPower':
        this.state.power = params.power as boolean;
        break;
      case 'setBrightness':
        this.state.brightness = params.brightness as number;
        break;
      case 'setColor':
        this.state.color = params.color as string;
        break;
      case 'setMode':
        this.state.mode = params.mode as string;
        break;
      case 'reset':
        this.state = {
          power: true,
          brightness: 100,
          color: '#ffffff',
          mode: 'normal',
        };
        break;
      default:
        // Handle any action as a state update if params are provided
        if (Object.keys(params).length > 0) {
          for (const [key, value] of Object.entries(params)) {
            this.state[key] = value;
            console.log(chalk.blue(`    → Set ${key} = ${JSON.stringify(value)}`));
          }
        } else {
          console.log(chalk.yellow(`  Unknown action: ${action}`));
        }
    }
  }
}
