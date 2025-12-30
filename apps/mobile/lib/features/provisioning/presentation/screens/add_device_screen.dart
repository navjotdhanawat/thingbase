import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../providers/provisioning_provider.dart';

class AddDeviceScreen extends ConsumerStatefulWidget {
  const AddDeviceScreen({super.key});

  @override
  ConsumerState<AddDeviceScreen> createState() => _AddDeviceScreenState();
}

class _AddDeviceScreenState extends ConsumerState<AddDeviceScreen> {
  final _nameController = TextEditingController();
  final _wifiPasswordController = TextEditingController();
  final _ssidController = TextEditingController();
  String? _selectedDeviceTypeId;
  bool _showPassword = false;

  @override
  void dispose() {
    _nameController.dispose();
    _wifiPasswordController.dispose();
    _ssidController.dispose();
    super.dispose();
  }

  /// Map icon string from API to Lucide icon
  IconData _getIconForType(String? iconName) {
    switch (iconName) {
      case 'toggle-left':
      case 'toggle-right':
        return LucideIcons.toggleLeft;
      case 'thermometer':
        return LucideIcons.thermometer;
      case 'gauge':
        return LucideIcons.gauge;
      case 'power':
        return LucideIcons.power;
      case 'wifi':
        return LucideIcons.wifi;
      case 'cpu':
        return LucideIcons.cpu;
      case 'sun':
        return LucideIcons.sun;
      case 'droplet':
        return LucideIcons.droplet;
      case 'activity':
        return LucideIcons.activity;
      case 'zap':
        return LucideIcons.zap;
      default:
        return LucideIcons.cpu;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(provisioningProvider);

    return PopScope(
      canPop: state.currentStep == ProvisioningStep.selectMethod,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          ref.read(provisioningProvider.notifier).goBack();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_getAppBarTitle(state.currentStep)),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () {
              ref.read(provisioningProvider.notifier).reset();
              context.pop();
            },
          ),
        ),
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: _buildStepContent(theme, state),
        ),
      ),
    );
  }

  String _getAppBarTitle(ProvisioningStep step) {
    switch (step) {
      case ProvisioningStep.selectMethod:
        return 'Add Device';
      case ProvisioningStep.enterDeviceDetails:
        return 'Device Details';
      case ProvisioningStep.connectToDevice:
        return 'Connect to Device';
      case ProvisioningStep.enterWifiCredentials:
        return 'WiFi Setup';
      case ProvisioningStep.provisioning:
        return 'Provisioning...';
      case ProvisioningStep.waitingForDevice:
        return 'Connecting...';
      case ProvisioningStep.success:
        return 'Success!';
      case ProvisioningStep.error:
        return 'Error';
    }
  }

  Widget _buildStepContent(ThemeData theme, ProvisioningState state) {
    switch (state.currentStep) {
      case ProvisioningStep.selectMethod:
        return _buildMethodSelection(theme);
      case ProvisioningStep.enterDeviceDetails:
        return _buildDeviceDetails(theme, state);
      case ProvisioningStep.connectToDevice:
        return _buildConnectToDevice(theme, state);
      case ProvisioningStep.enterWifiCredentials:
        return _buildWifiCredentials(theme, state);
      case ProvisioningStep.provisioning:
        return _buildProvisioning(theme, state);
      case ProvisioningStep.waitingForDevice:
        return _buildWaitingForDevice(theme, state);
      case ProvisioningStep.success:
        return _buildSuccess(theme, state);
      case ProvisioningStep.error:
        return _buildError(theme, state);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: METHOD SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildMethodSelection(ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'How would you like to add your device?',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(),

          const SizedBox(height: 8),
          
          Text(
            'Choose the provisioning method supported by your device',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ).animate().fadeIn(delay: 100.ms),

          const SizedBox(height: 32),

          // SoftAP Method - Primary
          _MethodCard(
            title: 'WiFi Setup (SoftAP)',
            description: 'Connect to device\'s WiFi hotspot and configure. Works with most IoT devices.',
            icon: LucideIcons.wifi,
            isPrimary: true,
            onTap: () {
              ref.read(provisioningProvider.notifier).selectMethod(ProvisioningMethod.softAP);
            },
          ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.1),

          const SizedBox(height: 16),

          // BLE Method
          _MethodCard(
            title: 'Bluetooth Setup',
            description: 'Provision via Bluetooth Low Energy. For BLE-enabled devices.',
            icon: LucideIcons.bluetooth,
            onTap: () {
              // TODO: Implement BLE provisioning
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('BLE provisioning coming soon!')),
              );
            },
          ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.1),

          const SizedBox(height: 16),

          // QR Code Method
          _MethodCard(
            title: 'QR Code',
            description: 'For devices with camera or display. Scan or show QR code.',
            icon: LucideIcons.qrCode,
            onTap: () {
              ref.read(provisioningProvider.notifier).selectMethod(ProvisioningMethod.qrCode);
            },
          ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.1),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: DEVICE DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildDeviceDetails(ThemeData theme, ProvisioningState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Name your device',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ).animate().fadeIn(),

          const SizedBox(height: 24),

          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Device Name',
              hintText: 'e.g., Water Pump - Backyard',
              prefixIcon: Icon(LucideIcons.tag),
            ),
            textCapitalization: TextCapitalization.words,
          ).animate().fadeIn(delay: 100.ms),

          const SizedBox(height: 24),

          Text(
            'Device Type',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              // Show device types from API
              ...state.deviceTypes.map((type) => _DeviceTypeChip(
                label: type['name'] as String? ?? 'Unknown',
                icon: _getIconForType(type['icon'] as String?),
                isSelected: _selectedDeviceTypeId == type['id'],
                onTap: () => setState(() => _selectedDeviceTypeId = type['id'] as String?),
              )),
              // Always show "Other" option when no type is needed
              _DeviceTypeChip(
                label: 'Other',
                icon: LucideIcons.cpu,
                isSelected: _selectedDeviceTypeId == null && state.deviceTypes.isNotEmpty,
                onTap: () => setState(() => _selectedDeviceTypeId = null),
              ),
              // Show placeholder chips while loading if no types yet
              if (state.deviceTypes.isEmpty) ...[
                _DeviceTypeChip(
                  label: 'Loading...',
                  icon: LucideIcons.loader,
                  isSelected: false,
                  onTap: () {},
                ),
              ],
            ],
          ).animate().fadeIn(delay: 200.ms),


          const SizedBox(height: 32),

          if (state.error != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.alertCircle, 
                    color: theme.colorScheme.onErrorContainer,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.error!,
                      style: TextStyle(color: theme.colorScheme.onErrorContainer),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: state.isLoading
                  ? null
                  : () async {
                      if (_nameController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter a device name')),
                        );
                        return;
                      }

                      // deviceTypeId is now a real UUID from API or null for "Other"
                      await ref.read(provisioningProvider.notifier).generateClaimToken(
                        name: _nameController.text.trim(),
                        deviceTypeId: _selectedDeviceTypeId,
                      );
                    },
              child: state.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Continue'),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: CONNECT TO DEVICE (SoftAP)
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildConnectToDevice(ThemeData theme, ProvisioningState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              LucideIcons.wifi,
              size: 60,
              color: theme.colorScheme.primary,
            ),
          ).animate().scale(begin: const Offset(0.8, 0.8)),

          const SizedBox(height: 32),

          Text(
            'Connect to Device WiFi',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 100.ms),

          const SizedBox(height: 16),

          Text(
            'Power on your device and connect to its WiFi hotspot from your phone settings.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms),

          const SizedBox(height: 32),

          // Instructions
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InstructionStep(
                  number: 1,
                  text: 'Put device in setup mode (usually hold button 5s)',
                ),
                const SizedBox(height: 12),
                _InstructionStep(
                  number: 2,
                  text: 'Open phone WiFi settings',
                ),
                const SizedBox(height: 12),
                _InstructionStep(
                  number: 3,
                  text: 'Connect to network starting with "IOT-" or "PROV_"',
                ),
                const SizedBox(height: 12),
                _InstructionStep(
                  number: 4,
                  text: 'Return to this app',
                ),
              ],
            ),
          ).animate().fadeIn(delay: 300.ms),

          const SizedBox(height: 24),

          // WiFi Status
          if (state.wifiStatus != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: state.wifiStatus!.isDeviceHotspot
                    ? Colors.green.shade50
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: state.wifiStatus!.isDeviceHotspot
                      ? Colors.green
                      : Colors.transparent,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    state.wifiStatus!.isDeviceHotspot
                        ? LucideIcons.checkCircle
                        : LucideIcons.wifi,
                    color: state.wifiStatus!.isDeviceHotspot
                        ? Colors.green
                        : theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          state.wifiStatus!.isConnected
                              ? 'Connected to: ${state.wifiStatus!.ssid ?? "Unknown"}'
                              : 'Not connected to WiFi',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (state.wifiStatus!.isDeviceHotspot)
                          Text(
                            'Device detected!',
                            style: TextStyle(color: Colors.green.shade700),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 24),

          if (state.error != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                state.error!,
                style: TextStyle(color: theme.colorScheme.onErrorContainer),
                textAlign: TextAlign.center,
              ),
            ),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    ref.read(provisioningProvider.notifier).checkWifiStatus();
                  },
                  child: const Text('Refresh Status'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: state.isLoading
                      ? null
                      : () {
                          ref.read(provisioningProvider.notifier).confirmDeviceConnection();
                        },
                  child: state.isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('I\'m Connected'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: WIFI CREDENTIALS
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildWifiCredentials(ThemeData theme, ProvisioningState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Device info card
          if (state.deviceInfo != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.checkCircle2, color: Colors.green),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Device Connected',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade800,
                          ),
                        ),
                        Text(
                          'Model: ${state.deviceInfo!.model}',
                          style: TextStyle(color: Colors.green.shade700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(),

          const SizedBox(height: 24),

          Text(
            'Enter WiFi Credentials',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your device will connect to this network after setup.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),

          const SizedBox(height: 24),

          // Network dropdown or text field
          if (state.availableNetworks.isNotEmpty) ...[
            Text('Available Networks', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            ...state.availableNetworks.take(5).map((network) => 
              _NetworkTile(
                network: network,
                isSelected: state.selectedSsid == network.ssid,
                onTap: () {
                  ref.read(provisioningProvider.notifier).selectNetwork(network.ssid);
                  _ssidController.text = network.ssid;
                },
              ),
            ),
            const SizedBox(height: 16),
          ],

          TextFormField(
            controller: _ssidController,
            decoration: InputDecoration(
              labelText: 'WiFi Network Name (SSID)',
              hintText: 'Enter your home WiFi name',
              prefixIcon: const Icon(LucideIcons.wifi),
              suffixIcon: state.availableNetworks.isNotEmpty
                  ? IconButton(
                      icon: const Icon(LucideIcons.refreshCw),
                      onPressed: () {
                        ref.read(provisioningProvider.notifier).scanNetworks();
                      },
                    )
                  : null,
            ),
          ),

          const SizedBox(height: 16),

          TextFormField(
            controller: _wifiPasswordController,
            obscureText: !_showPassword,
            decoration: InputDecoration(
              labelText: 'WiFi Password',
              hintText: 'Enter WiFi password',
              prefixIcon: const Icon(LucideIcons.lock),
              suffixIcon: IconButton(
                icon: Icon(_showPassword ? LucideIcons.eyeOff : LucideIcons.eye),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
            ),
          ),

          const SizedBox(height: 32),

          if (state.error != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(LucideIcons.alertCircle, 
                    color: theme.colorScheme.onErrorContainer,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.error!,
                      style: TextStyle(color: theme.colorScheme.onErrorContainer),
                    ),
                  ),
                ],
              ),
            ),

          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: state.isLoading
                  ? null
                  : () async {
                      final ssid = _ssidController.text.trim();
                      final password = _wifiPasswordController.text;

                      if (ssid.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Please enter WiFi network name')),
                        );
                        return;
                      }

                      await ref.read(provisioningProvider.notifier).provisionViaSoftAP(
                        ssid: ssid,
                        password: password,
                      );
                    },
              child: state.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Setup Device'),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: PROVISIONING
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildProvisioning(ThemeData theme, ProvisioningState state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
              width: 80,
              height: 80,
              child: CircularProgressIndicator(strokeWidth: 6),
            ).animate(onPlay: (c) => c.repeat()).rotate(duration: 2.seconds),
            
            const SizedBox(height: 32),
            
            Text(
              'Configuring Device...',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            Text(
              'Sending WiFi credentials to your device.\nThis may take a moment.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: WAITING FOR DEVICE
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildWaitingForDevice(ThemeData theme, ProvisioningState state) {
    // For QR code method, show the QR
    if (state.selectedMethod == ProvisioningMethod.qrCode && state.qrCodeData != null) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: QrImageView(
                data: state.qrCodeData!,
                version: QrVersions.auto,
                size: 200,
              ),
            ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9)),

            const SizedBox(height: 24),

            if (state.expiresAt != null)
              Text(
                'Expires in ${_formatExpiry(state.expiresAt!)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

            const SizedBox(height: 32),

            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Waiting for device to claim...',
              style: theme.textTheme.bodyLarge,
            ),
          ],
        ),
      );
    }

    // For SoftAP method
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(
                    LucideIcons.cloud,
                    size: 50,
                    color: theme.colorScheme.primary,
                  ),
                  Positioned(
                    bottom: 25,
                    child: const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ],
              ),
            ).animate(onPlay: (c) => c.repeat(reverse: true))
              .scale(begin: const Offset(0.95, 0.95), end: const Offset(1.05, 1.05), duration: 1.seconds),

            const SizedBox(height: 32),

            Text(
              'Waiting for Device...',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 16),

            Text(
              'Your device is connecting to WiFi and registering with the cloud.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            // Progress steps
            _ProgressStep(
              label: 'Device configured',
              isComplete: true,
            ),
            _ProgressStep(
              label: 'Connecting to WiFi',
              isComplete: state.claimStatus == 'claimed' || state.claimStatus == 'online',
              isActive: state.claimStatus == 'pending',
            ),
            _ProgressStep(
              label: 'Registering with cloud',
              isComplete: state.claimStatus == 'online',
              isActive: state.claimStatus == 'claimed',
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS & ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildSuccess(ThemeData theme, ProvisioningState state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                LucideIcons.checkCircle,
                size: 60,
                color: Colors.green,
              ),
            ).animate().scale(begin: const Offset(0.5, 0.5)),

            const SizedBox(height: 32),

            Text(
              'Device Added!',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.green.shade700,
              ),
            ).animate().fadeIn(delay: 200.ms),

            const SizedBox(height: 16),

            Text(
              'Your device is now connected and ready to use.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 300.ms),

            const SizedBox(height: 48),

            FilledButton.icon(
              onPressed: () {
                ref.read(provisioningProvider.notifier).reset();
                if (state.deviceId != null) {
                  context.go('/devices/${state.deviceId}');
                } else {
                  context.go('/devices');
                }
              },
              icon: const Icon(LucideIcons.arrowRight),
              label: const Text('View Device'),
            ).animate().fadeIn(delay: 400.ms),

            const SizedBox(height: 16),

            TextButton(
              onPressed: () {
                ref.read(provisioningProvider.notifier).reset();
                context.go('/devices');
              },
              child: const Text('Back to Devices'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(ThemeData theme, ProvisioningState state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                LucideIcons.xCircle,
                size: 60,
                color: theme.colorScheme.error,
              ),
            ).animate().shake(),

            const SizedBox(height: 32),

            Text(
              'Something went wrong',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 16),

            Text(
              state.error ?? 'An unknown error occurred. Please try again.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 48),

            FilledButton.icon(
              onPressed: () {
                ref.read(provisioningProvider.notifier).reset();
              },
              icon: const Icon(LucideIcons.refreshCw),
              label: const Text('Try Again'),
            ),

            const SizedBox(height: 16),

            TextButton(
              onPressed: () {
                ref.read(provisioningProvider.notifier).reset();
                context.pop();
              },
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }

  String _formatExpiry(DateTime expiresAt) {
    final diff = expiresAt.difference(DateTime.now());
    if (diff.inMinutes < 1) return 'less than a minute';
    return '${diff.inMinutes} minutes';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER WIDGETS
// ═════════════════════════════════════════════════════════════════════════════

class _MethodCard extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final bool isPrimary;
  final VoidCallback onTap;

  const _MethodCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.onTap,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: isPrimary
          ? theme.colorScheme.primaryContainer
          : theme.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: isPrimary
                      ? theme.colorScheme.primary
                      : theme.colorScheme.surfaceContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isPrimary
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                LucideIcons.chevronRight,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeviceTypeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _DeviceTypeChip({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      avatar: Icon(icon, size: 18),
      onSelected: (_) => onTap(),
    );
  }
}

class _InstructionStep extends StatelessWidget {
  final int number;
  final String text;

  const _InstructionStep({
    required this.number,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$number',
              style: TextStyle(
                color: theme.colorScheme.onPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}

class _NetworkTile extends StatelessWidget {
  final dynamic network;
  final bool isSelected;
  final VoidCallback onTap;

  const _NetworkTile({
    required this.network,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      onTap: onTap,
      leading: Icon(
        LucideIcons.wifi,
        color: isSelected ? theme.colorScheme.primary : null,
      ),
      title: Text(network.ssid),
      trailing: isSelected
          ? Icon(LucideIcons.checkCircle, color: theme.colorScheme.primary)
          : null,
      selected: isSelected,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}

class _ProgressStep extends StatelessWidget {
  final String label;
  final bool isComplete;
  final bool isActive;

  const _ProgressStep({
    required this.label,
    this.isComplete = false,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          if (isComplete)
            Icon(LucideIcons.checkCircle, color: Colors.green, size: 20)
          else if (isActive)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(LucideIcons.circle, color: theme.colorScheme.outline, size: 20),
          const SizedBox(width: 12),
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: isComplete
                  ? Colors.green
                  : isActive
                      ? theme.colorScheme.onSurface
                      : theme.colorScheme.outline,
              fontWeight: isActive ? FontWeight.w500 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
