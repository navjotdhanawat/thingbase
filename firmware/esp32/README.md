# ThingBase ESP32 Sample Firmware

This firmware enables ESP32 devices to connect to the ThingBase IoT platform via the mobile app provisioning flow.

## Features
- **SoftAP Provisioning**: Device creates WiFi hotspot for mobile app setup
- **Claim Token Flow**: Securely obtains MQTT credentials from backend
- **Persistent Storage**: WiFi and MQTT credentials stored in NVS
- **Real-time Telemetry**: Temperature, humidity, uptime, RSSI
- **Command Handling**: Toggle LED and custom commands
- **Factory Reset**: Hold BOOT button for 5 seconds

## Prerequisites
- [PlatformIO](https://platformio.org/) (CLI or VS Code extension)
- ESP32 Development Board

## Quick Start

### 1. Flash the Firmware
```bash
cd firmware/esp32
pio run --target upload
pio device monitor
```

### 2. Provision via Mobile App
1. Open ThingBase mobile app
2. Navigate to **Add Device** → Select **SoftAP**
3. Enter a name for your device
4. Connect your phone to WiFi: `ThingBase-XXXX` (password: `thingbase`)
5. Select your home WiFi and enter password
6. Wait for device to come online

### 3. Test Commands
- From dashboard, send **toggle-led** command to control the built-in LED

## Factory Reset
Hold the **BOOT** button (GPIO 0) for 5 seconds. LED will blink rapidly, then device restarts in provisioning mode.

## HTTP Endpoints (During Provisioning)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/info` | GET | Device information |
| `/ping` | GET | Health check |
| `/scan` | GET | Available WiFi networks |
| `/status` | GET | Provisioning status |
| `/provision` | POST | Receive WiFi + claim token |

## MQTT Topics
After provisioning, the device uses topics assigned by the platform:
- `iot/{tenantId}/devices/{deviceId}/telemetry`
- `iot/{tenantId}/devices/{deviceId}/command`
- `iot/{tenantId}/devices/{deviceId}/ack`
- `iot/{tenantId}/devices/{deviceId}/status`
