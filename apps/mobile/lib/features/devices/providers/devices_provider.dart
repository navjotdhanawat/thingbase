import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

/// Devices list provider
final devicesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.read(dioProvider);
  final response = await dio.get('/devices');

  if (response.data['success'] == true) {
    final data = response.data['data'];
    return List<Map<String, dynamic>>.from(data['items'] ?? []);
  }

  return [];
});

/// Single device provider
final deviceProvider = FutureProvider.family<Map<String, dynamic>?, String>((ref, deviceId) async {
  final dio = ref.read(dioProvider);
  final response = await dio.get('/devices/$deviceId');

  if (response.data['success'] == true) {
    return response.data['data'];
  }

  return null;
});

/// Device state provider (real-time from Redis)
final deviceStateProvider = FutureProvider.family<Map<String, dynamic>?, String>((ref, deviceId) async {
  final dio = ref.read(dioProvider);
  final response = await dio.get('/devices/$deviceId/state');

  if (response.data['success'] == true) {
    return response.data['data'];
  }

  return null;
});

