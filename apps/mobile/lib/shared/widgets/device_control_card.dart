import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'glass_card.dart';

/// Device control card widget for the dashboard grid
/// 
/// Shows device category with icon, device count, status, and toggle switch.
/// Automatically adapts to light/dark theme.
class DeviceControlCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isOn;
  final bool isConnected;
  final ValueChanged<bool>? onToggle;
  final VoidCallback? onTap;
  final Color? activeColor;

  const DeviceControlCard({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle = '',
    this.isOn = false,
    this.isConnected = true,
    this.onToggle,
    this.onTap,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final effectiveColor = activeColor ?? AppColors.accentPrimary;

    return GlassCard(
      isActive: isOn,
      glowColor: effectiveColor,
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Top row: Icon and WiFi indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Device icon
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isOn 
                      ? effectiveColor.withOpacity(0.2)
                      : colors.surfaceDim,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isOn ? effectiveColor : colors.textSecondary,
                  size: 24,
                ),
              ),
              // WiFi indicator
              Icon(
                isConnected ? Icons.wifi : Icons.wifi_off,
                color: isConnected 
                    ? colors.textMuted
                    : AppColors.statusError.withOpacity(0.7),
                size: 18,
              ),
            ],
          ),
          
          // Middle: Title and subtitle
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: colors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: colors.textMuted,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
          
          // Bottom row: Status and toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Status text
              Text(
                isOn ? 'ON' : 'OFF',
                style: TextStyle(
                  color: isOn ? effectiveColor : colors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
              // Toggle switch
              if (onToggle != null)
                _AnimatedToggle(
                  value: isOn,
                  onChanged: onToggle!,
                  activeColor: effectiveColor,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Custom animated toggle switch matching the design
class _AnimatedToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;
  final Color activeColor;

  const _AnimatedToggle({
    required this.value,
    required this.onChanged,
    required this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: AppAnimations.normal,
        curve: Curves.easeInOut,
        width: 48,
        height: 26,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: value 
              ? activeColor.withOpacity(0.3)
              : colors.surfaceDim,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(
            color: value 
                ? activeColor.withOpacity(0.5)
                : colors.glassBorder,
            width: 1,
          ),
        ),
        child: AnimatedAlign(
          duration: AppAnimations.normal,
          curve: Curves.easeInOut,
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: value ? activeColor : colors.textMuted,
              shape: BoxShape.circle,
              boxShadow: value
                  ? [
                      BoxShadow(
                        color: activeColor.withOpacity(0.4),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact device card for list views
class DeviceListCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String status;
  final bool isOnline;
  final VoidCallback? onTap;

  const DeviceListCard({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    required this.status,
    this.isOnline = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    Color statusColor;
    switch (status.toLowerCase()) {
      case 'online':
        statusColor = AppColors.statusOnline;
        break;
      case 'offline':
        statusColor = AppColors.statusOffline;
        break;
      case 'provisioned':
        statusColor = AppColors.statusWarning;
        break;
      default:
        statusColor = colors.textMuted;
    }

    return SimpleGlassCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          // Device icon with status glow
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: isOnline 
                  ? AppColors.accentPrimary.withOpacity(0.15)
                  : colors.surfaceDim,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isOnline 
                    ? AppColors.accentPrimary.withOpacity(0.3)
                    : colors.glassBorder,
                width: 1,
              ),
            ),
            child: Icon(
              icon,
              color: isOnline ? AppColors.accentPrimary : colors.textSecondary,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),

          // Device info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title
                Text(
                  title,
                  style: TextStyle(
                    color: colors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                // Subtitle (device type)
                if (subtitle != null && subtitle!.isNotEmpty)
                  Text(
                    subtitle!,
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                const SizedBox(height: 6),
                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: statusColor,
                          shape: BoxShape.circle,
                          boxShadow: isOnline
                              ? [
                                  BoxShadow(
                                    color: statusColor.withOpacity(0.6),
                                    blurRadius: 4,
                                    spreadRadius: 1,
                                  ),
                                ]
                              : null,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Arrow
          Icon(
            Icons.chevron_right,
            color: colors.textMuted,
            size: 22,
          ),
        ],
      ),
    );
  }
}
