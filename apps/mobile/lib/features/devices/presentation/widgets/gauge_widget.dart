import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Gauge Widget - Circular gauge for numeric values with min/max
class GaugeWidget extends StatelessWidget {
  final String label;
  final num value;
  final num min;
  final num max;
  final String? unit;
  final IconData? icon;
  final Color? color;
  final int precision;

  const GaugeWidget({
    super.key,
    required this.label,
    required this.value,
    this.min = 0,
    this.max = 100,
    this.unit,
    this.icon,
    this.color,
    this.precision = 1,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = color ?? theme.colorScheme.primary;
    final percentage = ((value - min) / (max - min)).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Gauge circle
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Background arc
                CustomPaint(
                  size: const Size(80, 80),
                  painter: _GaugePainter(
                    percentage: 1.0,
                    color: theme.colorScheme.outline.withOpacity(0.2),
                    strokeWidth: 8,
                  ),
                ),
                // Value arc
                CustomPaint(
                  size: const Size(80, 80),
                  painter: _GaugePainter(
                    percentage: percentage.toDouble(),
                    color: displayColor,
                    strokeWidth: 8,
                  ),
                ),
                // Value text
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      value.toStringAsFixed(precision),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: displayColor,
                      ),
                    ),
                    if (unit != null)
                      Text(
                        unit!,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: displayColor.withOpacity(0.7),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Label
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 14,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
              ],
              Flexible(
                child: Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double percentage;
  final Color color;
  final double strokeWidth;

  _GaugePainter({
    required this.percentage,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Draw arc from -135 degrees to 135 degrees (270 degree sweep)
    const startAngle = 135 * (math.pi / 180); // Start from bottom-left
    final sweepAngle = 270 * (math.pi / 180) * percentage;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.percentage != percentage || oldDelegate.color != color;
  }
}
