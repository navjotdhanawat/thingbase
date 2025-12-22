import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

/// WiFi service provider
final wifiServiceProvider = Provider<WifiService>((ref) {
  return WifiService();
});

/// Service for managing WiFi connections
class WifiService {
  final NetworkInfo _networkInfo = NetworkInfo();

  /// Get current WiFi SSID
  Future<String?> getCurrentSSID() async {
    try {
      // Request location permission (required for WiFi info on Android)
      if (Platform.isAndroid) {
        final status = await Permission.location.request();
        if (!status.isGranted) {
          return null;
        }
      }

      return await _networkInfo.getWifiName();
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get SSID: $e');
      }
      return null;
    }
  }

  /// Get current WiFi BSSID
  Future<String?> getCurrentBSSID() async {
    try {
      return await _networkInfo.getWifiBSSID();
    } catch (e) {
      return null;
    }
  }

  /// Get current WiFi IP
  Future<String?> getCurrentIP() async {
    try {
      return await _networkInfo.getWifiIP();
    } catch (e) {
      return null;
    }
  }

  /// Check if connected to a device hotspot (starts with IOT-)
  Future<bool> isConnectedToDeviceHotspot() async {
    final ssid = await getCurrentSSID();
    if (ssid == null) return false;

    // Remove quotes if present (some Android versions return quoted SSID)
    final cleanSSID = ssid.replaceAll('"', '');

    // Check common IoT device hotspot patterns
    return cleanSSID.startsWith('IOT-') ||
        cleanSSID.startsWith('ESP_') ||
        cleanSSID.startsWith('ESP32-') ||
        cleanSSID.startsWith('PROV_') ||
        cleanSSID.contains('SETUP') ||
        cleanSSID.contains('PROV');
  }

  /// Get WiFi connection status
  Future<WifiConnectionStatus> getConnectionStatus() async {
    try {
      final ssid = await getCurrentSSID();
      final ip = await getCurrentIP();

      if (ssid == null || ip == null) {
        return WifiConnectionStatus(
          isConnected: false,
          ssid: null,
          ip: null,
          isDeviceHotspot: false,
        );
      }

      final isDeviceHotspot = await isConnectedToDeviceHotspot();

      return WifiConnectionStatus(
        isConnected: true,
        ssid: ssid.replaceAll('"', ''),
        ip: ip,
        isDeviceHotspot: isDeviceHotspot,
      );
    } catch (e) {
      return WifiConnectionStatus(
        isConnected: false,
        ssid: null,
        ip: null,
        isDeviceHotspot: false,
      );
    }
  }

  /// Request required permissions for WiFi operations
  Future<bool> requestPermissions() async {
    if (kIsWeb) return true;

    if (Platform.isAndroid) {
      final statuses = await [
        Permission.location,
        Permission.nearbyWifiDevices,
      ].request();

      return statuses[Permission.location]?.isGranted == true;
    }

    if (Platform.isIOS) {
      final status = await Permission.location.request();
      return status.isGranted;
    }

    return true;
  }
}

/// WiFi connection status
class WifiConnectionStatus {
  final bool isConnected;
  final String? ssid;
  final String? ip;
  final bool isDeviceHotspot;

  WifiConnectionStatus({
    required this.isConnected,
    required this.ssid,
    required this.ip,
    required this.isDeviceHotspot,
  });
}

