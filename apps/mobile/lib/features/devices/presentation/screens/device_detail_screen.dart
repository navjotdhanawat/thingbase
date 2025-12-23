import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../providers/devices_provider.dart';
import '../../../../core/network/socket_service.dart';
import '../widgets/widget_factory.dart';

class DeviceDetailScreen extends ConsumerStatefulWidget {
  final String deviceId;

  const DeviceDetailScreen({
    super.key,
    required this.deviceId,
  });

  @override
  ConsumerState<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends ConsumerState<DeviceDetailScreen> {
  Map<String, dynamic> _realtimeState = {};
  bool _isConnected = false;
  StreamSubscription? _connectionSubscription;
  StreamSubscription? _telemetrySubscription;
  StreamSubscription? _statusSubscription;
  final Set<String> _pendingCommands = {};
  SocketService? _socketService; // Store reference to avoid using ref after dispose
  bool _isDisposed = false;
  
  // Real-time device status
  bool? _realtimeOnline;
  String? _realtimeLastSeen;

  @override
  void initState() {
    super.initState();
    _initSocket();
  }

  Future<void> _initSocket() async {
    if (_isDisposed) return;
    
    _socketService = ref.read(socketServiceProvider);
    await _socketService?.connect();
    _socketService?.subscribeToDevice(widget.deviceId);

    // Listen to connection status
    _connectionSubscription = _socketService?.connectionStream.listen((connected) {
      if (mounted && !_isDisposed) {
        setState(() => _isConnected = connected);
      }
    });

    // Listen to telemetry updates
    _telemetrySubscription = _socketService?.telemetryStream.listen((event) {
      if (event.deviceId == widget.deviceId && mounted && !_isDisposed) {
        setState(() {
          _realtimeState = {..._realtimeState, ...event.data};
          
          // Update lastSeen from event data or timestamp
          final lastSeenFromData = event.data['lastSeen'];
          _realtimeLastSeen = lastSeenFromData?.toString() ?? event.timestamp;
          
          // Update online status from event data or infer from telemetry receipt
          final onlineFromData = event.data['online'];
          _realtimeOnline = onlineFromData is bool ? onlineFromData : true;
          
          // Clear pending state for keys that have been updated
          for (final key in event.data.keys) {
            _pendingCommands.remove(key);
          }
        });
      }
    });

    // Listen to status updates (online/offline)
    _statusSubscription = _socketService?.statusStream.listen((event) {
      if (event.deviceId == widget.deviceId && mounted && !_isDisposed) {
        setState(() {
          _realtimeOnline = event.online;
          _realtimeLastSeen = event.timestamp;
        });
      }
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _connectionSubscription?.cancel();
    _telemetrySubscription?.cancel();
    _statusSubscription?.cancel();
    _connectionSubscription = null;
    _telemetrySubscription = null;
    _statusSubscription = null;
    // Use stored reference instead of ref.read
    _socketService?.unsubscribeFromDevice(widget.deviceId);
    super.dispose();
  }

  Future<void> _handleControlChange(String key, dynamic value) async {
    if (_isDisposed) return;
    
    setState(() {
      _pendingCommands.add(key);
      // Optimistic update
      _realtimeState[key] = value;
    });

    final commandSender = ref.read(commandSenderProvider);
    final result = await commandSender.sendCommand(
      deviceId: widget.deviceId,
      key: key,
      value: value,
    );

    if (!result.success && mounted && !_isDisposed) {
      // Revert optimistic update on failure
      ref.invalidate(deviceStateProvider(widget.deviceId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.error ?? 'Failed to send command'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }

    // Clear pending after timeout
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted && !_isDisposed) {
        setState(() {
          _pendingCommands.remove(key);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final deviceAsync = ref.watch(deviceProvider(widget.deviceId));
    final stateAsync = ref.watch(deviceStateProvider(widget.deviceId));

    return Scaffold(
      appBar: AppBar(
        title: deviceAsync.when(
          loading: () => const Text('Loading...'),
          error: (_, __) => const Text('Device'),
          data: (device) => Text(device?['name'] ?? 'Device'),
        ),
        actions: [
          // Real-time connection indicator
          if (_isConnected)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(
                Icons.wifi,
                color: Colors.green,
                size: 20,
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(
                Icons.wifi_off,
                color: Colors.grey,
                size: 20,
              ),
            ),
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
                onPressed: () => ref.invalidate(deviceProvider(widget.deviceId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (device) {
          if (device == null) {
            return const Center(child: Text('Device not found'));
          }

          // Parse schema fields
          final schema = device['type']?['schema'] as Map<String, dynamic>?;
          final allFields = DeviceWidgetFactory.parseFields(schema);
          final sensorFields = DeviceWidgetFactory.getSensorFields(allFields);
          final controlFields = DeviceWidgetFactory.getControlFields(allFields);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(deviceProvider(widget.deviceId));
              ref.invalidate(deviceStateProvider(widget.deviceId));
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

                  // Sensor widgets (read-only)
                  if (sensorFields.isNotEmpty) ...[
                    Text(
                      'Sensors',
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
                        final mergedState = {
                          ...(state ?? {}),
                          ..._realtimeState,
                        };
                        if (mergedState.isEmpty) {
                          return _buildNoDataCard(context);
                        }
                        return _buildSensorGrid(context, sensorFields, mergedState)
                            .animate()
                            .fadeIn(delay: 200.ms);
                      },
                    ),
                    
                    const SizedBox(height: 24),
                  ],

                  // Control widgets (write/readwrite)
                  if (controlFields.isNotEmpty) ...[
                    Text(
                      'Controls',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ).animate().fadeIn(delay: 300.ms),
                    
                    const SizedBox(height: 12),
                    
                    stateAsync.when(
                      loading: () => const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                      error: (_, __) => _buildControlsList(context, controlFields, {}),
                      data: (state) {
                        final mergedState = {
                          ...(state ?? {}),
                          ..._realtimeState,
                        };
                        return _buildControlsList(context, controlFields, mergedState)
                            .animate()
                            .fadeIn(delay: 400.ms);
                      },
                    ),
                    
                    const SizedBox(height: 24),
                  ],

                  // Fallback: Show raw state if no schema
                  if (allFields.isEmpty) ...[
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
                        final mergedState = {
                          ...(state ?? {}),
                          ..._realtimeState,
                        };
                        if (mergedState.isEmpty) {
                          return _buildNoDataCard(context);
                        }
                        return _buildRawStateGrid(context, mergedState)
                            .animate()
                            .fadeIn(delay: 200.ms);
                      },
                    ),
                    
                    const SizedBox(height: 24),
                  ],

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
    
    // Use real-time status if available, otherwise fall back to API data
    final status = device['status'] ?? 'pending';
    final isOnline = _realtimeOnline ?? (status == 'online');
    final lastSeen = _realtimeLastSeen ?? device['lastSeen'];

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
                Row(
                  children: [
                    Text(
                      isOnline ? 'Online' : status.toString().toUpperCase(),
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    // Real-time indicator
                    if (_realtimeOnline != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'LIVE',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 9,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                if (lastSeen != null)
                  Text(
                    'Last seen: ${_formatLastSeen(lastSeen)}',
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

  Widget _buildSensorGrid(
    BuildContext context, 
    List<DeviceField> fields,
    Map<String, dynamic> state,
  ) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.0,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: fields.length,
      itemBuilder: (context, index) {
        final field = fields[index];
        final value = state[field.key];
        
        return DeviceWidgetFactory.buildWidget(
          field: field,
          value: value,
          isLoading: _pendingCommands.contains(field.key),
          onControlChanged: null, // Sensors don't have controls
        );
      },
    );
  }

  Widget _buildControlsList(
    BuildContext context,
    List<DeviceField> fields,
    Map<String, dynamic> state,
  ) {
    return Column(
      children: fields.map((field) {
        final value = state[field.key];
        
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: DeviceWidgetFactory.buildWidget(
            field: field,
            value: value,
            isLoading: _pendingCommands.contains(field.key),
            onControlChanged: _handleControlChange,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRawStateGrid(BuildContext context, Map<String, dynamic> state) {
    final theme = Theme.of(context);
    
    // Flatten and filter state
    final entries = <MapEntry<String, dynamic>>[];
    for (final entry in state.entries) {
      if (_shouldSkipKey(entry.key)) continue;
      
      if (entry.value is Map) {
        final nestedMap = entry.value as Map;
        for (final nestedEntry in nestedMap.entries) {
          if (!_shouldSkipKey(nestedEntry.key.toString())) {
            entries.add(MapEntry(nestedEntry.key.toString(), nestedEntry.value));
          }
        }
      } else if (entry.value != null && entry.value is! List) {
        entries.add(entry);
      }
    }

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
      itemCount: entries.length > 6 ? 6 : entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        
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
              Text(
                _formatValue(entry.value),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
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

  bool _shouldSkipKey(String key) {
    const skipKeys = ['lastUpdate', 'timestamp', 'online', 'lastSeen', 'ts'];
    return skipKeys.contains(key);
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
    if (value is bool) return value ? 'ON' : 'OFF';
    if (value is num) {
      if (value.abs() >= 1000) {
        return '${(value / 1000).toStringAsFixed(1)}k';
      }
      return value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 1);
    }
    final str = value.toString();
    if (str.length > 10) {
      return '${str.substring(0, 10)}...';
    }
    return str;
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
