#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// FIRMWARE INFO
// ============================================================================
#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_MODEL "ESP32-DevKit"

// ============================================================================
// HARDWARE PINS
// ============================================================================
#define LED_PIN 2          // Built-in LED on most ESP32 dev kits
#define RESET_BUTTON_PIN 0 // BOOT button for factory reset

// ============================================================================
// PROVISIONING SETTINGS
// ============================================================================
#define AP_PASSWORD "thingbase" // Password for SoftAP (min 8 chars)
#define SOFTAP_IP IPAddress(192, 168, 4, 1)
#define SOFTAP_GATEWAY IPAddress(192, 168, 4, 1)
#define SOFTAP_SUBNET IPAddress(255, 255, 255, 0)

// ============================================================================
// TIMING CONSTANTS
// ============================================================================
#define RESET_HOLD_TIME_MS 5000     // Hold button for 5 seconds to reset
#define TELEMETRY_INTERVAL_MS 10000 // Send telemetry every 10 seconds
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define MQTT_RECONNECT_DELAY_MS 5000

#endif
