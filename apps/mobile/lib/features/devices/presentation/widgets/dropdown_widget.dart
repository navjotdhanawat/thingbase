import 'package:flutter/material.dart';

/// Dropdown Widget - Dropdown select for enum controls
class DropdownControlWidget extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> options;
  final IconData? icon;
  final Color? color;
  final bool isLoading;
  final Function(String) onChanged;

  const DropdownControlWidget({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    this.icon,
    this.color,
    this.isLoading = false,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = color ?? theme.colorScheme.primary;
    final currentValue = options.contains(value) ? value : options.firstOrNull;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header row
          Row(
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 18,
                  color: displayColor,
                ),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              if (isLoading)
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: displayColor,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Dropdown
          Container(
            decoration: BoxDecoration(
              border: Border.all(
                color: theme.colorScheme.outline.withOpacity(0.3),
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: currentValue,
                isExpanded: true,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                borderRadius: BorderRadius.circular(12),
                icon: Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: displayColor,
                ),
                items: options.map((option) {
                  return DropdownMenuItem<String>(
                    value: option,
                    child: Text(
                      _formatOption(option),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: option == currentValue 
                            ? displayColor 
                            : theme.colorScheme.onSurface,
                        fontWeight: option == currentValue 
                            ? FontWeight.w600 
                            : FontWeight.normal,
                      ),
                    ),
                  );
                }).toList(),
                onChanged: isLoading 
                    ? null 
                    : (newValue) {
                        if (newValue != null && newValue != value) {
                          onChanged(newValue);
                        }
                      },
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatOption(String option) {
    // Convert snake_case or kebab-case to Title Case
    return option
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty 
            ? '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}' 
            : '')
        .join(' ');
  }
}
