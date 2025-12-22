import 'package:flutter/material.dart';

import 'value_widget.dart';
import 'gauge_widget.dart';
import 'switch_widget.dart';
import 'slider_widget.dart';
import 'dropdown_widget.dart';
import 'button_widget.dart';

/// Device field definition from the device type schema
class DeviceField {
  final String key;
  final String label;
  final String type; // 'number', 'boolean', 'string', 'enum'
  final String mode; // 'read', 'write', 'readwrite'
  final String? widget; // 'value', 'gauge', 'switch', 'slider', 'dropdown', 'button'
  final String? unit;
  final String? icon;
  final String? color;
  final num? min;
  final num? max;
  final num? step;
  final int? precision;
  final List<String>? values; // For enum type

  DeviceField({
    required this.key,
    required this.label,
    required this.type,
    this.mode = 'read',
    this.widget,
    this.unit,
    this.icon,
    this.color,
    this.min,
    this.max,
    this.step,
    this.precision,
    this.values,
  });

  factory DeviceField.fromJson(Map<String, dynamic> json) {
    return DeviceField(
      key: json['key'] ?? '',
      label: json['label'] ?? '',
      type: json['type'] ?? 'string',
      mode: json['mode'] ?? 'read',
      widget: json['widget'],
      unit: json['unit'],
      icon: json['icon'],
      color: json['color'],
      min: json['min']?.toDouble(),
      max: json['max']?.toDouble(),
      step: json['step']?.toDouble(),
      precision: json['precision'],
      values: json['values'] != null 
          ? List<String>.from(json['values']) 
          : null,
    );
  }

  /// Get the widget type to use (explicit or inferred)
  String get widgetType {
    if (widget != null) return widget!;
    
    // Infer widget from type and mode
    if (mode == 'read') {
      if (type == 'number' && min != null && max != null) {
        return 'gauge';
      }
      return 'value';
    }
    
    if (mode == 'write') {
      return 'button';
    }
    
    // readwrite mode
    switch (type) {
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

  /// Check if this is a read-only field
  bool get isReadOnly => mode == 'read';

  /// Check if this is a control field
  bool get isControl => mode == 'write' || mode == 'readwrite';

  /// Parse color string to Color
  Color? get colorValue {
    if (color == null) return null;
    try {
      final hex = color!.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (e) {
      return null;
    }
  }
}

/// Icon mapping from Lucide icon names to Flutter icons
IconData? getIconFromName(String? iconName) {
  if (iconName == null) return null;
  
  const iconMap = {
    'thermometer': Icons.thermostat,
    'thermometer-sun': Icons.wb_sunny,
    'droplets': Icons.water_drop,
    'battery': Icons.battery_full,
    'wifi': Icons.wifi,
    'power': Icons.power_settings_new,
    'toggle-left': Icons.toggle_off,
    'zap': Icons.bolt,
    'activity': Icons.show_chart,
    'gauge': Icons.speed,
    'waves': Icons.waves,
    'clock': Icons.schedule,
    'settings': Icons.settings,
    'settings-2': Icons.tune,
    'fan': Icons.mode_fan_off,
    'sun': Icons.light_mode,
    'palette': Icons.palette,
    'sparkles': Icons.auto_awesome,
    'bell': Icons.notifications,
    'bell-ring': Icons.notification_important,
    'eye': Icons.visibility,
    'door-open': Icons.door_front_door,
    'lock-open': Icons.lock_open,
    'target': Icons.gps_fixed,
    'cpu': Icons.memory,
    'lightbulb': Icons.lightbulb,
    'rotate-cw': Icons.rotate_right,
    'flame': Icons.local_fire_department,
    'calendar': Icons.calendar_today,
    'sprout': Icons.eco,
    'flask-conical': Icons.science,
    'atom': Icons.science,
    'egg': Icons.egg,
  };
  
  return iconMap[iconName] ?? Icons.device_unknown;
}

/// Widget factory that renders the appropriate widget for a field
class DeviceWidgetFactory {
  /// Build a widget for the given field
  static Widget buildWidget({
    required DeviceField field,
    required dynamic value,
    required bool isLoading,
    Function(String key, dynamic value)? onControlChanged,
  }) {
    final iconData = getIconFromName(field.icon);
    final color = field.colorValue;

    switch (field.widgetType) {
      case 'value':
        return ValueWidget(
          label: field.label,
          value: value,
          unit: field.unit,
          icon: iconData,
          color: color,
        );

      case 'gauge':
        return GaugeWidget(
          label: field.label,
          value: (value is num) ? value : 0,
          min: field.min ?? 0,
          max: field.max ?? 100,
          unit: field.unit,
          icon: iconData,
          color: color,
          precision: field.precision ?? 1,
        );

      case 'switch':
        return SwitchControlWidget(
          label: field.label,
          value: value == true,
          icon: iconData,
          color: color,
          isLoading: isLoading,
          onChanged: (newValue) {
            onControlChanged?.call(field.key, newValue);
          },
        );

      case 'slider':
        return SliderControlWidget(
          label: field.label,
          value: (value is num) ? value : (field.min ?? 0),
          min: field.min ?? 0,
          max: field.max ?? 100,
          step: field.step ?? 1,
          unit: field.unit,
          icon: iconData,
          color: color,
          precision: field.precision ?? 0,
          isLoading: isLoading,
          onChanged: (newValue) {
            onControlChanged?.call(field.key, newValue);
          },
        );

      case 'dropdown':
        return DropdownControlWidget(
          label: field.label,
          value: value?.toString(),
          options: field.values ?? [],
          icon: iconData,
          color: color,
          isLoading: isLoading,
          onChanged: (newValue) {
            onControlChanged?.call(field.key, newValue);
          },
        );

      case 'button':
        return ButtonControlWidget(
          label: field.label,
          icon: iconData,
          color: color,
          isLoading: isLoading,
          onPressed: () {
            onControlChanged?.call(field.key, true);
          },
        );

      default:
        return ValueWidget(
          label: field.label,
          value: value,
          unit: field.unit,
          icon: iconData,
          color: color,
        );
    }
  }

  /// Parse fields from device type schema
  static List<DeviceField> parseFields(Map<String, dynamic>? schema) {
    if (schema == null) return [];
    
    final fields = schema['fields'];
    if (fields == null || fields is! List) return [];
    
    return fields
        .map((f) => DeviceField.fromJson(f as Map<String, dynamic>))
        .toList();
  }

  /// Get sensor fields (mode: read)
  static List<DeviceField> getSensorFields(List<DeviceField> fields) {
    return fields.where((f) => f.isReadOnly).toList();
  }

  /// Get control fields (mode: write or readwrite)
  static List<DeviceField> getControlFields(List<DeviceField> fields) {
    return fields.where((f) => f.isControl).toList();
  }
}
