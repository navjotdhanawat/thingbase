import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/widgets.dart';
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
  SocketService? _socketService;
  bool _isDisposed = false;
  
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

    _connectionSubscription = _socketService?.connectionStream.listen((connected) {
      if (mounted && !_isDisposed) {
        setState(() => _isConnected = connected);
      }
    });

    _telemetrySubscription = _socketService?.telemetryStream.listen((event) {
      if (event.deviceId == widget.deviceId && mounted && !_isDisposed) {
        setState(() {
          _realtimeState = {..._realtimeState, ...event.data};
          final lastSeenFromData = event.data['lastSeen'];
          _realtimeLastSeen = lastSeenFromData?.toString() ?? event.timestamp;
          final onlineFromData = event.data['online'];
          _realtimeOnline = onlineFromData is bool ? onlineFromData : true;
          for (final key in event.data.keys) {
            _pendingCommands.remove(key);
          }
        });
      }
    });

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
    _socketService?.unsubscribeFromDevice(widget.deviceId);
    super.dispose();
  }

  Future<void> _handleControlChange(String key, dynamic value) async {
    if (_isDisposed) return;
    
    setState(() {
      _pendingCommands.add(key);
      _realtimeState[key] = value;
    });

    final commandSender = ref.read(commandSenderProvider);
    final result = await commandSender.sendCommand(
      deviceId: widget.deviceId,
      key: key,
      value: value,
    );

    if (!result.success && mounted && !_isDisposed) {
      ref.invalidate(deviceStateProvider(widget.deviceId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.error ?? 'Failed to send command'),
          backgroundColor: AppColors.statusError,
        ),
      );
    }

    Future.delayed(const Duration(seconds: 5), () {
      if (mounted && !_isDisposed) {
        setState(() => _pendingCommands.remove(key));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final deviceAsync = ref.watch(deviceProvider(widget.deviceId));
    final stateAsync = ref.watch(deviceStateProvider(widget.deviceId));

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        title: deviceAsync.when(
          loading: () => Text('Loading...', style: TextStyle(color: colors.textPrimary)),
          error: (_, __) => Text('Device', style: TextStyle(color: colors.textPrimary)),
          data: (device) => Text(
            device?['name'] ?? 'Device',
            style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w600),
          ),
        ),
        actions: [
          if (_isConnected)
            const LiveIndicator()
          else
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(Icons.wifi_off, color: colors.textMuted, size: 20),
            ),
          IconButton(
            icon: Icon(Icons.more_vert, color: colors.textPrimary),
            onPressed: () => _showOptionsMenu(context, colors),
          ),
        ],
      ),
      body: deviceAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _buildErrorState(colors),
        data: (device) {
          if (device == null) {
            return Center(
              child: Text('Device not found', style: TextStyle(color: colors.textSecondary)),
            );
          }

          final schema = device['type']?['schema'] as Map<String, dynamic>?;
          final allFields = DeviceWidgetFactory.parseFields(schema);
          final sensorFields = DeviceWidgetFactory.getSensorFields(allFields);
          final controlFields = DeviceWidgetFactory.getControlFields(allFields);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(deviceProvider(widget.deviceId));
              ref.invalidate(deviceStateProvider(widget.deviceId));
            },
            color: AppColors.accentPrimary,
            backgroundColor: colors.backgroundCard,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusCard(device, colors),
                  
                  const SizedBox(height: 24),

                  if (sensorFields.isNotEmpty) ...[
                    _buildSectionHeader('Sensors', colors),
                    const SizedBox(height: 12),
                    stateAsync.when(
                      loading: () => _buildLoadingGrid(sensorFields.length, colors),
                      error: (_, __) => _buildNoDataCard(colors),
                      data: (state) {
                        final mergedState = {...(state ?? {}), ..._realtimeState};
                        if (mergedState.isEmpty) return _buildNoDataCard(colors);
                        return _buildSensorGrid(sensorFields, mergedState);
                      },
                    ),
                    const SizedBox(height: 24),
                  ],

                  if (controlFields.isNotEmpty) ...[
                    _buildSectionHeader('Controls', colors),
                    const SizedBox(height: 12),
                    stateAsync.when(
                      loading: () => _buildLoadingControls(controlFields.length, colors),
                      error: (_, __) => _buildControlsList(controlFields, {}),
                      data: (state) {
                        final mergedState = {...(state ?? {}), ..._realtimeState};
                        return _buildControlsList(controlFields, mergedState);
                      },
                    ),
                    const SizedBox(height: 24),
                  ],

                  if (allFields.isEmpty) ...[
                    _buildSectionHeader('Current State', colors),
                    const SizedBox(height: 12),
                    stateAsync.when(
                      loading: () => _buildLoadingGrid(4, colors),
                      error: (_, __) => _buildNoDataCard(colors),
                      data: (state) {
                        final mergedState = {...(state ?? {}), ..._realtimeState};
                        if (mergedState.isEmpty) return _buildNoDataCard(colors);
                        return _buildRawStateGrid(mergedState, colors);
                      },
                    ),
                    const SizedBox(height: 24),
                  ],

                  _buildSectionHeader('Device Information', colors),
                  const SizedBox(height: 12),
                  _buildInfoSection(device, colors),
                  
                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title, AppColors colors) {
    return Text(
      title,
      style: TextStyle(
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildStatusCard(Map<String, dynamic> device, AppColors colors) {
    final status = device['status'] ?? 'pending';
    final isOnline = _realtimeOnline ?? (status == 'online');
    final lastSeen = _realtimeLastSeen ?? device['lastSeen'];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isOnline
              ? [AppColors.accentPrimary.withOpacity(0.3), AppColors.accentDark.withOpacity(0.2)]
              : [colors.surfaceDim, colors.backgroundCard],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isOnline 
              ? AppColors.accentPrimary.withOpacity(0.4)
              : colors.glassBorder,
        ),
        boxShadow: isOnline
            ? [BoxShadow(color: AppColors.glowPrimary, blurRadius: 20, spreadRadius: -5)]
            : null,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isOnline 
                  ? AppColors.accentPrimary.withOpacity(0.2)
                  : colors.glassBackground,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              isOnline ? Icons.wifi : Icons.wifi_off,
              color: isOnline ? AppColors.accentPrimary : colors.textMuted,
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
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_realtimeOnline != null) ...[
                      const SizedBox(width: 8),
                      const LiveIndicator(),
                    ],
                  ],
                ),
                if (lastSeen != null)
                  Text(
                    'Last seen: ${_formatLastSeen(lastSeen)}',
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSensorGrid(List<DeviceField> fields, Map<String, dynamic> state) {
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
          onControlChanged: null,
        );
      },
    );
  }

  Widget _buildControlsList(List<DeviceField> fields, Map<String, dynamic> state) {
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

  Widget _buildRawStateGrid(Map<String, dynamic> state, AppColors colors) {
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

    if (entries.isEmpty) return _buildNoDataCard(colors);

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
        
        return SimpleGlassCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _formatValue(entry.value),
                style: TextStyle(
                  color: AppColors.accentPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Text(
                _formatKey(entry.key),
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 12,
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

  Widget _buildNoDataCard(AppColors colors) {
    return SimpleGlassCard(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          children: [
            Icon(
              Icons.hourglass_empty,
              size: 40,
              color: colors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              'No data available',
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection(Map<String, dynamic> device, AppColors colors) {
    return SimpleGlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _InfoRow(label: 'ID', value: device['id'], icon: Icons.fingerprint, colors: colors),
          _InfoRow(label: 'Type', value: device['type']?['name'] ?? 'N/A', icon: Icons.category_outlined, colors: colors),
          _InfoRow(label: 'External ID', value: device['externalId'] ?? 'N/A', icon: Icons.tag, colors: colors),
          _InfoRow(
            label: 'Created', 
            value: _formatDate(device['createdAt']),
            icon: Icons.calendar_today_outlined,
            colors: colors,
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingGrid(int count, AppColors colors) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.0,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: count.clamp(1, 4),
      itemBuilder: (context, index) {
        return Container(
          decoration: BoxDecoration(
            color: colors.backgroundCard,
            borderRadius: BorderRadius.circular(16),
          ),
        );
      },
    );
  }

  Widget _buildLoadingControls(int count, AppColors colors) {
    return Column(
      children: List.generate(count.clamp(1, 3), (index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            height: 80,
            decoration: BoxDecoration(
              color: colors.backgroundCard,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildErrorState(AppColors colors) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.statusError),
          const SizedBox(height: 16),
          Text(
            'Failed to load device',
            style: TextStyle(color: colors.textPrimary, fontSize: 18),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => ref.invalidate(deviceProvider(widget.deviceId)),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  void _showOptionsMenu(BuildContext context, AppColors colors) {
    showModalBottomSheet(
      context: context,
      backgroundColor: colors.backgroundCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colors.glassBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Icon(Icons.edit_outlined, color: colors.textPrimary),
                title: Text('Edit Device', style: TextStyle(color: colors.textPrimary)),
                onTap: () => Navigator.pop(context),
              ),
              ListTile(
                leading: Icon(Icons.history, color: colors.textPrimary),
                title: Text('View History', style: TextStyle(color: colors.textPrimary)),
                onTap: () => Navigator.pop(context),
              ),
              ListTile(
                leading: Icon(Icons.delete_outline, color: AppColors.statusError),
                title: Text('Delete Device', style: TextStyle(color: AppColors.statusError)),
                onTap: () => Navigator.pop(context),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
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
    if (str.length > 10) return '${str.substring(0, 10)}...';
    return str;
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final AppColors colors;
  final bool isLast;

  const _InfoRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.colors,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(bottom: BorderSide(color: colors.glassBorder)),
      ),
      child: Row(
        children: [
          Icon(icon, color: colors.textMuted, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: colors.textSecondary, fontSize: 14),
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
