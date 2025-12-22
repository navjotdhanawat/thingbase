/// App configuration loaded from environment
class AppConfig {
  final String apiBaseUrl;
  final String wsBaseUrl;
  final bool isProduction;

  const AppConfig({
    required this.apiBaseUrl,
    required this.wsBaseUrl,
    required this.isProduction,
  });

  /// Development configuration
  static const dev = AppConfig(
    apiBaseUrl: 'http://localhost:3001/api/v1',
    wsBaseUrl: 'http://localhost:3001',
    isProduction: false,
  );

  /// Production configuration
  static const prod = AppConfig(
    apiBaseUrl: 'https://api.your-iot-platform.com/api/v1',
    wsBaseUrl: 'https://api.your-iot-platform.com',
    isProduction: true,
  );

  /// Get config based on environment
  static AppConfig get current {
    // In production, you'd use --dart-define or env variables
    const isProduction = bool.fromEnvironment('PRODUCTION', defaultValue: false);
    return isProduction ? prod : dev;
  }
}

