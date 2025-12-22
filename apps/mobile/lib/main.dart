import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'core/theme/app_theme.dart';
import 'router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
  ));

  // Preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    const ProviderScope(
      child: IoTCompanionApp(),
    ),
  );
}

class IoTCompanionApp extends ConsumerWidget {
  const IoTCompanionApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch theme providers
    final themeMode = ref.watch(themeModeProvider);
    final lightTheme = ref.watch(lightThemeProvider);
    final darkTheme = ref.watch(darkThemeProvider);
    final branding = ref.watch(brandingProvider);

    // Watch router
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: branding.appName ?? 'IoT Companion',
      debugShowCheckedModeBanner: false,

      // Theming
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeMode,

      // Routing
      routerConfig: router,
    );
  }
}
