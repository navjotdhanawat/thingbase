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
#define LED_PIN 2 // Built-in LED on most ESP32 dev kits (status/heartbeat)
#define RESET_BUTTON_PIN 0 // BOOT button for factory reset
#define DHT_PIN 4          // DHT22 temperature/humidity sensor data pin
#define ALERT_LED_PIN 5    // Red alert LED for warnings
#define BUZZER_PIN 18      // Buzzer for audio alerts

// ============================================================================
// SENSOR CONFIGURATION
// ============================================================================
#define DHT_TYPE DHT22 // DHT sensor type (DHT22 or DHT11)

// ============================================================================
// WAREHOUSE MONITORING THRESHOLDS
// ============================================================================
#define TEMP_HIGH_THRESHOLD 30.0     // Alert if temperature > 30°C
#define TEMP_LOW_THRESHOLD 10.0      // Alert if temperature < 10°C
#define HUMIDITY_HIGH_THRESHOLD 70.0 // Alert if humidity > 70%
#define HUMIDITY_LOW_THRESHOLD 30.0  // Alert if humidity < 30%

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
#define HEARTBEAT_INTERVAL_MS 5000   // Heartbeat LED blink every 5 seconds
#define SENSOR_READ_INTERVAL_MS 2000 // Read DHT sensor every 2 seconds

#endif
