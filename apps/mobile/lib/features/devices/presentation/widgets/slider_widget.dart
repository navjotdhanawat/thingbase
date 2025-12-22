import 'dart:async';
import 'package:flutter/material.dart';

/// Slider Widget - Range slider for numeric controls
class SliderControlWidget extends StatefulWidget {
  final String label;
  final num value;
  final num min;
  final num max;
  final num step;
  final String? unit;
  final IconData? icon;
  final Color? color;
  final int precision;
  final bool isLoading;
  final Function(num) onChanged;

  const SliderControlWidget({
    super.key,
    required this.label,
    required this.value,
    this.min = 0,
    this.max = 100,
    this.step = 1,
    this.unit,
    this.icon,
    this.color,
    this.precision = 0,
    this.isLoading = false,
    required this.onChanged,
  });

  @override
  State<SliderControlWidget> createState() => _SliderControlWidgetState();
}

class _SliderControlWidgetState extends State<SliderControlWidget> {
  late double _currentValue;
  bool _isDragging = false;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _currentValue = widget.value.toDouble();
  }

  @override
  void didUpdateWidget(SliderControlWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Only update if not currently dragging
    if (!_isDragging && widget.value != oldWidget.value) {
      _currentValue = widget.value.toDouble();
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSliderChanged(double newValue) {
    // Snap to step
    final snappedValue = (newValue / widget.step.toDouble()).round() * widget.step.toDouble();
    setState(() {
      _currentValue = snappedValue;
    });
  }

  void _onSliderChangeStart(double value) {
    setState(() {
      _isDragging = true;
    });
  }

  void _onSliderChangeEnd(double value) {
    setState(() {
      _isDragging = false;
    });
    
    // Debounce the actual API call
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      widget.onChanged(_currentValue);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = widget.color ?? theme.colorScheme.primary;

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
              if (widget.icon != null) ...[
                Icon(
                  widget.icon,
                  size: 18,
                  color: displayColor,
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  widget.label,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (widget.isLoading) ...[
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: displayColor,
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Text(
                '${_currentValue.toStringAsFixed(widget.precision)}${widget.unit ?? ''}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: displayColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Slider
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: displayColor,
              inactiveTrackColor: displayColor.withOpacity(0.2),
              thumbColor: displayColor,
              overlayColor: displayColor.withOpacity(0.1),
              trackHeight: 6,
              thumbShape: const RoundSliderThumbShape(
                enabledThumbRadius: 10,
              ),
            ),
            child: Slider(
              value: _currentValue.clamp(widget.min.toDouble(), widget.max.toDouble()),
              min: widget.min.toDouble(),
              max: widget.max.toDouble(),
              divisions: widget.step > 0 
                  ? ((widget.max - widget.min) / widget.step).round() 
                  : null,
              onChanged: widget.isLoading ? null : _onSliderChanged,
              onChangeStart: _onSliderChangeStart,
              onChangeEnd: _onSliderChangeEnd,
            ),
          ),
          // Min/Max labels
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${widget.min}${widget.unit ?? ''}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                Text(
                  '${widget.max}${widget.unit ?? ''}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
