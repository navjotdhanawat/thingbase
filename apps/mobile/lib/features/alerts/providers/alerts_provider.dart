import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

/// Alerts list provider
final alertsProvider = StateNotifierProvider<AlertsNotifier, AsyncValue<List<Map<String, dynamic>>>>((ref) {
  return AlertsNotifier(ref);
});

class AlertsNotifier extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  final Ref _ref;

  AlertsNotifier(this._ref) : super(const AsyncValue.loading()) {
    _fetchAlerts();
  }

  Future<void> _fetchAlerts() async {
    state = const AsyncValue.loading();
    
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.get('/alerts');

      if (response.data['success'] == true) {
        final data = response.data['data'];
        state = AsyncValue.data(List<Map<String, dynamic>>.from(data['items'] ?? []));
      } else {
        state = AsyncValue.error('Failed to load alerts', StackTrace.current);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    await _fetchAlerts();
  }

  Future<void> acknowledgeAlert(String alertId) async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.post('/alerts/$alertId/acknowledge');
      await _fetchAlerts();
    } catch (e) {
      // Handle error
    }
  }

  Future<void> resolveAlert(String alertId) async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.post('/alerts/$alertId/resolve');
      await _fetchAlerts();
    } catch (e) {
      // Handle error
    }
  }
}

