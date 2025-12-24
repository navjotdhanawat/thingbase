import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'glass_card.dart';

/// Environment overview card showing aggregated sensor data
/// Automatically adapts to light/dark theme.
class EnvironmentCard extends StatelessWidget {
  final double? temperature;
  final double? humidity;
  final String? location;
  final String? condition;
  final int? deviceCount;

  const EnvironmentCard({
    super.key,
    this.temperature,
    this.humidity,
    this.location,
    this.condition,
    this.deviceCount,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.accentPrimary.withOpacity(colors.isDark ? 0.25 : 0.15),
            AppColors.accentSecondary.withOpacity(colors.isDark ? 0.15 : 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.accentPrimary.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row: Condition and location
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        _ConditionIcon(condition: condition),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              condition ?? 'Normal',
                              style: TextStyle(
                                color: colors.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (location != null)
                              Text(
                                location!,
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    // Main temperature
                    if (temperature != null)
                      Text(
                        '${temperature!.round()}°',
                        style: TextStyle(
                          color: colors.textPrimary,
                          fontSize: 48,
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Bottom row: Stats
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatItem(
                      icon: Icons.thermostat_outlined,
                      label: 'Feels Like',
                      value: temperature != null 
                          ? '${(temperature! + 1).round()}°' 
                          : '--',
                    ),
                    _StatItem(
                      icon: Icons.water_drop_outlined,
                      label: 'Humidity',
                      value: humidity != null 
                          ? '${humidity!.round()}%' 
                          : '--',
                    ),
                    _StatItem(
                      icon: Icons.devices_outlined,
                      label: 'Sensors',
                      value: deviceCount?.toString() ?? '--',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ConditionIcon extends StatelessWidget {
  final String? condition;

  const _ConditionIcon({this.condition});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (condition?.toLowerCase()) {
      case 'hot':
        icon = Icons.wb_sunny;
        color = AppColors.statusWarning;
        break;
      case 'cold':
        icon = Icons.ac_unit;
        color = AppColors.accentSecondary;
        break;
      case 'humid':
        icon = Icons.water_drop;
        color = AppColors.accentSecondary;
        break;
      case 'optimal':
        icon = Icons.check_circle;
        color = AppColors.statusOnline;
        break;
      default:
        icon = Icons.thermostat;
        color = AppColors.accentPrimary;
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return Column(
      children: [
        Icon(
          icon,
          color: colors.textSecondary,
          size: 18,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: colors.textMuted,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

/// Quick stats card for dashboard
class StatsCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? color;
  final String? subtitle;

  const StatsCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.color,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final effectiveColor = color ?? AppColors.accentPrimary;

    return SimpleGlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: effectiveColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: effectiveColor, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: effectiveColor,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    color: colors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: TextStyle(
                      color: colors.textMuted,
                      fontSize: 11,
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
