import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Horizontal scrolling room/location filter tabs
/// Automatically adapts to light/dark theme.
class RoomTabs extends StatelessWidget {
  final List<String> rooms;
  final String selectedRoom;
  final ValueChanged<String> onRoomSelected;

  const RoomTabs({
    super.key,
    required this.rooms,
    required this.selectedRoom,
    required this.onRoomSelected,
  });

  @override
  Widget build(BuildContext context) {
    final allRooms = ['All Devices', ...rooms];

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: allRooms.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final room = allRooms[index];
          final isSelected = room == selectedRoom;

          return _RoomChip(
            label: room,
            isSelected: isSelected,
            onTap: () => onRoomSelected(room),
          );
        },
      ),
    );
  }
}

class _RoomChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoomChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppAnimations.normal,
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppColors.accentPrimary.withOpacity(0.15)
              : colors.glassBackground,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected 
                ? AppColors.accentPrimary.withOpacity(0.4)
                : colors.glassBorder,
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected 
                ? AppColors.accentPrimary
                : colors.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

/// Device type filter tabs
class DeviceTypeTabs extends StatelessWidget {
  final List<Map<String, dynamic>> deviceTypes;
  final String? selectedTypeId;
  final ValueChanged<String?> onTypeSelected;

  const DeviceTypeTabs({
    super.key,
    required this.deviceTypes,
    required this.selectedTypeId,
    required this.onTypeSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: deviceTypes.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _RoomChip(
              label: 'All Types',
              isSelected: selectedTypeId == null,
              onTap: () => onTypeSelected(null),
            );
          }

          final type = deviceTypes[index - 1];
          final typeId = type['id'] as String;
          final typeName = type['name'] as String? ?? 'Unknown';
          final isSelected = typeId == selectedTypeId;

          return _RoomChip(
            label: typeName,
            isSelected: isSelected,
            onTap: () => onTypeSelected(typeId),
          );
        },
      ),
    );
  }
}
