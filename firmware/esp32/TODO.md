# Firmware TODO - Production Hardening

## 🔴 Critical Priority

- [ ] **Remove password logging** (Line 102 in main.cpp)
  - Security vulnerability: WiFi password logged in plaintext
- [ ] **Add hardware watchdog timer**
  - Device can hang indefinitely without recovery
  - Use `esp_task_wdt_init()` and `esp_task_wdt_reset()`

- [ ] **Fix blocking delay() calls**
  - Locations: WiFi connection, LED blinking, buzzer
  - Replace with non-blocking `millis()` state machines
- [ ] **Enable TLS certificate verification**
  - Currently using `setInsecure()` - vulnerable to MITM attacks
  - Add root CA certificate for MQTT broker

## 🟠 High Priority

- [ ] **Add OTA (Over-The-Air) update support**
  - Required for production maintenance
  - Use ArduinoOTA or custom HTTP OTA

- [ ] **Fix hardcoded timestamps**
  - Add NTP time synchronization
  - Timestamps currently hardcoded to "2024-01-01T00:00:00Z"

- [ ] **Implement reconnection backoff strategy**
  - Exponential backoff for WiFi/MQTT reconnection
  - Prevents network flooding and broker rate-limiting

- [ ] **Add alert hysteresis**
  - Prevent alert "flapping" at threshold boundaries
  - Add ~1°C buffer zone

- [ ] **Add memory monitoring**
  - Log free heap periodically
  - Detect memory leaks

## 🟡 Medium Priority

- [ ] **Add log levels** (DEBUG/INFO/WARN/ERROR)
- [ ] **Fix String concatenation in MQTT callback**
  - Use `String.reserve()` to prevent heap fragmentation
- [ ] **Add sensor data validation**
  - Sanity check temperature (-40 to 80°C range)
- [ ] **Move magic numbers to config.h**
  - MQTT buffer size, JSON buffer sizes
- [ ] **Add graceful degradation**
  - Send sensor failure events to cloud
- [ ] **Add GPIO pin conflict validation**
  - Compile-time checks for pin conflicts

## 🟢 Low Priority / Enhancements

- [ ] Consider FreeRTOS tasks for better separation
- [ ] Add unique device ID (chip ID) to telemetry
- [ ] Store thresholds in NVS for runtime configuration
- [ ] Add boot reason logging
- [ ] Add deep sleep support for battery operation
