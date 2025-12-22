import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

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
    this.useDarkMode = false,
    this.allowThemeToggle = true,
    this.features = const FeatureFlags(),
  });

  factory BrandingConfig.fromJson(Map<String, dynamic> json) {
    return BrandingConfig(
      tenantId: json['tenantId'] ?? '',
      tenantName: json['tenantName'] ?? '',
      primaryColor: json['primaryColor'] ?? '#6366F1',
      secondaryColor: json['secondaryColor'] ?? '#8B5CF6',
      accentColor: json['accentColor'],
      logoUrl: json['logoUrl'],
      logoUrlDark: json['logoUrlDark'],
      appName: json['appName'],
      fontFamily: json['fontFamily'],
      useDarkMode: json['useDarkMode'] ?? false,
      allowThemeToggle: json['allowThemeToggle'] ?? true,
      features: json['features'] != null 
          ? FeatureFlags.fromJson(json['features']) 
          : const FeatureFlags(),
    );
  }

  /// Default branding for fallback
  static const defaultBranding = BrandingConfig(
    tenantId: '',
    tenantName: 'IoT Platform',
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    accentColor: '#F59E0B',
    appName: 'IoT Companion',
    fontFamily: 'Inter',
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

/// Theme mode provider
final themeModeProvider = StateProvider<ThemeMode>((ref) {
  return ThemeMode.system;
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
  final primaryColor = _hexToColor(branding.primaryColor);
  final secondaryColor = _hexToColor(branding.secondaryColor);

  final colors = FlexSchemeColor(
    primary: primaryColor,
    primaryContainer: primaryColor.withOpacity(brightness == Brightness.dark ? 0.2 : 0.1),
    secondary: secondaryColor,
    secondaryContainer: secondaryColor.withOpacity(brightness == Brightness.dark ? 0.2 : 0.1),
  );

  final fontFamily = branding.fontFamily ?? GoogleFonts.inter().fontFamily;

  if (brightness == Brightness.light) {
    return FlexThemeData.light(
      colors: colors,
      surfaceMode: FlexSurfaceMode.highScaffoldLowSurface,
      blendLevel: 12,
      subThemesData: _subThemes,
      visualDensity: FlexColorScheme.comfortablePlatformDensity,
      useMaterial3: true,
      fontFamily: fontFamily,
    );
  } else {
    return FlexThemeData.dark(
      colors: colors,
      surfaceMode: FlexSurfaceMode.highScaffoldLowSurface,
      blendLevel: 15,
      subThemesData: _subThemes,
      visualDensity: FlexColorScheme.comfortablePlatformDensity,
      useMaterial3: true,
      fontFamily: fontFamily,
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
  bottomNavigationBarSelectedLabelSchemeColor: SchemeColor.primary,
  bottomNavigationBarUnselectedLabelSchemeColor: SchemeColor.onSurface,
  bottomNavigationBarSelectedIconSchemeColor: SchemeColor.primary,
  bottomNavigationBarUnselectedIconSchemeColor: SchemeColor.onSurface,
  navigationBarSelectedLabelSchemeColor: SchemeColor.primary,
  navigationBarUnselectedLabelSchemeColor: SchemeColor.onSurface,
  navigationBarSelectedIconSchemeColor: SchemeColor.primary,
  navigationBarUnselectedIconSchemeColor: SchemeColor.onSurface,
);

/// Convert hex color string to Color
Color _hexToColor(String hex) {
  final buffer = StringBuffer();
  if (hex.length == 6 || hex.length == 7) buffer.write('ff');
  buffer.write(hex.replaceFirst('#', ''));
  return Color(int.parse(buffer.toString(), radix: 16));
}

