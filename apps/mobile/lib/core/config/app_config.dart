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

  /// Local development (API running on localhost)
  /// Use 10.0.2.2 for Android emulator, localhost for iOS simulator
  static const local = AppConfig(
    apiBaseUrl: 'http://10.0.2.2:3001/api/v1',
    wsBaseUrl: 'http://10.0.2.2:3001',
    isProduction: false,
  );

  /// Local development for iOS simulator
  static const localIos = AppConfig(
    apiBaseUrl: 'http://localhost:3001/api/v1',
    wsBaseUrl: 'http://localhost:3001',
    isProduction: false,
  );

  /// Development against Railway (for mobile testing on physical device)
  static const dev = AppConfig(
    apiBaseUrl: 'https://thingbaseapi-production.up.railway.app/api/v1',
    wsBaseUrl: 'https://thingbaseapi-production.up.railway.app',
    isProduction: false,
  );

  /// Production configuration
  static const prod = AppConfig(
    apiBaseUrl: 'https://thingbaseapi-production.up.railway.app/api/v1',
    wsBaseUrl: 'https://thingbaseapi-production.up.railway.app',
    isProduction: true,
  );

  /// Get config based on build flavor
  /// Usage:
  ///   flutter run                                    -> dev (Railway)
  ///   flutter run --dart-define=ENVIRONMENT=local   -> local (Android emulator)
  ///   flutter run --dart-define=ENVIRONMENT=local_ios -> local (iOS simulator)
  ///   flutter run --dart-define=ENVIRONMENT=prod    -> production
  static AppConfig get current {
    const env = String.fromEnvironment('ENVIRONMENT', defaultValue: 'dev');
    switch (env) {
      case 'local':
        return local;
      case 'local_ios':
        return localIos;
      case 'prod':
        return prod;
      default:
        return dev;
    }
  }
}
