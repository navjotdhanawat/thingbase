import 'package:flutter/material.dart';

/// Value Widget - Simple text/number display for read-only data
class ValueWidget extends StatelessWidget {
  final String label;
  final dynamic value;
  final String? unit;
  final IconData? icon;
  final Color? color;

  const ValueWidget({
    super.key,
    required this.label,
    required this.value,
    this.unit,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = color ?? theme.colorScheme.primary;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 16,
                  color: displayColor,
                ),
                const SizedBox(width: 6),
              ],
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  _formatValue(value),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: displayColor,
                  ),
                ),
                if (unit != null && unit!.isNotEmpty) ...[
                  const SizedBox(width: 4),
                  Text(
                    unit!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: displayColor.withOpacity(0.7),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatValue(dynamic value) {
    if (value == null) return '-';
    if (value is bool) return value ? 'ON' : 'OFF';
    if (value is num) {
      if (value.abs() >= 1000) {
        return '${(value / 1000).toStringAsFixed(1)}k';
      }
      return value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 1);
    }
    final str = value.toString();
    if (str.length > 15) {
      return '${str.substring(0, 15)}...';
    }
    return str;
  }
}
