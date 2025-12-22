import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../providers/devices_provider.dart';

class DevicesListScreen extends ConsumerWidget {
  const DevicesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final devicesAsync = ref.watch(devicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              // TODO: Search
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: Filter
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(devicesProvider);
        },
        child: devicesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                const Text('Failed to load devices'),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => ref.invalidate(devicesProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (devices) {
            if (devices.isEmpty) {
              return _buildEmptyState(context);
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: devices.length,
              itemBuilder: (context, index) {
                final device = devices[index];
                return _DeviceListTile(device: device)
                    .animate()
                    .fadeIn(delay: Duration(milliseconds: index * 50));
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-device'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.devices_other,
              size: 80,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No Devices',
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add your first device to start monitoring',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
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
}

class _DeviceListTile extends StatelessWidget {
  final Map<String, dynamic> device;

  const _DeviceListTile({required this.device});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isOnline = device['status'] == 'online';
    final status = device['status'] ?? 'pending';

    Color statusColor;
    switch (status) {
      case 'online':
        statusColor = Colors.green;
        break;
      case 'offline':
        statusColor = Colors.grey;
        break;
      case 'provisioned':
        statusColor = Colors.orange;
        break;
      default:
        statusColor = Colors.grey.shade400;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => context.push('/devices/${device['id']}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Device icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getDeviceIcon(device['type']?['icon']),
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),

              // Device info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device['name'] ?? 'Unknown Device',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          status.toString().toUpperCase(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (device['type'] != null) ...[
                          const SizedBox(width: 12),
                          Text(
                            device['type']['name'],
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

              // Arrow
              Icon(
                Icons.chevron_right,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
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
      default:
        return Icons.device_hub;
    }
  }
}

