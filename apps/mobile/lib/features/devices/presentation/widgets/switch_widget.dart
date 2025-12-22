import 'package:flutter/material.dart';

/// Switch Widget - Toggle switch for boolean controls
class SwitchControlWidget extends StatefulWidget {
  final String label;
  final bool value;
  final IconData? icon;
  final Color? color;
  final bool isLoading;
  final Function(bool) onChanged;

  const SwitchControlWidget({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
    this.isLoading = false,
    required this.onChanged,
  });

  @override
  State<SwitchControlWidget> createState() => _SwitchControlWidgetState();
}

class _SwitchControlWidgetState extends State<SwitchControlWidget> {
  late bool _optimisticValue;
  bool _isPending = false;

  @override
  void initState() {
    super.initState();
    _optimisticValue = widget.value;
  }

  @override
  void didUpdateWidget(SwitchControlWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update optimistic value when actual value changes (from server)
    if (!_isPending && widget.value != oldWidget.value) {
      _optimisticValue = widget.value;
    }
    // Clear pending state when value matches our optimistic update
    if (_isPending && widget.value == _optimisticValue) {
      _isPending = false;
    }
  }

  void _handleChange(bool newValue) {
    setState(() {
      _optimisticValue = newValue;
      _isPending = true;
    });
    widget.onChanged(newValue);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = widget.color ?? theme.colorScheme.primary;
    final isOn = _optimisticValue;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isOn ? displayColor.withOpacity(0.3) : Colors.transparent,
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          if (widget.icon != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isOn 
                    ? displayColor.withOpacity(0.15) 
                    : theme.colorScheme.outline.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                widget.icon,
                size: 20,
                color: isOn ? displayColor : theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.label,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  isOn ? 'ON' : 'OFF',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: isOn ? displayColor : theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (widget.isLoading || _isPending) ...[
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: displayColor,
              ),
            ),
            const SizedBox(width: 12),
          ],
          Switch.adaptive(
            value: _optimisticValue,
            onChanged: widget.isLoading ? null : _handleChange,
            activeColor: displayColor,
          ),
        ],
      ),
    );
  }
}
