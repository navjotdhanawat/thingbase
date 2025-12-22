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

/// Send command to device
class SendCommandResult {
  final bool success;
  final String? commandId;
  final String? error;

  SendCommandResult({
    required this.success,
    this.commandId,
    this.error,
  });
}

/// Command sender provider
final commandSenderProvider = Provider<CommandSender>((ref) {
  return CommandSender(ref);
});

class CommandSender {
  final Ref _ref;

  CommandSender(this._ref);

  /// Send a control command to a device
  /// 
  /// The command type will be 'set_state' for setting device properties.
  /// The payload contains key-value pairs for the properties to set.
  Future<SendCommandResult> sendCommand({
    required String deviceId,
    required String key,
    required dynamic value,
  }) async {
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/commands', data: {
        'deviceId': deviceId,
        'type': 'set_state',
        'payload': {key: value},
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        return SendCommandResult(
          success: true,
          commandId: data['id'],
        );
      }

      return SendCommandResult(
        success: false,
        error: response.data['error']?['message'] ?? 'Failed to send command',
      );
    } catch (e) {
      return SendCommandResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// Send a batch of control commands
  Future<SendCommandResult> sendBatchCommand({
    required String deviceId,
    required Map<String, dynamic> values,
  }) async {
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/commands', data: {
        'deviceId': deviceId,
        'type': 'set_state',
        'payload': values,
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        return SendCommandResult(
          success: true,
          commandId: data['id'],
        );
      }

      return SendCommandResult(
        success: false,
        error: response.data['error']?['message'] ?? 'Failed to send command',
      );
    } catch (e) {
      return SendCommandResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// Send an action command (for button widgets)
  Future<SendCommandResult> sendAction({
    required String deviceId,
    required String action,
  }) async {
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/commands', data: {
        'deviceId': deviceId,
        'type': action,
        'payload': {},
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        return SendCommandResult(
          success: true,
          commandId: data['id'],
        );
      }

      return SendCommandResult(
        success: false,
        error: response.data['error']?['message'] ?? 'Failed to send command',
      );
    } catch (e) {
      return SendCommandResult(
        success: false,
        error: e.toString(),
      );
    }
  }
}
