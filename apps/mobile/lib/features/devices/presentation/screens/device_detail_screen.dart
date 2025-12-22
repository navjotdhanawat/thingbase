import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../providers/devices_provider.dart';

class DeviceDetailScreen extends ConsumerWidget {
  final String deviceId;

  const DeviceDetailScreen({
    super.key,
    required this.deviceId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final deviceAsync = ref.watch(deviceProvider(deviceId));
    final stateAsync = ref.watch(deviceStateProvider(deviceId));

    return Scaffold(
      appBar: AppBar(
        title: deviceAsync.when(
          loading: () => const Text('Loading...'),
          error: (_, __) => const Text('Device'),
          data: (device) => Text(device?['name'] ?? 'Device'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // TODO: Device options menu
            },
          ),
        ],
      ),
      body: deviceAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              const Text('Failed to load device'),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => ref.invalidate(deviceProvider(deviceId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (device) {
          if (device == null) {
            return const Center(child: Text('Device not found'));
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(deviceProvider(deviceId));
              ref.invalidate(deviceStateProvider(deviceId));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status card
                  _buildStatusCard(context, device).animate().fadeIn(),
                  
                  const SizedBox(height: 24),

                  // Current state
                  Text(
                    'Current State',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ).animate().fadeIn(delay: 100.ms),
                  
                  const SizedBox(height: 12),
                  
                  stateAsync.when(
                    loading: () => const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    error: (_, __) => _buildNoDataCard(context),
                    data: (state) {
                      if (state == null || state.isEmpty) {
                        return _buildNoDataCard(context);
                      }
                      return _buildStateGrid(context, state)
                          .animate()
                          .fadeIn(delay: 200.ms);
                    },
                  ),

                  const SizedBox(height: 24),

                  // Quick commands
                  Text(
                    'Quick Commands',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ).animate().fadeIn(delay: 300.ms),
                  
                  const SizedBox(height: 12),
                  
                  _buildCommandsSection(context, device)
                      .animate()
                      .fadeIn(delay: 400.ms),

                  const SizedBox(height: 24),

                  // Device info
                  Text(
                    'Device Information',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ).animate().fadeIn(delay: 500.ms),
                  
                  const SizedBox(height: 12),
                  
                  _buildInfoSection(context, device)
                      .animate()
                      .fadeIn(delay: 600.ms),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusCard(BuildContext context, Map<String, dynamic> device) {
    final theme = Theme.of(context);
    final status = device['status'] ?? 'pending';
    final isOnline = status == 'online';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isOnline
              ? [Colors.green.shade400, Colors.green.shade600]
              : [Colors.grey.shade400, Colors.grey.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              isOnline ? Icons.wifi : Icons.wifi_off,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOnline ? 'Online' : status.toString().toUpperCase(),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (device['lastSeen'] != null)
                  Text(
                    'Last seen: ${_formatLastSeen(device['lastSeen'])}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStateGrid(BuildContext context, Map<String, dynamic> state) {
    final theme = Theme.of(context);
    
    // Flatten nested telemetry data if present
    final Map<String, dynamic> flatState = {};
    
    for (final entry in state.entries) {
      // Skip metadata fields
      if (entry.key == 'lastUpdate' || 
          entry.key == 'timestamp' || 
          entry.key == 'online' || 
          entry.key == 'lastSeen') continue;
      
      if (entry.value is Map) {
        // Flatten nested maps
        final nestedMap = entry.value as Map;
        for (final nestedEntry in nestedMap.entries) {
          flatState[nestedEntry.key.toString()] = nestedEntry.value;
        }
      } else {
        flatState[entry.key] = entry.value;
      }
    }
    
    // Filter out non-displayable values
    final entries = flatState.entries
        .where((e) => e.value != null && 
                      e.key != 'lastUpdate' && 
                      e.key != 'timestamp' &&
                      !(e.value is Map) &&
                      !(e.value is List))
        .toList();

    if (entries.isEmpty) {
      return _buildNoDataCard(context);
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.6,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: entries.length > 6 ? 6 : entries.length, // Limit to 6 items
      itemBuilder: (context, index) {
        final entry = entries[index];
        final formattedValue = _formatValue(entry.value);
        final unit = _getUnit(entry.key);
        
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formattedValue,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    if (unit.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      Text(
                        unit,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary.withOpacity(0.7),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _formatKey(entry.key),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNoDataCard(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(
              Icons.hourglass_empty,
              size: 40,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
            ),
            const SizedBox(height: 12),
            Text(
              'No data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommandsSection(BuildContext context, Map<String, dynamic> device) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _CommandButton(
          icon: Icons.refresh,
          label: 'Restart',
          onPressed: () {
            // TODO: Send restart command
          },
        ),
        _CommandButton(
          icon: Icons.sync,
          label: 'Sync',
          onPressed: () {
            // TODO: Send sync command
          },
        ),
        _CommandButton(
          icon: Icons.settings,
          label: 'Configure',
          onPressed: () {
            // TODO: Open config
          },
        ),
      ],
    );
  }

  Widget _buildInfoSection(BuildContext context, Map<String, dynamic> device) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          _InfoRow(label: 'ID', value: device['id']),
          _InfoRow(label: 'Type', value: device['type']?['name'] ?? 'N/A'),
          _InfoRow(label: 'External ID', value: device['externalId'] ?? 'N/A'),
          _InfoRow(
            label: 'Created', 
            value: _formatDate(device['createdAt']),
            isLast: true,
          ),
        ],
      ),
    );
  }

  String _formatLastSeen(String? dateStr) {
    if (dateStr == null) return 'Unknown';
    try {
      final date = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (e) {
      return 'Unknown';
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'Unknown';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return 'Unknown';
    }
  }

  String _formatKey(String key) {
    return key
        .replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[1]}')
        .replaceAll('_', ' ')
        .trim()
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }

  String _formatValue(dynamic value) {
    if (value == null) return '-';
    if (value is num) {
      if (value.abs() >= 1000) {
        return '${(value / 1000).toStringAsFixed(1)}k';
      }
      return value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 1);
    }
    if (value is bool) {
      return value ? 'ON' : 'OFF';
    }
    final str = value.toString();
    // Truncate long strings
    if (str.length > 10) {
      return '${str.substring(0, 10)}...';
    }
    return str;
  }

  String _getUnit(String key) {
    final lowerKey = key.toLowerCase();
    if (lowerKey.contains('temp')) return '°C';
    if (lowerKey.contains('humidity') || lowerKey.contains('moisture')) return '%';
    if (lowerKey.contains('pressure')) return 'hPa';
    if (lowerKey.contains('battery')) return '%';
    if (lowerKey.contains('voltage')) return 'V';
    if (lowerKey.contains('current')) return 'A';
    if (lowerKey.contains('power') && !lowerKey.contains('on')) return 'W';
    if (lowerKey.contains('energy')) return 'kWh';
    if (lowerKey.contains('flow')) return 'L/m';
    if (lowerKey.contains('rssi') || lowerKey.contains('signal')) return 'dBm';
    if (lowerKey.contains('speed')) return 'km/h';
    if (lowerKey.contains('distance')) return 'm';
    if (lowerKey.contains('weight')) return 'kg';
    if (lowerKey.contains('ph')) return 'pH';
    return '';
  }
}

class _CommandButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _CommandButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isLast;

  const _InfoRow({
    required this.label,
    required this.value,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(
                bottom: BorderSide(
                  color: theme.colorScheme.outline.withOpacity(0.1),
                ),
              ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

