import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppColors.of(context);
    final authState = ref.watch(authStateProvider);
    final branding = ref.watch(brandingProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        title: Text(
          'Settings',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionHeader('Profile', colors),
          _buildProfileCard(context, authState, colors),

          const SizedBox(height: 24),

          _buildSectionHeader('Appearance', colors),
          _buildAppearanceCard(context, ref, themeMode, colors),

          const SizedBox(height: 24),

          _buildSectionHeader('Notifications', colors),
          _buildNotificationsCard(context, colors),

          const SizedBox(height: 24),

          _buildSectionHeader('About', colors),
          _buildAboutCard(context, branding, colors),

          const SizedBox(height: 24),

          _buildLogoutButton(context, ref, colors),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, AppColors colors) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        title,
        style: TextStyle(
          color: AppColors.accentPrimary,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildProfileCard(BuildContext context, dynamic authState, AppColors colors) {
    return SimpleGlassCard(
      onTap: () {},
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.accentPrimary, AppColors.accentDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.accentPrimary.withOpacity(0.3),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Center(
              child: Text(
                (authState.user?.name ?? 'U')[0].toUpperCase(),
                style: TextStyle(
                  color: colors.background,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  authState.user?.name ?? 'User',
                  style: TextStyle(
                    color: colors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  authState.user?.email ?? '',
                  style: TextStyle(
                    color: colors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textMuted),
        ],
      ),
    );
  }

  Widget _buildAppearanceCard(BuildContext context, WidgetRef ref, ThemeMode themeMode, AppColors colors) {
    return SimpleGlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: colors.surfaceDim,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.dark_mode, color: colors.textPrimary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              'Theme',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 16,
              ),
            ),
          ),
          _ThemeToggle(
            themeMode: themeMode,
            colors: colors,
            onChanged: (mode) {
              ref.read(themeModeProvider.notifier).state = mode;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsCard(BuildContext context, AppColors colors) {
    return SimpleGlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _SettingsSwitch(
            icon: Icons.notifications_outlined,
            title: 'Push Notifications',
            subtitle: 'Receive alerts on your device',
            value: true,
            colors: colors,
            onChanged: (value) {},
          ),
          Divider(height: 1, color: colors.glassBorder),
          _SettingsSwitch(
            icon: Icons.email_outlined,
            title: 'Email Notifications',
            subtitle: 'Receive alerts via email',
            value: true,
            colors: colors,
            onChanged: (value) {},
          ),
        ],
      ),
    );
  }

  Widget _buildAboutCard(BuildContext context, BrandingConfig branding, AppColors colors) {
    return SimpleGlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _SettingsRow(
            icon: Icons.info_outline,
            title: 'App Version',
            value: '1.0.0',
            colors: colors,
          ),
          Divider(height: 1, color: colors.glassBorder),
          _SettingsRow(
            icon: Icons.business,
            title: 'Organization',
            value: branding.tenantName,
            colors: colors,
          ),
          Divider(height: 1, color: colors.glassBorder),
          _SettingsRow(
            icon: Icons.description_outlined,
            title: 'Terms of Service',
            showArrow: true,
            colors: colors,
            onTap: () {},
          ),
          Divider(height: 1, color: colors.glassBorder),
          _SettingsRow(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Policy',
            showArrow: true,
            colors: colors,
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, WidgetRef ref, AppColors colors) {
    return FilledButton.icon(
      onPressed: () => _showLogoutDialog(context, ref, colors),
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.statusError.withOpacity(0.15),
        foregroundColor: AppColors.statusError,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: AppColors.statusError.withOpacity(0.3)),
        ),
      ),
      icon: const Icon(Icons.logout),
      label: const Text('Sign Out'),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref, AppColors colors) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: colors.backgroundCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Text(
          'Sign Out',
          style: TextStyle(color: colors.textPrimary),
        ),
        content: Text(
          'Are you sure you want to sign out?',
          style: TextStyle(color: colors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: colors.textSecondary)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(authStateProvider.notifier).logout();
              if (context.mounted) {
                context.go('/auth/login');
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.statusError,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

class _ThemeToggle extends StatelessWidget {
  final ThemeMode themeMode;
  final AppColors colors;
  final ValueChanged<ThemeMode> onChanged;

  const _ThemeToggle({
    required this.themeMode, 
    required this.colors,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: colors.surfaceDim,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ThemeButton(
            icon: Icons.brightness_auto,
            isSelected: themeMode == ThemeMode.system,
            colors: colors,
            onTap: () => onChanged(ThemeMode.system),
          ),
          _ThemeButton(
            icon: Icons.light_mode,
            isSelected: themeMode == ThemeMode.light,
            colors: colors,
            onTap: () => onChanged(ThemeMode.light),
          ),
          _ThemeButton(
            icon: Icons.dark_mode,
            isSelected: themeMode == ThemeMode.dark,
            colors: colors,
            onTap: () => onChanged(ThemeMode.dark),
          ),
        ],
      ),
    );
  }
}

class _ThemeButton extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final AppColors colors;
  final VoidCallback onTap;

  const _ThemeButton({
    required this.icon,
    required this.isSelected,
    required this.colors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppAnimations.normal,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentPrimary.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? AppColors.accentPrimary : colors.textMuted,
        ),
      ),
    );
  }
}

class _SettingsSwitch extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final AppColors colors;
  final ValueChanged<bool> onChanged;

  const _SettingsSwitch({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.colors,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: colors.surfaceDim,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: colors.textPrimary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: colors.textPrimary,
                    fontSize: 15,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: colors.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.accentPrimary,
          ),
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? value;
  final bool showArrow;
  final AppColors colors;
  final VoidCallback? onTap;

  const _SettingsRow({
    required this.icon,
    required this.title,
    required this.colors,
    this.value,
    this.showArrow = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colors.surfaceDim,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: colors.textPrimary, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: colors.textPrimary,
                  fontSize: 15,
                ),
              ),
            ),
            if (value != null)
              Text(
                value!,
                style: TextStyle(
                  color: colors.textMuted,
                  fontSize: 14,
                ),
              ),
            if (showArrow)
              Icon(Icons.chevron_right, color: colors.textMuted),
          ],
        ),
      ),
    );
  }
}
