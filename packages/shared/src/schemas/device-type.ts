import { z } from 'zod';

// ============================================================================
// DEVICE TYPE FIELD SCHEMA
// ============================================================================

// Supported field types for telemetry data
export const fieldTypeSchema = z.enum(['number', 'boolean', 'string', 'enum']);
export type FieldType = z.infer<typeof fieldTypeSchema>;

// Data flow direction for the field
export const fieldModeSchema = z.enum(['read', 'write', 'readwrite']);
export type FieldMode = z.infer<typeof fieldModeSchema>;

// Widget types for UI rendering
export const widgetTypeSchema = z.enum([
  'value',    // Simple text/number display
  'gauge',    // Circular gauge meter
  'switch',   // Boolean toggle switch
  'slider',   // Numeric range slider
  'dropdown', // Enum dropdown select
  'button',   // One-shot action button
]);
export type WidgetType = z.infer<typeof widgetTypeSchema>;

// Single field definition in device type schema
export const deviceFieldSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/,
    'Key must start with lowercase letter and contain only lowercase letters, numbers, and underscores'),
  label: z.string().min(1).max(100),
  type: fieldTypeSchema,

  // Data flow direction (NEW)
  // - 'read': Device sends data, UI displays (sensors)
  // - 'write': UI sends data, device receives (one-shot commands)
  // - 'readwrite': Bidirectional (settings/controls)
  mode: fieldModeSchema.default('read'),

  // Widget type hint for UI rendering (NEW)
  // If not specified, will be auto-inferred from type + mode
  widget: widgetTypeSchema.optional(),

  // Common properties
  unit: z.string().max(20).optional(), // e.g., "°C", "%", "kPa", "L/min"
  icon: z.string().max(50).optional(), // lucide icon name
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // hex color

  // For numeric fields
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(), // Increment step for sliders (NEW)
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
// WIDGET INFERENCE HELPER
// ============================================================================

/**
 * Infer the widget type from field type and mode if not explicitly set
 */
export function inferWidgetType(field: DeviceField): WidgetType {
  // If widget is explicitly set, use it
  if (field.widget) return field.widget;

  // Read-only fields
  if (field.mode === 'read') {
    // Use gauge for numbers with min/max defined
    if (field.type === 'number' && field.min !== undefined && field.max !== undefined) {
      return 'gauge';
    }
    return 'value';
  }

  // Write-only fields (actions/commands)
  if (field.mode === 'write') {
    return 'button';
  }

  // Read-write fields (controls)
  switch (field.type) {
    case 'boolean':
      return 'switch';
    case 'enum':
      return 'dropdown';
    case 'number':
      return 'slider';
    default:
      return 'value';
  }
}

// ============================================================================
// PRESET DEVICE TYPES
// ============================================================================

export const DEVICE_TYPE_PRESETS: Record<string, Omit<CreateDeviceTypeInput, 'slug'> & { slug: string }> = {
  // -------------------------------------------------------------------------
  // 1. TEMPERATURE & HUMIDITY MONITOR (Read-only sensors)
  // -------------------------------------------------------------------------
  'temp-humidity': {
    name: 'Temperature & Humidity Monitor',
    slug: 'temp-humidity',
    description: 'Environmental monitoring sensor for temperature and humidity',
    icon: 'thermometer',
    color: '#f97316',
    schema: {
      fields: [
        {
          key: 'temperature',
          label: 'Temperature',
          type: 'number',
          mode: 'read',
          widget: 'gauge',
          unit: '°C',
          icon: 'thermometer',
          color: '#f97316',
          min: -20,
          max: 50,
          precision: 1,
          chartType: 'line'
        },
        {
          key: 'humidity',
          label: 'Humidity',
          type: 'number',
          mode: 'read',
          widget: 'gauge',
          unit: '%',
          icon: 'droplets',
          color: '#3b82f6',
          min: 0,
          max: 100,
          precision: 1,
          chartType: 'line'
        },
        {
          key: 'battery',
          label: 'Battery',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: '%',
          icon: 'battery',
          color: '#22c55e',
          min: 0,
          max: 100,
          precision: 0
        },
        {
          key: 'rssi',
          label: 'Signal Strength',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: 'dBm',
          icon: 'wifi',
          color: '#6366f1',
          min: -100,
          max: 0,
          precision: 0,
          showInChart: false
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // 2. SMART RELAY 4-CHANNEL (ReadWrite switches)
  // -------------------------------------------------------------------------
  'relay-4ch': {
    name: 'Smart Relay (4 Channel)',
    slug: 'relay-4ch',
    description: '4-channel WiFi relay for controlling lights, fans, and appliances',
    icon: 'toggle-left',
    color: '#22c55e',
    schema: {
      fields: [
        // Control channels (readwrite)
        {
          key: 'relay1',
          label: 'Channel 1',
          type: 'boolean',
          mode: 'readwrite',
          widget: 'switch',
          icon: 'power',
          color: '#22c55e',
          chartType: 'boolean'
        },
        {
          key: 'relay2',
          label: 'Channel 2',
          type: 'boolean',
          mode: 'readwrite',
          widget: 'switch',
          icon: 'power',
          color: '#3b82f6',
          chartType: 'boolean'
        },
        {
          key: 'relay3',
          label: 'Channel 3',
          type: 'boolean',
          mode: 'readwrite',
          widget: 'switch',
          icon: 'power',
          color: '#f97316',
          chartType: 'boolean'
        },
        {
          key: 'relay4',
          label: 'Channel 4',
          type: 'boolean',
          mode: 'readwrite',
          widget: 'switch',
          icon: 'power',
          color: '#a855f7',
          chartType: 'boolean'
        },
        // Read-only monitoring
        {
          key: 'wifi_rssi',
          label: 'WiFi Signal',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: 'dBm',
          icon: 'wifi',
          color: '#6366f1',
          showInChart: false
        },
        {
          key: 'uptime',
          label: 'Uptime',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: 's',
          icon: 'clock',
          color: '#64748b',
          showInChart: false
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // 3. SMART THERMOSTAT (Mixed: read sensors + readwrite controls)
  // -------------------------------------------------------------------------
  'thermostat': {
    name: 'Smart Thermostat',
    slug: 'thermostat',
    description: 'Climate control with temperature/humidity sensing and HVAC control',
    icon: 'thermometer-sun',
    color: '#f97316',
    schema: {
      fields: [
        // Sensors (read-only)
        {
          key: 'current_temp',
          label: 'Current Temperature',
          type: 'number',
          mode: 'read',
          widget: 'gauge',
          unit: '°C',
          icon: 'thermometer',
          color: '#f97316',
          min: 10,
          max: 40,
          precision: 1,
          chartType: 'line'
        },
        {
          key: 'humidity',
          label: 'Humidity',
          type: 'number',
          mode: 'read',
          widget: 'gauge',
          unit: '%',
          icon: 'droplets',
          color: '#3b82f6',
          min: 0,
          max: 100,
          precision: 0,
          chartType: 'line'
        },
        // Controls (readwrite)
        {
          key: 'target_temp',
          label: 'Target Temperature',
          type: 'number',
          mode: 'readwrite',
          widget: 'slider',
          unit: '°C',
          icon: 'target',
          color: '#ef4444',
          min: 16,
          max: 30,
          step: 0.5,
          precision: 1
        },
        {
          key: 'power',
          label: 'Power',
          type: 'boolean',
          mode: 'readwrite',
          widget: 'switch',
          icon: 'power',
          chartType: 'boolean'
        },
        {
          key: 'mode',
          label: 'Mode',
          type: 'enum',
          mode: 'readwrite',
          widget: 'dropdown',
          values: ['off', 'heat', 'cool', 'auto'],
          icon: 'settings-2'
        },
        {
          key: 'fan_speed',
          label: 'Fan Speed',
          type: 'number',
          mode: 'readwrite',
          widget: 'slider',
          unit: '%',
          icon: 'fan',
          color: '#06b6d4',
          min: 0,
          max: 100,
          step: 10
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // 4. LED STRIP CONTROLLER (ReadWrite controls - no sensors)
  // -------------------------------------------------------------------------
  'led-strip': {
    name: 'LED Strip Controller',
    slug: 'led-strip',
    description: 'RGB LED strip controller with brightness and effects',
    icon: 'lightbulb',
    color: '#a855f7',
    schema: {
      fields: [
        {
          key: 'power',
          label: 'Power',
          type: 'boolean',
          mode: 'readwrite',
          widget: 'switch',
          icon: 'power',
          color: '#22c55e'
        },
        {
          key: 'brightness',
          label: 'Brightness',
          type: 'number',
          mode: 'readwrite',
          widget: 'slider',
          unit: '%',
          icon: 'sun',
          color: '#fbbf24',
          min: 0,
          max: 100,
          step: 5
        },
        {
          key: 'color_r',
          label: 'Red',
          type: 'number',
          mode: 'readwrite',
          widget: 'slider',
          icon: 'palette',
          color: '#ef4444',
          min: 0,
          max: 255,
          step: 1
        },
        {
          key: 'color_g',
          label: 'Green',
          type: 'number',
          mode: 'readwrite',
          widget: 'slider',
          icon: 'palette',
          color: '#22c55e',
          min: 0,
          max: 255,
          step: 1
        },
        {
          key: 'color_b',
          label: 'Blue',
          type: 'number',
          mode: 'readwrite',
          widget: 'slider',
          icon: 'palette',
          color: '#3b82f6',
          min: 0,
          max: 255,
          step: 1
        },
        {
          key: 'effect',
          label: 'Effect',
          type: 'enum',
          mode: 'readwrite',
          widget: 'dropdown',
          values: ['solid', 'rainbow', 'pulse', 'chase', 'twinkle', 'fire'],
          icon: 'sparkles'
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // 5. SMART DOORBELL (Read status + Write actions)
  // -------------------------------------------------------------------------
  'doorbell': {
    name: 'Smart Doorbell',
    slug: 'doorbell',
    description: 'Smart doorbell with motion detection and door lock control',
    icon: 'bell',
    color: '#8b5cf6',
    schema: {
      fields: [
        // Read-only status
        {
          key: 'motion_detected',
          label: 'Motion Detected',
          type: 'boolean',
          mode: 'read',
          widget: 'value',
          icon: 'eye',
          color: '#f97316'
        },
        {
          key: 'door_open',
          label: 'Door Status',
          type: 'boolean',
          mode: 'read',
          widget: 'value',
          icon: 'door-open',
          color: '#3b82f6'
        },
        {
          key: 'battery',
          label: 'Battery',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: '%',
          icon: 'battery',
          color: '#22c55e',
          min: 0,
          max: 100
        },
        {
          key: 'last_ring',
          label: 'Last Ring',
          type: 'string',
          mode: 'read',
          widget: 'value',
          icon: 'bell'
        },
        // Write-only actions (buttons)
        {
          key: 'unlock',
          label: 'Unlock Door',
          type: 'boolean',
          mode: 'write',
          widget: 'button',
          icon: 'lock-open',
          color: '#22c55e'
        },
        {
          key: 'ring_test',
          label: 'Test Ring',
          type: 'boolean',
          mode: 'write',
          widget: 'button',
          icon: 'bell-ring',
          color: '#8b5cf6'
        },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // LEGACY: Keep generic sensor for backward compatibility
  // -------------------------------------------------------------------------
  'generic-sensor': {
    name: 'Generic Sensor',
    slug: 'generic-sensor',
    description: 'Generic IoT sensor with basic telemetry',
    icon: 'cpu',
    color: '#6366f1',
    schema: {
      fields: [
        {
          key: 'value',
          label: 'Value',
          type: 'number',
          mode: 'read',
          widget: 'value',
          icon: 'activity',
          color: '#6366f1',
          precision: 2,
          chartType: 'line'
        },
        {
          key: 'battery',
          label: 'Battery',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: '%',
          icon: 'battery',
          color: '#22c55e',
          min: 0,
          max: 100,
          precision: 0,
          chartType: 'line'
        },
        {
          key: 'rssi',
          label: 'Signal',
          type: 'number',
          mode: 'read',
          widget: 'value',
          unit: 'dBm',
          icon: 'wifi',
          color: '#06b6d4',
          min: -100,
          max: 0,
          precision: 0,
          showInChart: false
        },
      ],
    },
  },
};

export const DEVICE_TYPE_PRESET_SLUGS = Object.keys(DEVICE_TYPE_PRESETS) as (keyof typeof DEVICE_TYPE_PRESETS)[];
