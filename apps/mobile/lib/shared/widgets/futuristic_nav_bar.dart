import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// Futuristic bottom navigation bar with modern styling
/// NOTE: This is now replaced by the theme-aware navigation in app_router.dart
/// Keeping for reference or as a more stylized alternative.
class FuturisticNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback? onAddPressed;
  final List<FuturisticNavItem> items;

  const FuturisticNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.onAddPressed,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return Container(
      decoration: BoxDecoration(
        color: colors.background,
        border: Border(
          top: BorderSide(
            color: colors.glassBorder,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              for (int i = 0; i < items.length; i++)
                _NavBarItem(
                  icon: items[i].icon,
                  selectedIcon: items[i].selectedIcon,
                  label: items[i].label,
                  isSelected: currentIndex == i,
                  onTap: () => onTap(i),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class FuturisticNavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const FuturisticNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}

class _NavBarItem extends StatelessWidget {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavBarItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 72,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: AppAnimations.normal,
              curve: Curves.easeInOut,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected 
                    ? AppColors.accentPrimary.withOpacity(0.15)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                isSelected ? selectedIcon : icon,
                color: isSelected 
                    ? AppColors.accentPrimary
                    : colors.textMuted,
                size: 24,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected 
                    ? AppColors.accentPrimary
                    : colors.textMuted,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Alternative Material 3 style navigation bar (theme-aware)
class ModernNavigationBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const ModernNavigationBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    
    return Container(
      decoration: BoxDecoration(
        color: colors.background,
        border: Border(
          top: BorderSide(
            color: colors.glassBorder,
            width: 1,
          ),
        ),
      ),
      child: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: onTap,
        backgroundColor: Colors.transparent,
        indicatorColor: AppColors.accentPrimary.withOpacity(0.2),
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.home_outlined, color: colors.textMuted),
            selectedIcon: Icon(Icons.home_rounded, color: AppColors.accentPrimary),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.devices_outlined, color: colors.textMuted),
            selectedIcon: Icon(Icons.devices, color: AppColors.accentPrimary),
            label: 'Devices',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined, color: colors.textMuted),
            selectedIcon: Icon(Icons.notifications, color: AppColors.accentPrimary),
            label: 'Alerts',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined, color: colors.textMuted),
            selectedIcon: Icon(Icons.settings, color: AppColors.accentPrimary),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
