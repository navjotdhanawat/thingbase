import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/config/app_config.dart';
import '../data/services/softap_service.dart';
import '../data/services/wifi_service.dart';

/// Provisioning method enum
enum ProvisioningMethod {
  softAP,  // WiFi hotspot from device
  ble,     // Bluetooth Low Energy
  qrCode,  // QR code for devices with camera
}

/// Provisioning step enum
enum ProvisioningStep {
  selectMethod,
  enterDeviceDetails,
  connectToDevice,
  enterWifiCredentials,
  provisioning,
  waitingForDevice,
  success,
  error,
}

/// Provisioning state
class ProvisioningState {
  final bool isLoading;
  final String? error;
  final String? claimToken;
  final String? deviceId;
  final String? qrCodeData;
  final DateTime? expiresAt;
  final String claimStatus;
  final bool deviceOnline;
  final ProvisioningMethod? selectedMethod;
  final ProvisioningStep currentStep;
  final List<WifiNetwork> availableNetworks;
  final DeviceInfo? deviceInfo;
  final WifiConnectionStatus? wifiStatus;
  final String? selectedSsid;
  final List<Map<String, dynamic>> deviceTypes;

  const ProvisioningState({
    this.isLoading = false,
    this.error,
    this.claimToken,
    this.deviceId,
    this.qrCodeData,
    this.expiresAt,
    this.claimStatus = 'pending',
    this.deviceOnline = false,
    this.selectedMethod,
    this.currentStep = ProvisioningStep.selectMethod,
    this.availableNetworks = const [],
    this.deviceInfo,
    this.wifiStatus,
    this.selectedSsid,
    this.deviceTypes = const [],
  });

  ProvisioningState copyWith({
    bool? isLoading,
    String? error,
    String? claimToken,
    String? deviceId,
    String? qrCodeData,
    DateTime? expiresAt,
    String? claimStatus,
    bool? deviceOnline,
    ProvisioningMethod? selectedMethod,
    ProvisioningStep? currentStep,
    List<WifiNetwork>? availableNetworks,
    DeviceInfo? deviceInfo,
    WifiConnectionStatus? wifiStatus,
    String? selectedSsid,
    List<Map<String, dynamic>>? deviceTypes,
  }) {
    return ProvisioningState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      claimToken: claimToken ?? this.claimToken,
      deviceId: deviceId ?? this.deviceId,
      qrCodeData: qrCodeData ?? this.qrCodeData,
      expiresAt: expiresAt ?? this.expiresAt,
      claimStatus: claimStatus ?? this.claimStatus,
      deviceOnline: deviceOnline ?? this.deviceOnline,
      selectedMethod: selectedMethod ?? this.selectedMethod,
      currentStep: currentStep ?? this.currentStep,
      availableNetworks: availableNetworks ?? this.availableNetworks,
      deviceInfo: deviceInfo ?? this.deviceInfo,
      wifiStatus: wifiStatus ?? this.wifiStatus,
      selectedSsid: selectedSsid ?? this.selectedSsid,
      deviceTypes: deviceTypes ?? this.deviceTypes,
    );
  }
}

/// Provisioning provider
final provisioningProvider = StateNotifierProvider<ProvisioningNotifier, ProvisioningState>((ref) {
  return ProvisioningNotifier(ref);
});

/// Provisioning notifier
class ProvisioningNotifier extends StateNotifier<ProvisioningState> {
  final Ref _ref;
  Timer? _pollTimer;
  Timer? _deviceCheckTimer;
  final SoftAPService _softAPService = SoftAPService();

  ProvisioningNotifier(this._ref) : super(const ProvisioningState());

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /// Select provisioning method
  void selectMethod(ProvisioningMethod method) {
    state = state.copyWith(
      selectedMethod: method,
      currentStep: ProvisioningStep.enterDeviceDetails,
    );
    // Fetch device types when entering device details
    fetchDeviceTypes();
  }

  /// Fetch available device types from API
  Future<void> fetchDeviceTypes() async {
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.get('/device-types');
      
      if (response.data['success'] == true) {
        final types = (response.data['data'] as List)
            .map((e) => e as Map<String, dynamic>)
            .toList();
        state = state.copyWith(deviceTypes: types);
      }
    } catch (e) {
      // Silently fail - device types are optional
      print('Failed to fetch device types: $e');
    }
  }

  /// Go back to previous step
  void goBack() {
    switch (state.currentStep) {
      case ProvisioningStep.enterDeviceDetails:
        state = state.copyWith(
          currentStep: ProvisioningStep.selectMethod,
          selectedMethod: null,
        );
        break;
      case ProvisioningStep.connectToDevice:
        state = state.copyWith(currentStep: ProvisioningStep.enterDeviceDetails);
        _deviceCheckTimer?.cancel();
        break;
      case ProvisioningStep.enterWifiCredentials:
        state = state.copyWith(currentStep: ProvisioningStep.connectToDevice);
        break;
      default:
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAIM TOKEN GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /// Generate a claim token for new device
  Future<bool> generateClaimToken({
    required String name,
    String? deviceTypeId,
    Map<String, dynamic>? metadata,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.post('/devices/claim-token', data: {
        'name': name,
        if (deviceTypeId != null) 'deviceTypeId': deviceTypeId,
        if (metadata != null) 'metadata': metadata,
      });

      if (response.data['success'] == true) {
        final data = response.data['data'];
        
        state = state.copyWith(
          isLoading: false,
          claimToken: data['claimToken'],
          deviceId: data['deviceId'],
          qrCodeData: data['qrCodeData'],
          expiresAt: DateTime.parse(data['expiresAt']),
          claimStatus: 'pending',
        );

        // Move to next step based on method
        if (state.selectedMethod == ProvisioningMethod.softAP) {
          state = state.copyWith(currentStep: ProvisioningStep.connectToDevice);
          // Start checking for device connection
          _startDeviceConnectionCheck();
        } else {
          // Start polling for claim status (for QR code method)
          _startPolling();
          state = state.copyWith(currentStep: ProvisioningStep.waitingForDevice);
        }

        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to generate claim token',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to generate claim token: $e',
      );
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFTAP PROVISIONING
  // ═══════════════════════════════════════════════════════════════════════════

  /// Check WiFi connection status
  Future<void> checkWifiStatus() async {
    final wifiService = _ref.read(wifiServiceProvider);
    final status = await wifiService.getConnectionStatus();
    state = state.copyWith(wifiStatus: status);
  }

  /// Start checking for device connection
  void _startDeviceConnectionCheck() {
    _deviceCheckTimer?.cancel();
    
    _deviceCheckTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      await _checkDeviceConnection();
    });
  }

  /// Check if connected to device hotspot and device is reachable
  Future<void> _checkDeviceConnection() async {
    // First check WiFi status
    await checkWifiStatus();

    if (state.wifiStatus?.isDeviceHotspot == true) {
      // Try to reach the device
      final deviceInfo = await _softAPService.checkDeviceConnection();

      if (deviceInfo != null) {
        _deviceCheckTimer?.cancel();
        state = state.copyWith(
          deviceInfo: deviceInfo,
          currentStep: ProvisioningStep.enterWifiCredentials,
        );

        // Scan for available networks
        await scanNetworks();
      }
    }
  }

  /// Manually confirm device connection (for when auto-detect doesn't work)
  Future<bool> confirmDeviceConnection() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final deviceInfo = await _softAPService.checkDeviceConnection();

      if (deviceInfo != null) {
        _deviceCheckTimer?.cancel();
        state = state.copyWith(
          isLoading: false,
          deviceInfo: deviceInfo,
          currentStep: ProvisioningStep.enterWifiCredentials,
        );

        // Scan for available networks
        await scanNetworks();
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Cannot reach device. Make sure you are connected to device WiFi.',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to connect to device: $e',
      );
      return false;
    }
  }

  /// Scan for available WiFi networks from device
  Future<void> scanNetworks() async {
    try {
      final networks = await _softAPService.scanNetworks();
      state = state.copyWith(availableNetworks: networks);
    } catch (e) {
      // Ignore scan errors
    }
  }

  /// Select a WiFi network
  void selectNetwork(String ssid) {
    state = state.copyWith(selectedSsid: ssid);
  }

  /// Provision device via SoftAP
  Future<bool> provisionViaSoftAP({
    required String ssid,
    required String password,
  }) async {
    if (state.claimToken == null) {
      state = state.copyWith(error: 'No claim token generated');
      return false;
    }

    state = state.copyWith(
      isLoading: true,
      error: null,
      currentStep: ProvisioningStep.provisioning,
    );

    try {
      final result = await _softAPService.provisionDevice(
        ssid: ssid,
        password: password,
        claimToken: state.claimToken!,
        serverUrl: AppConfig.current.apiBaseUrl,
      );

      if (result.success) {
        state = state.copyWith(
          isLoading: false,
          currentStep: ProvisioningStep.waitingForDevice,
        );

        // Start polling for device to come online
        _startPolling();
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: result.message,
          currentStep: ProvisioningStep.enterWifiCredentials,
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Provisioning failed: $e',
        currentStep: ProvisioningStep.enterWifiCredentials,
      );
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAIM STATUS POLLING
  // ═══════════════════════════════════════════════════════════════════════════

  /// Start polling for claim status
  void _startPolling() {
    _pollTimer?.cancel();
    
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      await _checkClaimStatus();
      
      // Stop polling if claimed or expired
      if (state.claimStatus == 'claimed' || 
          state.claimStatus == 'online' ||
          state.claimStatus == 'expired') {
        timer.cancel();

        if (state.claimStatus == 'online') {
          state = state.copyWith(
            deviceOnline: true,
            currentStep: ProvisioningStep.success,
          );
        } else if (state.claimStatus == 'expired') {
          state = state.copyWith(
            error: 'Claim token expired. Please try again.',
            currentStep: ProvisioningStep.error,
          );
        }
      }
    });
  }

  /// Check claim status
  Future<void> _checkClaimStatus() async {
    if (state.claimToken == null) return;

    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.get('/devices/claim-status/${state.claimToken}');

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final status = data['status'] as String;

        state = state.copyWith(
          claimStatus: status,
          deviceOnline: status == 'online',
        );
      }
    } catch (e) {
      // Ignore polling errors
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET & CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /// Reset provisioning state
  void reset() {
    _pollTimer?.cancel();
    _deviceCheckTimer?.cancel();
    state = const ProvisioningState();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _deviceCheckTimer?.cancel();
    super.dispose();
  }
}
