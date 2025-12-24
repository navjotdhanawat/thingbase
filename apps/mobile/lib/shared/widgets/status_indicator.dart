import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Status indicator with optional glow effect
/// Automatically adapts to light/dark theme.
class StatusIndicator extends StatelessWidget {
  final bool isActive;
  final Color? activeColor;
  final Color? inactiveColor;
  final double size;
  final bool showGlow;

  const StatusIndicator({
    super.key,
    required this.isActive,
    this.activeColor,
    this.inactiveColor,
    this.size = 8,
    this.showGlow = true,
  });

  @override
  Widget build(BuildContext context) {
    final color = isActive 
        ? (activeColor ?? AppColors.statusOnline)
        : (inactiveColor ?? AppColors.statusOffline);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: isActive && showGlow
            ? [
                BoxShadow(
                  color: color.withOpacity(0.6),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
    );
  }
}

/// Animated status badge with text
class StatusBadge extends StatelessWidget {
  final String status;
  final Color? color;

  const StatusBadge({
    super.key,
    required this.status,
    this.color,
  });

  Color get _statusColor {
    if (color != null) return color!;
    
    switch (status.toLowerCase()) {
      case 'online':
        return AppColors.statusOnline;
      case 'offline':
        return AppColors.statusOffline;
      case 'warning':
      case 'provisioned':
        return AppColors.statusWarning;
      case 'error':
      case 'active':
        return AppColors.statusError;
      case 'acknowledged':
        return AppColors.statusWarning;
      case 'resolved':
        return AppColors.statusOnline;
      default:
        return AppColors.statusOffline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _statusColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusIndicator(
            isActive: status.toLowerCase() == 'online' || 
                      status.toLowerCase() == 'resolved',
            activeColor: _statusColor,
            inactiveColor: _statusColor,
            size: 6,
            showGlow: false,
          ),
          const SizedBox(width: 6),
          Text(
            status.toUpperCase(),
            style: TextStyle(
              color: _statusColor,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

/// Live indicator with pulsing animation
class LiveIndicator extends StatefulWidget {
  final String? text;
  
  const LiveIndicator({super.key, this.text});

  @override
  State<LiveIndicator> createState() => _LiveIndicatorState();
}

class _LiveIndicatorState extends State<LiveIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 1),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colors.glassBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.glassBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              return Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: AppColors.statusOnline.withOpacity(_animation.value),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.statusOnline.withOpacity(_animation.value * 0.5),
                      blurRadius: 4,
                      spreadRadius: 1,
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(width: 6),
          Text(
            widget.text ?? 'LIVE',
            style: TextStyle(
              color: colors.textPrimary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
