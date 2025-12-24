import 'dart:ui';
import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

// =============================================================================
// FUTURISTIC IOT THEME - GLASSMORPHIC DESIGN (LIGHT + DARK)
// =============================================================================

/// Theme-aware color helper that provides the right colors based on brightness
class AppColors {
  final BuildContext context;
  
  AppColors.of(this.context);
  
  bool get isDark => Theme.of(context).brightness == Brightness.dark;
  
  // Background colors
  Color get background => isDark ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA);
  Color get backgroundCard => isDark ? const Color(0xFF161B22) : Colors.white;
  Color get backgroundElevated => isDark ? const Color(0xFF1C2128) : const Color(0xFFF0F3F6);
  Color get surfaceDim => isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8);
  
  // Accent colors - Teal/Cyan (same for both modes)
  static const Color accentPrimary = Color(0xFF00D9A5);
  static const Color accentLight = Color(0xFF4FFFB8);
  static const Color accentDark = Color(0xFF00A67D);
  static const Color accentSecondary = Color(0xFF00C2FF);
  
  // Status colors (same for both modes)
  static const Color statusOnline = Color(0xFF00D9A5);
  static const Color statusOffline = Color(0xFF6E7681);
  static const Color statusWarning = Color(0xFFFFB84D);
  static const Color statusError = Color(0xFFFF6B6B);
  static const Color statusInfo = Color(0xFF58A6FF);
  
  // Text colors
  Color get textPrimary => isDark ? const Color(0xFFF0F6FC) : const Color(0xFF24292F);
  Color get textSecondary => isDark ? const Color(0xFF8B949E) : const Color(0xFF57606A);
  Color get textMuted => isDark ? const Color(0xFF6E7681) : const Color(0xFF8B949E);
  
  // Glass effect colors
  Color get glassBorder => isDark ? const Color(0x20FFFFFF) : const Color(0x15000000);
  Color get glassBackground => isDark ? const Color(0x15FFFFFF) : const Color(0x80FFFFFF);
  
  // Glow colors
  static const Color glowPrimary = Color(0x4000D9A5);
}

/// Static color constants for places where context isn't available
class AppColorsStatic {
  static const Color backgroundDark = Color(0xFF0D1117);
  static const Color backgroundLight = Color(0xFFF6F8FA);
  static const Color accentPrimary = Color(0xFF00D9A5);
  static const Color accentDark = Color(0xFF00A67D);
  static const Color accentSecondary = Color(0xFF00C2FF);
  static const Color statusOnline = Color(0xFF00D9A5);
  static const Color statusOffline = Color(0xFF6E7681);
  static const Color statusWarning = Color(0xFFFFB84D);
  static const Color statusError = Color(0xFFFF6B6B);
}

/// Branding configuration from backend
class BrandingConfig {
  final String tenantId;
  final String tenantName;
  final String primaryColor;
  final String secondaryColor;
  final String? accentColor;
  final String? logoUrl;
  final String? logoUrlDark;
  final String? appName;
  final String? fontFamily;
  final bool useDarkMode;
  final bool allowThemeToggle;
  final FeatureFlags features;

  const BrandingConfig({
    required this.tenantId,
    required this.tenantName,
    required this.primaryColor,
    required this.secondaryColor,
    this.accentColor,
    this.logoUrl,
    this.logoUrlDark,
    this.appName,
    this.fontFamily,
    this.useDarkMode = true,
    this.allowThemeToggle = true,
    this.features = const FeatureFlags(),
  });

  factory BrandingConfig.fromJson(Map<String, dynamic> json) {
    return BrandingConfig(
      tenantId: json['tenantId'] ?? '',
      tenantName: json['tenantName'] ?? '',
      primaryColor: json['primaryColor'] ?? '#00D9A5',
      secondaryColor: json['secondaryColor'] ?? '#00C2FF',
      accentColor: json['accentColor'],
      logoUrl: json['logoUrl'],
      logoUrlDark: json['logoUrlDark'],
      appName: json['appName'],
      fontFamily: json['fontFamily'],
      useDarkMode: json['useDarkMode'] ?? true,
      allowThemeToggle: json['allowThemeToggle'] ?? true,
      features: json['features'] != null 
          ? FeatureFlags.fromJson(json['features']) 
          : const FeatureFlags(),
    );
  }

  /// Default branding - Futuristic IoT Theme
  static const defaultBranding = BrandingConfig(
    tenantId: '',
    tenantName: 'ThingBase',
    primaryColor: '#00D9A5',
    secondaryColor: '#00C2FF',
    accentColor: '#4FFFB8',
    appName: 'ThingBase',
    fontFamily: 'Inter',
    useDarkMode: true,
  );
}

/// Feature flags from backend
class FeatureFlags {
  final bool enableBleProvisioning;
  final bool enableWifiProvisioning;
  final bool enableQrScanning;
  final bool enableTelemetryCharts;
  final bool enableCommands;
  final bool enableAlerts;
  final bool enableOfflineMode;
  final bool enableBiometricAuth;

  const FeatureFlags({
    this.enableBleProvisioning = true,
    this.enableWifiProvisioning = true,
    this.enableQrScanning = true,
    this.enableTelemetryCharts = true,
    this.enableCommands = true,
    this.enableAlerts = true,
    this.enableOfflineMode = false,
    this.enableBiometricAuth = false,
  });

  factory FeatureFlags.fromJson(Map<String, dynamic> json) {
    return FeatureFlags(
      enableBleProvisioning: json['enableBleProvisioning'] ?? true,
      enableWifiProvisioning: json['enableWifiProvisioning'] ?? true,
      enableQrScanning: json['enableQrScanning'] ?? true,
      enableTelemetryCharts: json['enableTelemetryCharts'] ?? true,
      enableCommands: json['enableCommands'] ?? true,
      enableAlerts: json['enableAlerts'] ?? true,
      enableOfflineMode: json['enableOfflineMode'] ?? false,
      enableBiometricAuth: json['enableBiometricAuth'] ?? false,
    );
  }
}

/// Current branding config provider
final brandingProvider = StateProvider<BrandingConfig>((ref) {
  return BrandingConfig.defaultBranding;
});

/// Theme mode provider - defaults to dark for futuristic look
final themeModeProvider = StateProvider<ThemeMode>((ref) {
  return ThemeMode.dark;
});

/// Light theme provider (reactive to branding)
final lightThemeProvider = Provider<ThemeData>((ref) {
  final branding = ref.watch(brandingProvider);
  return _buildTheme(branding, Brightness.light);
});

/// Dark theme provider (reactive to branding)
final darkThemeProvider = Provider<ThemeData>((ref) {
  final branding = ref.watch(brandingProvider);
  return _buildTheme(branding, Brightness.dark);
});

/// Build theme from branding config
ThemeData _buildTheme(BrandingConfig branding, Brightness brightness) {
  final fontFamily = branding.fontFamily ?? GoogleFonts.inter().fontFamily;
  
  const accentPrimary = AppColorsStatic.accentPrimary;
  const accentSecondary = AppColorsStatic.accentSecondary;

  if (brightness == Brightness.light) {
    // Light theme - Clean, modern light design
    return FlexThemeData.light(
      colors: FlexSchemeColor(
        primary: accentPrimary,
        primaryContainer: accentPrimary.withOpacity(0.1),
        secondary: accentSecondary,
        secondaryContainer: accentSecondary.withOpacity(0.1),
      ),
      surfaceMode: FlexSurfaceMode.highScaffoldLowSurface,
      blendLevel: 4,
      subThemesData: _subThemes,
      visualDensity: FlexColorScheme.comfortablePlatformDensity,
      useMaterial3: true,
      fontFamily: fontFamily,
    ).copyWith(
      scaffoldBackgroundColor: const Color(0xFFF6F8FA),
      cardColor: Colors.white,
      dialogBackgroundColor: Colors.white,
      
      appBarTheme: AppBarTheme(
        backgroundColor: const Color(0xFFF6F8FA),
        foregroundColor: const Color(0xFF24292F),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF24292F),
        ),
      ),
      
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.black.withOpacity(0.08)),
        ),
      ),
      
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFFF6F8FA),
        indicatorColor: accentPrimary.withOpacity(0.15),
        surfaceTintColor: Colors.transparent,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: accentPrimary);
          }
          return IconThemeData(color: Colors.black.withOpacity(0.5));
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: accentPrimary, 
              fontSize: 12,
              fontWeight: FontWeight.w500,
            );
          }
          return TextStyle(color: Colors.black.withOpacity(0.5), fontSize: 12);
        }),
      ),
      
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.black.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.black.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: accentPrimary, width: 1.5),
        ),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentPrimary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      
      colorScheme: ColorScheme.light(
        primary: accentPrimary,
        onPrimary: Colors.white,
        primaryContainer: accentPrimary.withOpacity(0.1),
        secondary: accentSecondary,
        onSecondary: Colors.white,
        surface: Colors.white,
        onSurface: const Color(0xFF24292F),
        error: AppColorsStatic.statusError,
        onError: Colors.white,
      ),
    );
  } else {
    // Dark theme - Futuristic glassmorphic design
    return FlexThemeData.dark(
      colors: FlexSchemeColor(
        primary: accentPrimary,
        primaryContainer: accentPrimary.withOpacity(0.15),
        secondary: accentSecondary,
        secondaryContainer: accentSecondary.withOpacity(0.15),
      ),
      surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
      blendLevel: 0,
      darkIsTrueBlack: false,
      subThemesData: _subThemes,
      visualDensity: FlexColorScheme.comfortablePlatformDensity,
      useMaterial3: true,
      fontFamily: fontFamily,
    ).copyWith(
      scaffoldBackgroundColor: const Color(0xFF0D1117),
      canvasColor: const Color(0xFF0D1117),
      cardColor: const Color(0xFF161B22),
      dialogBackgroundColor: const Color(0xFF161B22),
      
      appBarTheme: AppBarTheme(
        backgroundColor: const Color(0xFF0D1117),
        foregroundColor: const Color(0xFFF0F6FC),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: const Color(0xFFF0F6FC),
        ),
      ),
      
      cardTheme: CardThemeData(
        color: const Color(0xFF161B22),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
      ),
      
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF0D1117),
        indicatorColor: accentPrimary.withOpacity(0.2),
        surfaceTintColor: Colors.transparent,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: accentPrimary);
          }
          return IconThemeData(color: Colors.white.withOpacity(0.5));
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              color: accentPrimary, 
              fontSize: 12,
              fontWeight: FontWeight.w500,
            );
          }
          return TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12);
        }),
      ),
      
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: accentPrimary, width: 1.5),
        ),
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentPrimary,
          foregroundColor: const Color(0xFF0D1117),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      
      colorScheme: ColorScheme.dark(
        primary: accentPrimary,
        onPrimary: const Color(0xFF0D1117),
        primaryContainer: accentPrimary.withOpacity(0.15),
        secondary: accentSecondary,
        onSecondary: const Color(0xFF0D1117),
        surface: const Color(0xFF161B22),
        onSurface: const Color(0xFFF0F6FC),
        error: AppColorsStatic.statusError,
        onError: Colors.white,
      ),
    );
  }
}

/// Common sub-theme configuration
const _subThemes = FlexSubThemesData(
  interactionEffects: true,
  tintedDisabledControls: true,
  blendOnLevel: 10,
  blendOnColors: false,
  useTextTheme: true,
  useM2StyleDividerInM3: true,
  inputDecoratorRadius: 12,
  inputDecoratorBorderType: FlexInputBorderType.outline,
  cardRadius: 16,
  dialogRadius: 20,
  bottomSheetRadius: 24,
  elevatedButtonRadius: 12,
  outlinedButtonRadius: 12,
  filledButtonRadius: 12,
  textButtonRadius: 12,
  chipRadius: 20,
  fabRadius: 16,
);

// =============================================================================
// ANIMATION DURATIONS - Consistent timing across the app
// =============================================================================

class AppAnimations {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 400);
  static const Duration pageTransition = Duration(milliseconds: 300);
  
  static const Curve defaultCurve = Curves.easeOutCubic;
}

// =============================================================================
// SPACING - Consistent spacing values
// =============================================================================

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}
