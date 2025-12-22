#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { DeviceSimulator, SimulatorConfig, DevicePreset } from './simulator.js';

const DEVICE_PRESETS: Record<DevicePreset, { name: string; description: string }> = {
  thermostat: {
    name: 'Smart Thermostat',
    description: 'Temperature, humidity, power, mode',
  },
  switch: {
    name: 'Smart Switch',
    description: 'Power, energy, current, voltage',
  },
  'water-pump': {
    name: 'Water Pump Controller',
    description: 'Running, flow rate, pressure, motor temp',
  },
  'egg-incubator': {
    name: 'Egg Incubator',
    description: 'Temperature, humidity, rotation, heater, days',
  },
  'soil-sensor': {
    name: 'Soil Sensor',
    description: 'Moisture, pH, nitrogen, temperature',
  },
  generic: {
    name: 'Generic Sensor',
    description: 'Value, battery, signal strength',
  },
  // New device presets
  'temp-humidity': {
    name: 'Temperature & Humidity Monitor',
    description: 'Temperature, humidity, battery, RSSI (read-only)',
  },
  'relay-4ch': {
    name: 'Smart Relay (4 Channel)',
    description: 'Four relay switches with WiFi RSSI and uptime',
  },
  'led-strip': {
    name: 'LED Strip Controller',
    description: 'Power, brightness, RGB color, effects',
  },
  doorbell: {
    name: 'Smart Doorbell',
    description: 'Motion detection, door status, battery, actions',
  },
};

const program = new Command();

program
  .name('iot-simulator')
  .description('IoT Device Simulator for testing the platform')
  .version('0.0.1');

program
  .command('run')
  .description('Run a simulated device')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .requiredOption('-d, --device <deviceId>', 'Device ID')
  .option('--type <preset>', 'Device type preset (thermostat, switch, water-pump, egg-incubator, soil-sensor, generic)', 'thermostat')
  .option('-u, --mqtt-url <url>', 'MQTT broker URL', 'mqtt://localhost:1883')
  .option('-i, --interval <ms>', 'Telemetry interval in milliseconds', '5000')
  .option('--fail-rate <rate>', 'Command failure rate (0-1)', '0')
  .option('--latency <ms>', 'Command response latency in milliseconds', '100')
  .action(async (options) => {
    const preset = options.type as DevicePreset;
    const presetInfo = DEVICE_PRESETS[preset];

    if (!presetInfo) {
      console.error(chalk.red(`Unknown device type: ${preset}`));
      console.error(chalk.yellow('Available types: ' + Object.keys(DEVICE_PRESETS).join(', ')));
      process.exit(1);
    }

    console.log(chalk.blue.bold('🔌 IoT Device Simulator'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.white(`Tenant:     ${options.tenant}`));
    console.log(chalk.white(`Device:     ${options.device}`));
    console.log(chalk.cyan(`Type:       ${presetInfo.name}`));
    console.log(chalk.gray(`            ${presetInfo.description}`));
    console.log(chalk.white(`MQTT URL:   ${options.mqttUrl}`));
    console.log(chalk.white(`Interval:   ${options.interval}ms`));
    console.log(chalk.gray('─'.repeat(40)));

    const config: SimulatorConfig = {
      mqttUrl: options.mqttUrl,
      tenantId: options.tenant,
      deviceId: options.device,
      telemetryIntervalMs: parseInt(options.interval, 10),
      preset,
      commandFailRate: parseFloat(options.failRate),
      commandLatencyMs: parseInt(options.latency, 10),
    };

    const simulator = new DeviceSimulator(config);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n⏹  Stopping simulator...'));
      await simulator.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await simulator.stop();
      process.exit(0);
    });

    try {
      await simulator.start();
    } catch (error) {
      console.error(chalk.red('Failed to start simulator:'), error);
      process.exit(1);
    }
  });

program
  .command('presets')
  .description('List available device type presets')
  .action(() => {
    console.log(chalk.blue.bold('📋 Available Device Type Presets'));
    console.log(chalk.gray('─'.repeat(50)));

    for (const [key, info] of Object.entries(DEVICE_PRESETS)) {
      console.log(chalk.white.bold(`  ${key}`));
      console.log(chalk.cyan(`    ${info.name}`));
      console.log(chalk.gray(`    ${info.description}`));
      console.log('');
    }

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('Usage: iot-simulator run -t <tenant> -d <device> --type <preset>'));
  });

program
  .command('batch')
  .description('Run multiple simulated devices')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .requiredOption('-c, --count <number>', 'Number of devices to simulate')
  .option('-p, --prefix <prefix>', 'Device ID prefix', 'sim-device')
  .option('--type <preset>', 'Device type preset', 'thermostat')
  .option('-u, --mqtt-url <url>', 'MQTT broker URL', 'mqtt://localhost:1883')
  .option('-i, --interval <ms>', 'Telemetry interval in milliseconds', '5000')
  .action(async (options) => {
    const preset = options.type as DevicePreset;

    console.log(chalk.blue.bold('🔌 IoT Device Simulator (Batch Mode)'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.white(`Tenant:     ${options.tenant}`));
    console.log(chalk.white(`Count:      ${options.count} devices`));
    console.log(chalk.white(`Prefix:     ${options.prefix}`));
    console.log(chalk.cyan(`Type:       ${DEVICE_PRESETS[preset]?.name || preset}`));
    console.log(chalk.white(`MQTT URL:   ${options.mqttUrl}`));
    console.log(chalk.gray('─'.repeat(40)));

    const count = parseInt(options.count, 10);
    const simulators: DeviceSimulator[] = [];

    for (let i = 0; i < count; i++) {
      const config: SimulatorConfig = {
        mqttUrl: options.mqttUrl,
        tenantId: options.tenant,
        deviceId: `${options.prefix}-${i + 1}`,
        telemetryIntervalMs: parseInt(options.interval, 10) + Math.random() * 1000,
        preset,
        commandFailRate: 0.1,
        commandLatencyMs: 50 + Math.random() * 200,
      };

      simulators.push(new DeviceSimulator(config));
    }

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log(chalk.yellow('\n⏹  Stopping all simulators...'));
      await Promise.all(simulators.map(s => s.stop()));
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    try {
      await Promise.all(simulators.map(s => s.start()));
      console.log(chalk.green(`✓ All ${count} devices connected and running`));
    } catch (error) {
      console.error(chalk.red('Failed to start simulators:'), error);
      process.exit(1);
    }
  });

program.parse();
