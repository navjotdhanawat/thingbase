import { z } from 'zod';

// ============================================================================
// DEVICE TYPE FIELD SCHEMA
// ============================================================================

// Supported field types for telemetry data
export const fieldTypeSchema = z.enum(['number', 'boolean', 'string', 'enum']);
export type FieldType = z.infer<typeof fieldTypeSchema>;

// Single field definition in device type schema
export const deviceFieldSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, 
    'Key must start with lowercase letter and contain only lowercase letters, numbers, and underscores'),
  label: z.string().min(1).max(100),
  type: fieldTypeSchema,
  unit: z.string().max(20).optional(), // e.g., "°C", "%", "kPa", "L/min"
  icon: z.string().max(50).optional(), // lucide icon name
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // hex color
  // For numeric fields
  min: z.number().optional(),
  max: z.number().optional(),
  precision: z.number().int().min(0).max(6).optional(), // decimal places
  // For enum fields
  values: z.array(z.string()).optional(),
  // For charts
  chartType: z.enum(['line', 'bar', 'gauge', 'boolean']).optional(),
  showInStats: z.boolean().optional(), // default true in UI
  showInChart: z.boolean().optional(), // default true in UI
});

export type DeviceField = z.infer<typeof deviceFieldSchema>;

// Complete device type schema (stored in DeviceType.schema)
export const deviceTypeSchemaDefinition = z.object({
  fields: z.array(deviceFieldSchema).min(1).max(50),
});

export type DeviceTypeSchema = z.infer<typeof deviceTypeSchemaDefinition>;

// ============================================================================
// DEVICE TYPE CRUD SCHEMAS
// ============================================================================

export const createDeviceTypeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z][a-z0-9-]*$/, 
    'Slug must start with lowercase letter and contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional().default('cpu'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6366f1'),
  schema: deviceTypeSchemaDefinition,
});

export type CreateDeviceTypeInput = z.infer<typeof createDeviceTypeSchema>;

export const updateDeviceTypeSchema = createDeviceTypeSchema.partial();

export type UpdateDeviceTypeInput = z.infer<typeof updateDeviceTypeSchema>;

// ============================================================================
// PRESET DEVICE TYPES
// ============================================================================

export const DEVICE_TYPE_PRESETS: Record<string, Omit<CreateDeviceTypeInput, 'slug'> & { slug: string }> = {
  thermostat: {
    name: 'Smart Thermostat',
    slug: 'thermostat',
    description: 'Temperature and humidity sensor with climate control',
    icon: 'thermometer',
    color: '#f97316',
    schema: {
      fields: [
        { key: 'temperature', label: 'Temperature', type: 'number', unit: '°C', icon: 'thermometer', color: '#f97316', min: -40, max: 80, precision: 1, chartType: 'line' },
        { key: 'humidity', label: 'Humidity', type: 'number', unit: '%', icon: 'droplets', color: '#3b82f6', min: 0, max: 100, precision: 1, chartType: 'line' },
        { key: 'power', label: 'Power', type: 'boolean', icon: 'power', chartType: 'boolean' },
        { key: 'mode', label: 'Mode', type: 'enum', values: ['off', 'heat', 'cool', 'auto'], icon: 'settings' },
      ],
    },
  },
  switch: {
    name: 'Smart Switch',
    slug: 'switch',
    description: 'Smart power switch with energy monitoring',
    icon: 'toggle-left',
    color: '#22c55e',
    schema: {
      fields: [
        { key: 'power', label: 'Power', type: 'boolean', icon: 'power', chartType: 'boolean' },
        { key: 'energy_kwh', label: 'Energy', type: 'number', unit: 'kWh', icon: 'zap', color: '#eab308', precision: 2, chartType: 'line' },
        { key: 'current', label: 'Current', type: 'number', unit: 'A', icon: 'activity', color: '#f97316', precision: 2, chartType: 'line' },
        { key: 'voltage', label: 'Voltage', type: 'number', unit: 'V', icon: 'gauge', color: '#8b5cf6', precision: 0, chartType: 'line' },
      ],
    },
  },
  'water-pump': {
    name: 'Water Pump Controller',
    slug: 'water-pump',
    description: 'Smart water pump with flow and pressure monitoring',
    icon: 'waves',
    color: '#06b6d4',
    schema: {
      fields: [
        { key: 'running', label: 'Running', type: 'boolean', icon: 'power', chartType: 'boolean' },
        { key: 'flow_rate', label: 'Flow Rate', type: 'number', unit: 'L/min', icon: 'waves', color: '#06b6d4', min: 0, max: 500, precision: 1, chartType: 'line' },
        { key: 'pressure', label: 'Pressure', type: 'number', unit: 'kPa', icon: 'gauge', color: '#8b5cf6', min: 0, max: 1000, precision: 0, chartType: 'line' },
        { key: 'motor_temp', label: 'Motor Temp', type: 'number', unit: '°C', icon: 'thermometer', color: '#f97316', precision: 1, chartType: 'line' },
      ],
    },
  },
  'egg-incubator': {
    name: 'Egg Incubator',
    slug: 'egg-incubator',
    description: 'Smart egg incubator with climate control and rotation',
    icon: 'egg',
    color: '#fbbf24',
    schema: {
      fields: [
        { key: 'temperature', label: 'Temperature', type: 'number', unit: '°C', icon: 'thermometer', color: '#f97316', min: 35, max: 42, precision: 1, chartType: 'line' },
        { key: 'humidity', label: 'Humidity', type: 'number', unit: '%', icon: 'droplets', color: '#3b82f6', min: 40, max: 90, precision: 1, chartType: 'line' },
        { key: 'rotation_angle', label: 'Rotation', type: 'number', unit: '°', icon: 'rotate-cw', color: '#22c55e', min: 0, max: 90, precision: 0, chartType: 'line' },
        { key: 'heater_on', label: 'Heater', type: 'boolean', icon: 'flame', chartType: 'boolean' },
        { key: 'days_elapsed', label: 'Days', type: 'number', unit: 'days', icon: 'calendar', color: '#6366f1', precision: 0, showInChart: false },
      ],
    },
  },
  'soil-sensor': {
    name: 'Soil Sensor',
    slug: 'soil-sensor',
    description: 'Agricultural soil monitoring sensor',
    icon: 'sprout',
    color: '#84cc16',
    schema: {
      fields: [
        { key: 'moisture', label: 'Soil Moisture', type: 'number', unit: '%', icon: 'droplets', color: '#3b82f6', min: 0, max: 100, precision: 1, chartType: 'line' },
        { key: 'ph', label: 'pH Level', type: 'number', unit: 'pH', icon: 'flask-conical', color: '#a855f7', min: 0, max: 14, precision: 1, chartType: 'line' },
        { key: 'nitrogen', label: 'Nitrogen', type: 'number', unit: 'ppm', icon: 'atom', color: '#22c55e', min: 0, max: 500, precision: 0, chartType: 'bar' },
        { key: 'temperature', label: 'Soil Temp', type: 'number', unit: '°C', icon: 'thermometer', color: '#f97316', precision: 1, chartType: 'line' },
      ],
    },
  },
  'generic-sensor': {
    name: 'Generic Sensor',
    slug: 'generic-sensor',
    description: 'Generic IoT sensor with basic telemetry',
    icon: 'cpu',
    color: '#6366f1',
    schema: {
      fields: [
        { key: 'value', label: 'Value', type: 'number', icon: 'activity', color: '#6366f1', precision: 2, chartType: 'line' },
        { key: 'battery', label: 'Battery', type: 'number', unit: '%', icon: 'battery', color: '#22c55e', min: 0, max: 100, precision: 0, chartType: 'line' },
        { key: 'rssi', label: 'Signal', type: 'number', unit: 'dBm', icon: 'wifi', color: '#06b6d4', min: -100, max: 0, precision: 0, showInChart: false },
      ],
    },
  },
};

export const DEVICE_TYPE_PRESET_SLUGS = Object.keys(DEVICE_TYPE_PRESETS) as (keyof typeof DEVICE_TYPE_PRESETS)[];

