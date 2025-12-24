import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../providers/devices_provider.dart';

class DevicesListScreen extends ConsumerStatefulWidget {
  const DevicesListScreen({super.key});

  @override
  ConsumerState<DevicesListScreen> createState() => _DevicesListScreenState();
}

class _DevicesListScreenState extends ConsumerState<DevicesListScreen> {
  String? _selectedTypeId;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final devicesAsync = ref.watch(devicesProvider);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        title: Text(
          'Devices',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list, color: colors.textPrimary),
            onPressed: () => _showFilterSheet(context, colors),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: _buildSearchBar(colors),
          ),

          // Type Filter Tabs
          devicesAsync.when(
            loading: () => const SizedBox(height: 40),
            error: (_, __) => const SizedBox.shrink(),
            data: (devices) {
              final types = _extractDeviceTypes(devices);
              if (types.isEmpty) return const SizedBox.shrink();
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DeviceTypeTabs(
                  deviceTypes: types,
                  selectedTypeId: _selectedTypeId,
                  onTypeSelected: (typeId) {
                    setState(() => _selectedTypeId = typeId);
                  },
                ),
              );
            },
          ),

          // Device List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(devicesProvider);
              },
              color: AppColors.accentPrimary,
              backgroundColor: colors.backgroundCard,
              child: devicesAsync.when(
                loading: () => _buildLoadingList(colors),
                error: (error, stack) => _buildErrorState(colors),
                data: (devices) {
                  final filteredDevices = _filterDevices(devices);
                  if (filteredDevices.isEmpty) {
                    return _buildEmptyState(colors);
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    itemCount: filteredDevices.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final device = filteredDevices[index];
                      return _buildDeviceItem(device, index);
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-device'),
        backgroundColor: AppColors.accentPrimary,
        foregroundColor: colors.background,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildSearchBar(AppColors colors) {
    return Container(
      decoration: BoxDecoration(
        color: colors.glassBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.glassBorder),
      ),
      child: TextField(
        controller: _searchController,
        style: TextStyle(color: colors.textPrimary),
        decoration: InputDecoration(
          hintText: 'Search devices...',
          hintStyle: TextStyle(color: colors.textMuted),
          prefixIcon: Icon(Icons.search, color: colors.textMuted),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.clear, color: colors.textMuted),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        onChanged: (value) {
          setState(() => _searchQuery = value);
        },
      ),
    );
  }

  Widget _buildDeviceItem(Map<String, dynamic> device, int index) {
    final status = device['status'] ?? 'pending';
    final isOnline = status == 'online';
    final deviceType = device['type'];
    final icon = _getDeviceIcon(deviceType?['icon']);

    return DeviceListCard(
      icon: icon,
      title: device['name'] ?? 'Unknown Device',
      subtitle: deviceType?['name'],
      status: status,
      isOnline: isOnline,
      onTap: () => context.push('/devices/${device['id']}'),
    );
  }

  Widget _buildLoadingList(AppColors colors) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return Container(
          height: 80,
          decoration: BoxDecoration(
            color: colors.backgroundCard,
            borderRadius: BorderRadius.circular(16),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(AppColors colors) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.devices_other,
              size: 80,
              color: colors.textMuted,
            ),
            const SizedBox(height: 24),
            Text(
              _searchQuery.isNotEmpty || _selectedTypeId != null
                  ? 'No Matching Devices'
                  : 'No Devices',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty || _selectedTypeId != null
                  ? 'Try adjusting your filters'
                  : 'Add your first device to start monitoring',
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (_searchQuery.isEmpty && _selectedTypeId == null)
              FilledButton.icon(
                onPressed: () => context.push('/add-device'),
                icon: const Icon(Icons.add),
                label: const Text('Add Device'),
              )
            else
              OutlinedButton(
                onPressed: () {
                  _searchController.clear();
                  setState(() {
                    _searchQuery = '';
                    _selectedTypeId = null;
                  });
                },
                child: const Text('Clear Filters'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(AppColors colors) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
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
          OutlinedButton.icon(
            onPressed: () => ref.invalidate(devicesProvider),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet(BuildContext context, AppColors colors) {
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colors.glassBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Filter Devices',
                style: TextStyle(
                  color: colors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 24),
              _buildFilterOption(colors, 'All Devices', _selectedTypeId == null, () {
                setState(() => _selectedTypeId = null);
                Navigator.pop(context);
              }),
              _buildFilterOption(colors, 'Online Only', false, () {
                Navigator.pop(context);
              }),
              _buildFilterOption(colors, 'Offline Only', false, () {
                Navigator.pop(context);
              }),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterOption(AppColors colors, String label, bool isSelected, VoidCallback onTap) {
    return ListTile(
      title: Text(
        label,
        style: TextStyle(
          color: isSelected ? AppColors.accentPrimary : colors.textPrimary,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      trailing: isSelected
          ? Icon(Icons.check, color: AppColors.accentPrimary)
          : null,
      onTap: onTap,
    );
  }

  List<Map<String, dynamic>> _extractDeviceTypes(List<Map<String, dynamic>> devices) {
    final typesMap = <String, Map<String, dynamic>>{};
    for (final device in devices) {
      final type = device['type'] as Map<String, dynamic>?;
      if (type != null && type['id'] != null) {
        typesMap[type['id']] = type;
      }
    }
    return typesMap.values.toList();
  }

  List<Map<String, dynamic>> _filterDevices(List<Map<String, dynamic>> devices) {
    var filtered = devices;

    if (_selectedTypeId != null) {
      filtered = filtered.where((d) {
        return d['type']?['id'] == _selectedTypeId;
      }).toList();
    }

    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((d) {
        final name = (d['name'] ?? '').toString().toLowerCase();
        final type = (d['type']?['name'] ?? '').toString().toLowerCase();
        return name.contains(query) || type.contains(query);
      }).toList();
    }

    return filtered;
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
      default:
        return Icons.device_hub;
    }
  }
}
