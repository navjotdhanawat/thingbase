import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../devices/providers/devices_provider.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  String _selectedRoom = 'All Devices';

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final authState = ref.watch(authStateProvider);
    final devicesAsync = ref.watch(devicesProvider);
    final now = DateTime.now();
    final greeting = _getGreeting(now.hour);
    final dateStr = DateFormat('EEEE, MMM d, yyyy').format(now);

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(devicesProvider);
          },
          color: AppColors.accentPrimary,
          backgroundColor: colors.backgroundCard,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // Header Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: _buildHeader(colors, greeting, authState, dateStr),
                ),
              ),

              // Environment Card
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: devicesAsync.when(
                    loading: () => _buildLoadingEnvironmentCard(colors),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (devices) => _buildEnvironmentCard(devices),
                  ),
                ),
              ),

              // Room Tabs
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: devicesAsync.when(
                    loading: () => const SizedBox(height: 40),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (devices) {
                      final rooms = _extractRooms(devices);
                      return RoomTabs(
                        rooms: rooms,
                        selectedRoom: _selectedRoom,
                        onRoomSelected: (room) {
                          setState(() => _selectedRoom = room);
                        },
                      );
                    },
                  ),
                ),
              ),

              // Stats Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: devicesAsync.when(
                    loading: () => _buildLoadingStats(colors),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (devices) => _buildStatsRow(devices),
                  ),
                ),
              ),

              // Device Grid Section Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'My Devices',
                        style: TextStyle(
                          color: colors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.go('/devices'),
                        child: Text(
                          'See All',
                          style: TextStyle(
                            color: AppColors.accentPrimary,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Device Grid
              devicesAsync.when(
                loading: () => SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.9,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => _buildLoadingDeviceCard(colors),
                      childCount: 4,
                    ),
                  ),
                ),
                error: (error, _) => SliverToBoxAdapter(
                  child: _buildErrorState(context, ref, colors),
                ),
                data: (devices) {
                  final filteredDevices = _filterDevices(devices);
                  if (filteredDevices.isEmpty) {
                    return SliverToBoxAdapter(child: _buildEmptyState(context, colors));
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.9,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final device = filteredDevices[index];
                          return _buildDeviceCard(device, index);
                        },
                        childCount: filteredDevices.length > 6 
                            ? 6 
                            : filteredDevices.length,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-device'),
        backgroundColor: AppColors.accentPrimary,
        foregroundColor: colors.background,
        elevation: 4,
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }

  Widget _buildHeader(AppColors colors, String greeting, dynamic authState, String dateStr) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$greeting,',
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              authState.user?.name ?? 'User',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              dateStr,
              style: TextStyle(
                color: colors.textMuted,
                fontSize: 12,
              ),
            ),
          ],
        ),
        // Menu icon
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: colors.glassBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.glassBorder),
          ),
          child: Icon(
            Icons.grid_view_rounded,
            color: colors.textPrimary,
            size: 22,
          ),
        ),
      ],
    );
  }

  Widget _buildEnvironmentCard(List<Map<String, dynamic>> devices) {
    int sensorCount = 0;

    for (final device in devices) {
      if (device['status'] == 'online') {
        final typeName = (device['type']?['name'] ?? '').toString().toLowerCase();
        if (typeName.contains('sensor') || 
            typeName.contains('temp') || 
            typeName.contains('environment')) {
          sensorCount++;
        }
      }
    }

    return EnvironmentCard(
      temperature: 24,
      humidity: 65,
      location: 'Home',
      condition: 'Normal',
      deviceCount: devices.length,
    );
  }

  Widget _buildLoadingEnvironmentCard(AppColors colors) {
    return Container(
      height: 150,
      decoration: BoxDecoration(
        color: colors.backgroundCard,
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }

  Widget _buildStatsRow(List<Map<String, dynamic>> devices) {
    final onlineCount = devices.where((d) => d['status'] == 'online').length;
    final totalCount = devices.length;

    return Row(
      children: [
        Expanded(
          child: StatsCard(
            icon: Icons.devices,
            label: 'Total Devices',
            value: '$totalCount',
            color: AppColors.accentPrimary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: StatsCard(
            icon: Icons.wifi,
            label: 'Online',
            value: '$onlineCount',
            color: AppColors.statusOnline,
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingStats(AppColors colors) {
    return Row(
      children: [
        Expanded(child: _buildLoadingStatsCard(colors)),
        const SizedBox(width: 12),
        Expanded(child: _buildLoadingStatsCard(colors)),
      ],
    );
  }

  Widget _buildLoadingStatsCard(AppColors colors) {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: colors.backgroundCard,
        borderRadius: BorderRadius.circular(16),
      ),
    );
  }

  Widget _buildDeviceCard(Map<String, dynamic> device, int index) {
    final isOnline = device['status'] == 'online';
    final deviceType = device['type'];
    final icon = _getDeviceIcon(deviceType?['icon']);

    return DeviceControlCard(
      icon: icon,
      title: device['name'] ?? 'Unknown Device',
      subtitle: deviceType?['name'] ?? '',
      isOn: isOnline,
      isConnected: isOnline,
      onTap: () => context.push('/devices/${device['id']}'),
      onToggle: null,
    );
  }

  Widget _buildLoadingDeviceCard(AppColors colors) {
    return Container(
      decoration: BoxDecoration(
        color: colors.backgroundCard,
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AppColors colors) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: GlassCard(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(
              Icons.devices_other,
              size: 64,
              color: colors.textMuted,
            ),
            const SizedBox(height: 16),
            Text(
              'No Devices Yet',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add your first device to start monitoring',
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => context.push('/add-device'),
              icon: const Icon(Icons.add),
              label: const Text('Add Device'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, WidgetRef ref, AppColors colors) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: GlassCard(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: AppColors.statusError,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to Load Devices',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Please check your connection and try again',
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => ref.invalidate(devicesProvider),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  String _getGreeting(int hour) {
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  List<String> _extractRooms(List<Map<String, dynamic>> devices) {
    final rooms = <String>{};
    for (final device in devices) {
      final location = device['location'] as String?;
      final metadata = device['metadata'] as Map<String, dynamic>?;
      final room = metadata?['room'] as String?;
      
      if (location != null && location.isNotEmpty) {
        rooms.add(location);
      }
      if (room != null && room.isNotEmpty) {
        rooms.add(room);
      }
    }
    
    if (rooms.isEmpty) {
      return ['Living Room', 'Bedroom', 'Kitchen'];
    }
    
    return rooms.toList();
  }

  List<Map<String, dynamic>> _filterDevices(List<Map<String, dynamic>> devices) {
    if (_selectedRoom == 'All Devices') {
      return devices;
    }

    return devices.where((device) {
      final location = device['location'] as String?;
      final metadata = device['metadata'] as Map<String, dynamic>?;
      final room = metadata?['room'] as String?;
      
      return location == _selectedRoom || room == _selectedRoom;
    }).toList();
  }

  IconData _getDeviceIcon(String? iconName) {
    switch (iconName) {
      case 'thermometer':
        return Icons.thermostat;
      case 'lightbulb':
        return Icons.lightbulb_outline;
      case 'water':
        return Icons.water_drop_outlined;
      case 'power':
        return Icons.power_settings_new;
      case 'sensor':
        return Icons.sensors;
      case 'fan':
        return Icons.air;
      case 'ac':
      case 'air_condition':
        return Icons.ac_unit;
      case 'tv':
        return Icons.tv;
      case 'speaker':
        return Icons.speaker;
      case 'camera':
        return Icons.videocam_outlined;
      case 'lock':
        return Icons.lock_outline;
      case 'plug':
        return Icons.power;
      default:
        return Icons.device_hub;
    }
  }
}
