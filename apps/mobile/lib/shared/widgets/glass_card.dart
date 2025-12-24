import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// A reusable glassmorphic card widget with frosted glass effect
/// 
/// Use this as a base container for cards throughout the app.
/// Automatically adapts to light/dark theme.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final bool isActive;
  final Color? glowColor;
  final VoidCallback? onTap;
  final double? width;
  final double? height;
  final bool enableBlur;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = 20,
    this.isActive = false,
    this.glowColor,
    this.onTap,
    this.width,
    this.height,
    this.enableBlur = true,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final effectiveGlowColor = glowColor ?? AppColors.accentPrimary;
    
    Widget content = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: enableBlur ? colors.glassBackground : colors.backgroundCard,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: isActive 
              ? effectiveGlowColor.withOpacity(0.4)
              : colors.glassBorder,
          width: isActive ? 1.5 : 1,
        ),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: effectiveGlowColor.withOpacity(0.25),
                  blurRadius: 20,
                  spreadRadius: -5,
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: enableBlur
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Padding(
                  padding: padding ?? const EdgeInsets.all(16),
                  child: child,
                ),
              )
            : Padding(
                padding: padding ?? const EdgeInsets.all(16),
                child: child,
              ),
      ),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: content,
        ),
      );
    }

    return content;
  }
}

/// A simplified glass card without blur for better performance
/// Use this for list items and frequently rebuilt widgets
class SimpleGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final bool isActive;
  final Color? glowColor;
  final VoidCallback? onTap;

  const SimpleGlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = 16,
    this.isActive = false,
    this.glowColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: padding,
      borderRadius: borderRadius,
      isActive: isActive,
      glowColor: glowColor,
      onTap: onTap,
      enableBlur: false,
      child: child,
    );
  }
}
