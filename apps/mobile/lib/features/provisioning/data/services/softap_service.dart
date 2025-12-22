import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// SoftAP provisioning service
/// Handles direct HTTP communication with IoT device over local hotspot
class SoftAPService {
  // Standard IP for ESP32/ESP8266 SoftAP mode
  static const String _deviceIP = '192.168.4.1';
  static const int _devicePort = 80;

  late final Dio _localDio;

  SoftAPService() {
    _localDio = Dio(BaseOptions(
      baseUrl: 'http://$_deviceIP:$_devicePort',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
    ));

    // Add logging for debug
    if (kDebugMode) {
      _localDio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
      ));
    }
  }

  /// Check if connected to device hotspot
  /// Returns device info if connected, null otherwise
  Future<DeviceInfo?> checkDeviceConnection() async {
    try {
      final response = await _localDio.get('/info');

      if (response.statusCode == 200) {
        return DeviceInfo.fromJson(response.data);
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        print('SoftAP: Device not reachable: $e');
      }
      return null;
    }
  }

  /// Scan for available WiFi networks from device
  Future<List<WifiNetwork>> scanNetworks() async {
    try {
      final response = await _localDio.get('/scan');

      if (response.statusCode == 200) {
        final networks = (response.data['networks'] as List?)
            ?.map((n) => WifiNetwork.fromJson(n))
            .toList();
        return networks ?? [];
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        print('SoftAP: Failed to scan networks: $e');
      }
      return [];
    }
  }

  /// Provision device with WiFi credentials and claim token
  Future<ProvisionResult> provisionDevice({
    required String ssid,
    required String password,
    required String claimToken,
    required String serverUrl,
  }) async {
    try {
      final response = await _localDio.post(
        '/provision',
        data: jsonEncode({
          'ssid': ssid,
          'password': password,
          'claimToken': claimToken,
          'serverUrl': serverUrl,
        }),
        options: Options(
          contentType: ContentType.json.toString(),
        ),
      );

      if (response.statusCode == 200) {
        return ProvisionResult(
          success: true,
          message: response.data['message'] ?? 'Device provisioned successfully',
        );
      }

      return ProvisionResult(
        success: false,
        message: response.data['error'] ?? 'Provisioning failed',
      );
    } on DioException catch (e) {
      return ProvisionResult(
        success: false,
        message: _getDioErrorMessage(e),
      );
    } catch (e) {
      return ProvisionResult(
        success: false,
        message: 'Failed to connect to device: $e',
      );
    }
  }

  /// Test connectivity to device
  Future<bool> ping() async {
    try {
      final response = await _localDio.get(
        '/ping',
        options: Options(
          receiveTimeout: const Duration(seconds: 3),
        ),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Get device status
  Future<DeviceStatus?> getStatus() async {
    try {
      final response = await _localDio.get('/status');

      if (response.statusCode == 200) {
        return DeviceStatus.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  String _getDioErrorMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return 'Connection timeout. Make sure you are connected to device WiFi.';
      case DioExceptionType.receiveTimeout:
        return 'Device not responding. Please try again.';
      case DioExceptionType.connectionError:
        return 'Cannot connect to device. Verify WiFi connection.';
      default:
        return e.message ?? 'Unknown error occurred';
    }
  }
}

/// Device info returned from /info endpoint
class DeviceInfo {
  final String deviceId;
  final String firmware;
  final String model;
  final String? macAddress;

  DeviceInfo({
    required this.deviceId,
    required this.firmware,
    required this.model,
    this.macAddress,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      deviceId: json['deviceId'] ?? json['device_id'] ?? '',
      firmware: json['firmware'] ?? json['fw_version'] ?? 'unknown',
      model: json['model'] ?? json['device_type'] ?? 'unknown',
      macAddress: json['mac'] ?? json['macAddress'],
    );
  }
}

/// WiFi network info from device scan
class WifiNetwork {
  final String ssid;
  final int rssi;
  final bool isSecure;
  final String? bssid;

  WifiNetwork({
    required this.ssid,
    required this.rssi,
    this.isSecure = true,
    this.bssid,
  });

  factory WifiNetwork.fromJson(Map<String, dynamic> json) {
    return WifiNetwork(
      ssid: json['ssid'] ?? '',
      rssi: json['rssi'] ?? -100,
      isSecure: json['secure'] ?? json['encryption'] != 'none',
      bssid: json['bssid'],
    );
  }

  /// Signal strength as percentage (0-100)
  int get signalStrength {
    // RSSI typically ranges from -30 (excellent) to -100 (poor)
    if (rssi >= -50) return 100;
    if (rssi <= -100) return 0;
    return ((rssi + 100) * 2).clamp(0, 100);
  }
}

/// Result of provisioning attempt
class ProvisionResult {
  final bool success;
  final String message;
  final String? errorCode;

  ProvisionResult({
    required this.success,
    required this.message,
    this.errorCode,
  });
}

/// Device status from /status endpoint
class DeviceStatus {
  final String state;
  final bool isProvisioned;
  final String? connectedSsid;

  DeviceStatus({
    required this.state,
    required this.isProvisioned,
    this.connectedSsid,
  });

  factory DeviceStatus.fromJson(Map<String, dynamic> json) {
    return DeviceStatus(
      state: json['state'] ?? 'unknown',
      isProvisioned: json['provisioned'] ?? false,
      connectedSsid: json['ssid'],
    );
  }
}

