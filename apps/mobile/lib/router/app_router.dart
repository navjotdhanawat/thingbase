import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/screens/login_screen.dart';
import '../features/auth/presentation/screens/register_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../features/devices/presentation/screens/device_detail_screen.dart';
import '../features/devices/presentation/screens/devices_list_screen.dart';
import '../features/provisioning/presentation/screens/add_device_screen.dart';
import '../features/alerts/presentation/screens/alerts_screen.dart';
import '../features/settings/presentation/screens/settings_screen.dart';

/// Router provider
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      // Redirect to login if not authenticated
      if (!isLoggedIn && !isAuthRoute) {
        return '/auth/login';
      }

      // Redirect to dashboard if already authenticated
      if (isLoggedIn && isAuthRoute) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      // ═══════════════════════════════════════════════════════════════════════
      // AUTH ROUTES
      // ═══════════════════════════════════════════════════════════════════════
      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),

      // ═══════════════════════════════════════════════════════════════════════
      // MAIN APP ROUTES (with bottom nav)
      // ═══════════════════════════════════════════════════════════════════════
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/devices',
            name: 'devices',
            builder: (context, state) => const DevicesListScreen(),
            routes: [
              GoRoute(
                path: ':id',
                name: 'device-detail',
                builder: (context, state) {
                  final deviceId = state.pathParameters['id']!;
                  return DeviceDetailScreen(deviceId: deviceId);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/alerts',
            name: 'alerts',
            builder: (context, state) => const AlertsScreen(),
          ),
          GoRoute(
            path: '/settings',
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),

      // ═══════════════════════════════════════════════════════════════════════
      // MODAL/FULL-SCREEN ROUTES
      // ═══════════════════════════════════════════════════════════════════════
      GoRoute(
        path: '/add-device',
        name: 'add-device',
        builder: (context, state) => const AddDeviceScreen(),
      ),
    ],
  );
});

/// Main shell with bottom navigation
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateSelectedIndex(context),
        onDestinationSelected: (index) => _onItemTapped(context, index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.devices_outlined),
            selectedIcon: Icon(Icons.devices),
            label: 'Devices',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/devices')) return 1;
    if (location.startsWith('/alerts')) return 2;
    if (location.startsWith('/settings')) return 3;
    return 0;
  }

  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/devices');
        break;
      case 2:
        context.go('/alerts');
        break;
      case 3:
        context.go('/settings');
        break;
    }
  }
}

