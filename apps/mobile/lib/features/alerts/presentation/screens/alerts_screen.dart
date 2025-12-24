import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../providers/alerts_provider.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppColors.of(context);
    final alertsAsync = ref.watch(alertsProvider);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        title: Text(
          'Alerts',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list, color: colors.textPrimary),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(alertsProvider);
        },
        color: AppColors.accentPrimary,
        backgroundColor: colors.backgroundCard,
        child: alertsAsync.when(
          loading: () => _buildLoadingState(colors),
          error: (error, _) => _buildErrorState(ref, colors),
          data: (alerts) {
            if (alerts.isEmpty) {
              return _buildEmptyState(colors);
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: alerts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final alert = alerts[index];
                return _AlertCard(
                  alert: alert, 
                  alertsNotifier: ref.read(alertsProvider.notifier),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildLoadingState(AppColors colors) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return Container(
          height: 100,
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
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.statusOnline.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle_outline,
                size: 64,
                color: AppColors.statusOnline,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'All Clear!',
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 24,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'All your devices are running smoothly',
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(WidgetRef ref, AppColors colors) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.statusError),
          const SizedBox(height: 16),
          Text(
            'Failed to Load Alerts',
            style: TextStyle(
              color: colors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => ref.invalidate(alertsProvider),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  final AlertsNotifier alertsNotifier;

  const _AlertCard({required this.alert, required this.alertsNotifier});

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final status = alert['status'] ?? 'active';
    final isActive = status == 'active';

    Color statusColor;
    IconData statusIcon;
    switch (status) {
      case 'active':
        statusColor = AppColors.statusError;
        statusIcon = Icons.warning_amber_rounded;
        break;
      case 'acknowledged':
        statusColor = AppColors.statusWarning;
        statusIcon = Icons.visibility;
        break;
      case 'resolved':
        statusColor = AppColors.statusOnline;
        statusIcon = Icons.check_circle;
        break;
      default:
        statusColor = colors.textMuted;
        statusIcon = Icons.info_outline;
    }

    return SimpleGlassCard(
      isActive: isActive,
      glowColor: statusColor,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(statusIcon, color: statusColor, size: 24),
              ),
              const SizedBox(width: 14),
              
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      alert['rule']?['name'] ?? 'Alert',
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatTime(alert['triggeredAt']),
                      style: TextStyle(
                        color: colors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                    if (alert['device'] != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.device_hub, size: 12, color: colors.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            alert['device']['name'] ?? 'Unknown Device',
                            style: TextStyle(
                              color: colors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              
              StatusBadge(status: status),
            ],
          ),
          
          if (isActive) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      alertsNotifier.acknowledgeAlert(alert['id']);
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.statusWarning,
                      side: BorderSide(color: AppColors.statusWarning),
                    ),
                    child: const Text('Acknowledge'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      alertsNotifier.resolveAlert(alert['id']);
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.statusOnline,
                      foregroundColor: colors.background,
                    ),
                    child: const Text('Resolve'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return 'Unknown';
    try {
      final date = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (e) {
      return 'Unknown';
    }
  }
}
