'use client';

import {
    Thermometer,
    Droplets,
    Battery,
    Wifi,
    Power,
    ToggleLeft,
    Zap,
    Activity,
    Gauge,
    Waves,
    Clock,
    Settings,
    Settings2,
    Fan,
    Sun,
    Palette,
    Sparkles,
    Bell,
    BellRing,
    Eye,
    DoorOpen,
    LockOpen,
    Target,
    Cpu,
    Lightbulb,
    RotateCw,
    Flame,
    Calendar,
    Leaf,
    FlaskConical,
    Atom,
    Egg,
    LucideIcon,
} from 'lucide-react';

import { ValueWidget } from './value-widget';
import { GaugeWidget } from './gauge-widget';
import { SwitchWidget } from './switch-widget';
import { SliderWidget } from './slider-widget';
import { DropdownWidget } from './dropdown-widget';
import { ButtonWidget } from './button-widget';

// Device field definition from the device type schema
export interface DeviceField {
    key: string;
    label: string;
    type: 'number' | 'boolean' | 'string' | 'enum';
    mode: 'read' | 'write' | 'readwrite';
    widget?: 'value' | 'gauge' | 'switch' | 'slider' | 'dropdown' | 'button';
    unit?: string;
    icon?: string;
    color?: string;
    min?: number;
    max?: number;
    step?: number;
    precision?: number;
    values?: string[];
}

// Icon mapping from Lucide icon names to components
const iconMap: Record<string, LucideIcon> = {
    'thermometer': Thermometer,
    'thermometer-sun': Sun,
    'droplets': Droplets,
    'battery': Battery,
    'wifi': Wifi,
    'power': Power,
    'toggle-left': ToggleLeft,
    'zap': Zap,
    'activity': Activity,
    'gauge': Gauge,
    'waves': Waves,
    'clock': Clock,
    'settings': Settings,
    'settings-2': Settings2,
    'fan': Fan,
    'sun': Sun,
    'palette': Palette,
    'sparkles': Sparkles,
    'bell': Bell,
    'bell-ring': BellRing,
    'eye': Eye,
    'door-open': DoorOpen,
    'lock-open': LockOpen,
    'target': Target,
    'cpu': Cpu,
    'lightbulb': Lightbulb,
    'rotate-cw': RotateCw,
    'flame': Flame,
    'calendar': Calendar,
    'sprout': Leaf,
    'flask-conical': FlaskConical,
    'atom': Atom,
    'egg': Egg,
};

/**
 * Get icon component from name
 */
export function getIconComponent(iconName?: string): LucideIcon | null {
    if (!iconName) return null;
    return iconMap[iconName] || Cpu;
}

/**
 * Infer widget type from field type and mode
 */
export function inferWidgetType(field: DeviceField): string {
    if (field.widget) return field.widget;

    if (field.mode === 'read') {
        if (field.type === 'number' && field.min !== undefined && field.max !== undefined) {
            return 'gauge';
        }
        return 'value';
    }

    if (field.mode === 'write') {
        return 'button';
    }

    // readwrite mode
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

/**
 * Parse fields from device type schema
 */
export function parseFields(schema: Record<string, unknown> | null | undefined): DeviceField[] {
    if (!schema) return [];

    const fields = schema.fields;
    if (!fields || !Array.isArray(fields)) return [];

    return fields.map((f: Record<string, unknown>) => ({
        key: String(f.key ?? ''),
        label: String(f.label ?? ''),
        type: (f.type as DeviceField['type']) ?? 'string',
        mode: (f.mode as DeviceField['mode']) ?? 'read',
        widget: f.widget as DeviceField['widget'],
        unit: f.unit as string | undefined,
        icon: f.icon as string | undefined,
        color: f.color as string | undefined,
        min: f.min as number | undefined,
        max: f.max as number | undefined,
        step: f.step as number | undefined,
        precision: f.precision as number | undefined,
        values: f.values as string[] | undefined,
    }));
}

/**
 * Get sensor fields (mode: read)
 */
export function getSensorFields(fields: DeviceField[]): DeviceField[] {
    return fields.filter((f) => f.mode === 'read');
}

/**
 * Get control fields (mode: write or readwrite)
 */
export function getControlFields(fields: DeviceField[]): DeviceField[] {
    return fields.filter((f) => f.mode === 'write' || f.mode === 'readwrite');
}

interface WidgetFactoryProps {
    field: DeviceField;
    value: unknown;
    isLoading?: boolean;
    onControlChanged?: (key: string, value: unknown) => void;
}

/**
 * Widget factory component that renders the appropriate widget based on field definition
 */
export function DeviceWidget({
    field,
    value,
    isLoading = false,
    onControlChanged,
}: WidgetFactoryProps) {
    const widgetType = inferWidgetType(field);
    const IconComponent = getIconComponent(field.icon);
    const icon = IconComponent ? <IconComponent className="h-4 w-4" /> : null;
    console.log(widgetType, "widgetType", field, value);
    switch (widgetType) {
        case 'value':
            return (
                <ValueWidget
                    label={field.label}
                    value={value}
                    unit={field.unit}
                    icon={icon}
                    color={field.color}
                />
            );

        case 'gauge':
            return (
                <GaugeWidget
                    label={field.label}
                    value={typeof value === 'number' ? value : 0}
                    min={field.min ?? 0}
                    max={field.max ?? 100}
                    unit={field.unit}
                    icon={icon}
                    color={field.color}
                    precision={field.precision ?? 1}
                />
            );

        case 'switch':
            return (
                <SwitchWidget
                    label={field.label}
                    value={value === true}
                    icon={icon}
                    color={field.color}
                    isLoading={isLoading}
                    onChange={(newValue) => onControlChanged?.(field.key, newValue)}
                />
            );

        case 'slider':
            return (
                <SliderWidget
                    label={field.label}
                    value={typeof value === 'number' ? value : (field.min ?? 0)}
                    min={field.min ?? 0}
                    max={field.max ?? 100}
                    step={field.step ?? 1}
                    unit={field.unit}
                    icon={icon}
                    color={field.color}
                    precision={field.precision ?? 0}
                    isLoading={isLoading}
                    onChange={(newValue) => onControlChanged?.(field.key, newValue)}
                />
            );

        case 'dropdown':
            return (
                <DropdownWidget
                    label={field.label}
                    value={value as string | null}
                    options={field.values ?? []}
                    icon={icon}
                    color={field.color}
                    isLoading={isLoading}
                    onChange={(newValue) => onControlChanged?.(field.key, newValue)}
                />
            );

        case 'button':
            return (
                <ButtonWidget
                    label={field.label}
                    icon={icon}
                    color={field.color}
                    isLoading={isLoading}
                    onPress={() => onControlChanged?.(field.key, true)}
                />
            );

        default:
            return (
                <ValueWidget
                    label={field.label}
                    value={value}
                    unit={field.unit}
                    icon={icon}
                    color={field.color}
                />
            );
    }
}
