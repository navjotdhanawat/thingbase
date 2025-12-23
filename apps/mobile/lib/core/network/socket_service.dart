import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';
import '../storage/secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Device telemetry event
class DeviceTelemetryEvent {
  final String deviceId;
  final Map<String, dynamic> data;
  final String timestamp;

  DeviceTelemetryEvent({
    required this.deviceId,
    required this.data,
    required this.timestamp,
  });

  factory DeviceTelemetryEvent.fromJson(Map<String, dynamic> json) {
    return DeviceTelemetryEvent(
      deviceId: json['deviceId'] ?? '',
      data: json['data'] ?? {},
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
    );
  }
}

/// Device status event
class DeviceStatusEvent {
  final String deviceId;
  final bool online;
  final String timestamp;

  DeviceStatusEvent({
    required this.deviceId,
    required this.online,
    required this.timestamp,
  });

  factory DeviceStatusEvent.fromJson(Map<String, dynamic> json) {
    return DeviceStatusEvent(
      deviceId: json['deviceId'] ?? '',
      online: json['online'] ?? false,
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
    );
  }
}

/// Command acknowledgement event
class CommandAckEvent {
  final String deviceId;
  final String correlationId;
  final String status;
  final String? error;
  final Map<String, dynamic>? state;

  CommandAckEvent({
    required this.deviceId,
    required this.correlationId,
    required this.status,
    this.error,
    this.state,
  });

  factory CommandAckEvent.fromJson(Map<String, dynamic> json) {
    return CommandAckEvent(
      deviceId: json['deviceId'] ?? '',
      correlationId: json['correlationId'] ?? '',
      status: json['status'] ?? 'unknown',
      error: json['error'],
      state: json['state'],
    );
  }
}

/// Socket.IO service for real-time device updates
class SocketService {
  IO.Socket? _socket;
  final SecureStorageService _storage;
  final Set<String> _subscribedDevices = {};
  
  // Stream controllers for different event types
  final _telemetryController = StreamController<DeviceTelemetryEvent>.broadcast();
  final _statusController = StreamController<DeviceStatusEvent>.broadcast();
  final _commandAckController = StreamController<CommandAckEvent>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  
  // Expose streams
  Stream<DeviceTelemetryEvent> get telemetryStream => _telemetryController.stream;
  Stream<DeviceStatusEvent> get statusStream => _statusController.stream;
  Stream<CommandAckEvent> get commandAckStream => _commandAckController.stream;
  Stream<bool> get connectionStream => _connectionController.stream;
  
  bool get isConnected => _socket?.connected ?? false;

  SocketService(this._storage);

  /// Connect to the WebSocket server
  Future<void> connect() async {
    if (_socket?.connected ?? false) {
      debugPrint('🔌 Socket already connected');
      return;
    }

    final accessToken = await _storage.getAccessToken();
    if (accessToken == null) {
      debugPrint('🔌 No access token, cannot connect');
      return;
    }

    final baseUrl = AppConfig.current.wsBaseUrl;
    debugPrint('🔌 Connecting to WebSocket: $baseUrl/devices');

    _socket = IO.io(
      '$baseUrl/devices',
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': accessToken})
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .setTimeout(10000)
          .build(),
    );

    _setupEventListeners();
  }

  void _setupEventListeners() {
    _socket?.onConnect((_) {
      debugPrint('🔌 WebSocket connected');
      _connectionController.add(true);
      
      // Resubscribe to devices after reconnection
      for (final deviceId in _subscribedDevices) {
        _socket?.emit('subscribe:device', deviceId);
      }
    });

    _socket?.onDisconnect((_) {
      debugPrint('🔌 WebSocket disconnected');
      _connectionController.add(false);
    });

    _socket?.onConnectError((error) {
      debugPrint('🔌 WebSocket connection error: $error');
      _connectionController.add(false);
    });

    _socket?.onError((error) {
      debugPrint('🔌 WebSocket error: $error');
    });

    // Handle device telemetry events
    _socket?.on('device:telemetry', (data) {
      try {
        final event = DeviceTelemetryEvent.fromJson(Map<String, dynamic>.from(data));
        _telemetryController.add(event);
      } catch (e) {
        debugPrint('🔌 Error parsing telemetry: $e');
      }
    });

    // Handle device state events
    _socket?.on('device:state', (data) {
      try {
        final mapData = Map<String, dynamic>.from(data);
        final event = DeviceTelemetryEvent(
          deviceId: mapData['deviceId'] ?? '',
          data: mapData['state'] ?? {},
          timestamp: DateTime.now().toIso8601String(),
        );
        _telemetryController.add(event);
      } catch (e) {
        debugPrint('🔌 Error parsing state: $e');
      }
    });

    // Handle device status events (online/offline)
    _socket?.on('device:status', (data) {
      try {
        final event = DeviceStatusEvent.fromJson(Map<String, dynamic>.from(data));
        _statusController.add(event);
      } catch (e) {
        debugPrint('🔌 Error parsing status: $e');
      }
    });

    // Handle command acknowledgements
    _socket?.on('command:ack', (data) {
      try {
        final mapData = Map<String, dynamic>.from(data);
        final event = CommandAckEvent.fromJson(mapData);
        _commandAckController.add(event);
        
        // Also emit as telemetry if state is included
        // This ensures real-time state updates from commands are reflected
        if (event.state != null && event.deviceId.isNotEmpty) {
          final telemetryEvent = DeviceTelemetryEvent(
            deviceId: event.deviceId,
            data: event.state!,
            timestamp: DateTime.now().toIso8601String(),
          );
          _telemetryController.add(telemetryEvent);
          debugPrint('🔌 Command ack with state -> emitted as telemetry: ${event.deviceId}');
        }
      } catch (e) {
        debugPrint('🔌 Error parsing command ack: $e');
      }
    });

    // Handle initial devices data
    _socket?.on('devices:init', (data) {
      debugPrint('🔌 Received initial devices data');
      // You can process initial state here if needed
    });
  }

  /// Subscribe to a device's real-time updates
  void subscribeToDevice(String deviceId) {
    if (!_subscribedDevices.contains(deviceId)) {
      _subscribedDevices.add(deviceId);
      if (_socket?.connected ?? false) {
        _socket?.emit('subscribe:device', deviceId);
        debugPrint('🔌 Subscribed to device: $deviceId');
      }
    }
  }

  /// Unsubscribe from a device's updates
  void unsubscribeFromDevice(String deviceId) {
    _subscribedDevices.remove(deviceId);
    if (_socket?.connected ?? false) {
      _socket?.emit('unsubscribe:device', deviceId);
      debugPrint('🔌 Unsubscribed from device: $deviceId');
    }
  }

  /// Send a command to a device
  /// Returns a Future that completes with the response
  Future<Map<String, dynamic>> sendCommand(
    String deviceId,
    String action, {
    Map<String, dynamic>? params,
  }) async {
    if (!(_socket?.connected ?? false)) {
      return {'success': false, 'error': 'Not connected to server'};
    }

    final completer = Completer<Map<String, dynamic>>();
    
    // Set timeout
    final timeout = Timer(const Duration(seconds: 15), () {
      if (!completer.isCompleted) {
        completer.complete({'success': false, 'error': 'Command timed out'});
      }
    });

    _socket?.emitWithAck(
      'send:command',
      {
        'deviceId': deviceId,
        'action': action,
        'params': params ?? {},
      },
      ack: (response) {
        timeout.cancel();
        if (!completer.isCompleted) {
          completer.complete(Map<String, dynamic>.from(response));
        }
      },
    );

    return completer.future;
  }

  /// Disconnect from the WebSocket server
  void disconnect() {
    _subscribedDevices.clear();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    debugPrint('🔌 Socket disconnected and disposed');
  }

  /// Dispose the service and clean up resources
  void dispose() {
    disconnect();
    _telemetryController.close();
    _statusController.close();
    _commandAckController.close();
    _connectionController.close();
  }
}

/// Provider for SocketService
final socketServiceProvider = Provider<SocketService>((ref) {
  final storage = ref.read(secureStorageProvider);
  final service = SocketService(storage);
  
  ref.onDispose(() {
    service.dispose();
  });
  
  return service;
});

/// Provider for WebSocket connection status
final socketConnectionProvider = StreamProvider<bool>((ref) {
  final socketService = ref.watch(socketServiceProvider);
  return socketService.connectionStream;
});

/// Provider for device telemetry stream (filtered by device ID)
final deviceTelemetryProvider = StreamProvider.family<DeviceTelemetryEvent?, String>((ref, deviceId) {
  final socketService = ref.watch(socketServiceProvider);
  
  // Subscribe when provider is created
  socketService.subscribeToDevice(deviceId);
  
  // Unsubscribe when disposed
  ref.onDispose(() {
    socketService.unsubscribeFromDevice(deviceId);
  });
  
  return socketService.telemetryStream.where((event) => event.deviceId == deviceId);
});

/// Provider for device status stream (filtered by device ID)
final deviceStatusProvider = StreamProvider.family<DeviceStatusEvent?, String>((ref, deviceId) {
  final socketService = ref.watch(socketServiceProvider);
  return socketService.statusStream.where((event) => event.deviceId == deviceId);
});
