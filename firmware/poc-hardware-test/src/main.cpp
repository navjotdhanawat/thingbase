/**
 * ============================================================================
 * ESP32 HARDWARE TEST - Warehouse Monitoring Device POC
 * ============================================================================
 *
 * This is a standalone test file to verify all hardware components:
 * - DHT22 Temperature/Humidity Sensor (GPIO 4)
 * - Red Alert LED (GPIO 5)
 * - Buzzer (GPIO 18)
 * - Built-in Status LED (GPIO 2)
 * - Factory Reset Button (GPIO 0)
 *
 * NO CLOUD CONNECTIVITY - This is for hardware testing only!
 *
 * Wiring Diagram:
 *                           ESP32
 *                       ┌──────────────┐
 *     DHT22 DATA ──────►│ GPIO 4       │
 *     Red LED (+) ─────►│ GPIO 5       │──── 220Ω resistor
 *     Buzzer (+) ──────►│ GPIO 18      │
 *     BOOT Button ─────►│ GPIO 0       │ (built-in)
 *     Status LED ──────►│ GPIO 2       │ (built-in)
 *                       │ 3.3V ────────┼──── DHT22 VCC
 *                       │ GND  ────────┼──── All grounds
 *                       └──────────────┘
 *
 * ============================================================================
 */

#include <Arduino.h>
#include <DHT.h>

// ============================================================================
// PIN DEFINITIONS - Modify these to match your wiring
// ============================================================================
#define DHT_PIN 4          // DHT22 data pin
#define RED_LED_PIN 5      // Red alert LED
#define BUZZER_PIN 18      // Buzzer
#define STATUS_LED_PIN 2   // Built-in LED (blue on most boards)
#define RESET_BUTTON_PIN 0 // BOOT button for factory reset

// DHT Sensor Configuration
#define DHT_TYPE DHT22 // Change to DHT11 if using that sensor

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================
#define HEARTBEAT_INTERVAL_MS 5000    // Heartbeat blink every 5 seconds
#define SENSOR_READ_INTERVAL_MS 2000  // Read sensor every 2 seconds
#define DEBUG_PRINT_INTERVAL_MS 10000 // Print status every 10 seconds

// ============================================================================
// THRESHOLD CONFIGURATION - Modify for your warehouse requirements
// ============================================================================
const float TEMP_HIGH_THRESHOLD = 30.0;     // Alert if temp > 30°C
const float TEMP_LOW_THRESHOLD = 10.0;      // Alert if temp < 10°C
const float HUMIDITY_HIGH_THRESHOLD = 70.0; // Alert if humidity > 70%
const float HUMIDITY_LOW_THRESHOLD = 30.0;  // Alert if humidity < 30%

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================
DHT dht(DHT_PIN, DHT_TYPE);

// State variables
unsigned long lastHeartbeat = 0;
unsigned long lastSensorRead = 0;
unsigned long lastDebugPrint = 0;
bool alertMode = false;
bool lastButtonState = HIGH;
unsigned long buttonPressStart = 0;

// Last sensor readings
float lastTemperature = 0;
float lastHumidity = 0;
bool sensorConnected = false;

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================
void testLED(int pin, const char *name);
void testBuzzer();
void testDHTSensor();
void testButton();
void heartbeatBlink();
void alertBlink();
void alertBeep();
void runFullTest();
void printSeparator();
void printHeader(const char *title);
void checkSensorAndAlert();
void handleButtonPress();

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(2000); // Wait for serial monitor

  Serial.println();
  printSeparator();
  Serial.println("  ESP32 HARDWARE TEST - Warehouse Monitor POC");
  Serial.println("  Version: 1.0.0 | No Cloud Mode");
  printSeparator();
  Serial.println();

  // Initialize all pins
  Serial.println("[INIT] Configuring GPIO pins...");

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  Serial.printf("  ✓ GPIO %d configured as OUTPUT (Status LED)\n",
                STATUS_LED_PIN);

  pinMode(RED_LED_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);
  Serial.printf("  ✓ GPIO %d configured as OUTPUT (Red Alert LED)\n",
                RED_LED_PIN);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.printf("  ✓ GPIO %d configured as OUTPUT (Buzzer)\n", BUZZER_PIN);

  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  Serial.printf("  ✓ GPIO %d configured as INPUT_PULLUP (Reset Button)\n",
                RESET_BUTTON_PIN);

  // Initialize DHT sensor
  Serial.printf("  ✓ GPIO %d configured for DHT22 sensor\n", DHT_PIN);
  dht.begin();

  Serial.println();
  Serial.println("[INIT] All pins configured successfully!");
  Serial.println();

  // Run initial full test
  runFullTest();

  Serial.println();
  printSeparator();
  Serial.println("  ENTERING CONTINUOUS MONITORING MODE");
  printSeparator();
  Serial.println();
  Serial.println("  Features:");
  Serial.printf("  - Heartbeat: Every %d seconds (Status LED blink)\n",
                HEARTBEAT_INTERVAL_MS / 1000);
  Serial.printf("  - Sensor read: Every %d seconds\n",
                SENSOR_READ_INTERVAL_MS / 1000);
  Serial.println("  - Alert: Red LED flash + Buzzer if thresholds exceeded");
  Serial.println("  - Short press BOOT button: Quick LED + Buzzer test");
  Serial.println("  - Long press BOOT button (3s): Full hardware test");
  Serial.println();
  printSeparator();
  Serial.println();
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  unsigned long currentMillis = millis();

  // ---- HEARTBEAT (every 5 seconds) ----
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = currentMillis;
    if (!alertMode) {
      heartbeatBlink();
    }
  }

  // ---- SENSOR READING & ALERT CHECK ----
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = currentMillis;
    checkSensorAndAlert();
  }

  // ---- BUTTON CHECK ----
  handleButtonPress();

  // ---- DEBUG STATUS (every 10 seconds) ----
  if (currentMillis - lastDebugPrint >= DEBUG_PRINT_INTERVAL_MS) {
    lastDebugPrint = currentMillis;
    Serial.println();
    Serial.printf(
        "[STATUS] Uptime: %lu sec | Alert: %s | Sensor: %s | Heap: %d bytes\n",
        currentMillis / 1000, alertMode ? "⚠️ ACTIVE" : "✓ OFF",
        sensorConnected ? "✓ OK" : "❌ FAIL", ESP.getFreeHeap());
    if (sensorConnected) {
      Serial.printf("[STATUS] Last reading: %.1f°C / %.1f%% humidity\n",
                    lastTemperature, lastHumidity);
    }
    Serial.println();
  }
}

// ============================================================================
// SENSOR & ALERT HANDLING
// ============================================================================

void checkSensorAndAlert() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Check if reading failed
  if (isnan(humidity) || isnan(temperature)) {
    if (sensorConnected) {
      // Only print error if it was previously connected
      Serial.println("[SENSOR] ❌ Lost connection to DHT sensor!");
    }
    sensorConnected = false;

    // Blink red LED slowly to indicate sensor error
    digitalWrite(RED_LED_PIN, !digitalRead(RED_LED_PIN));
    return;
  }

  // Sensor is working
  if (!sensorConnected) {
    Serial.println("[SENSOR] ✓ DHT sensor connected!");
  }
  sensorConnected = true;
  lastTemperature = temperature;
  lastHumidity = humidity;

  Serial.printf("[SENSOR] Temp: %.1f°C | Humidity: %.1f%%\n", temperature,
                humidity);

  // Check thresholds
  bool tempAlert =
      (temperature > TEMP_HIGH_THRESHOLD || temperature < TEMP_LOW_THRESHOLD);
  bool humidityAlert =
      (humidity > HUMIDITY_HIGH_THRESHOLD || humidity < HUMIDITY_LOW_THRESHOLD);

  if (tempAlert || humidityAlert) {
    alertMode = true;
    Serial.println("[ALERT] ⚠️  THRESHOLD EXCEEDED!");

    if (tempAlert) {
      if (temperature > TEMP_HIGH_THRESHOLD) {
        Serial.printf("         🔥 Temperature HIGH: %.1f°C (max: %.1f°C)\n",
                      temperature, TEMP_HIGH_THRESHOLD);
      } else {
        Serial.printf("         ❄️ Temperature LOW: %.1f°C (min: %.1f°C)\n",
                      temperature, TEMP_LOW_THRESHOLD);
      }
    }

    if (humidityAlert) {
      if (humidity > HUMIDITY_HIGH_THRESHOLD) {
        Serial.printf("         💧 Humidity HIGH: %.1f%% (max: %.1f%%)\n",
                      humidity, HUMIDITY_HIGH_THRESHOLD);
      } else {
        Serial.printf("         🏜️ Humidity LOW: %.1f%% (min: %.1f%%)\n",
                      humidity, HUMIDITY_LOW_THRESHOLD);
      }
    }

    // Trigger alert
    alertBlink();
    alertBeep();
  } else {
    if (alertMode) {
      Serial.println("[ALERT] ✓ Conditions normalized. Clearing alert.");
      digitalWrite(RED_LED_PIN, LOW); // Ensure LED is off
    }
    alertMode = false;
  }
}

// ============================================================================
// BUTTON HANDLING
// ============================================================================

void handleButtonPress() {
  bool buttonState = digitalRead(RESET_BUTTON_PIN);
  unsigned long currentMillis = millis();

  if (buttonState == LOW && lastButtonState == HIGH) {
    // Button just pressed
    buttonPressStart = currentMillis;
    Serial.println("[BUTTON] Pressed - hold 3s for full test");
  }

  if (buttonState == LOW && lastButtonState == LOW) {
    // Button being held
    unsigned long holdDuration = currentMillis - buttonPressStart;
    if (holdDuration >= 3000 && holdDuration < 3100) {
      // Just crossed 3 second threshold
      Serial.println("[BUTTON] Long press detected - Running full test...");
      runFullTest();
    }
  }

  if (buttonState == HIGH && lastButtonState == LOW) {
    // Button released
    unsigned long pressDuration = currentMillis - buttonPressStart;
    if (pressDuration < 3000 && pressDuration > 50) {
      // Short press - quick test
      Serial.printf("[BUTTON] Short press (%lu ms) - Quick test\n",
                    pressDuration);

      // Quick LED + buzzer test
      digitalWrite(RED_LED_PIN, HIGH);
      digitalWrite(STATUS_LED_PIN, HIGH);
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(RED_LED_PIN, LOW);
      digitalWrite(STATUS_LED_PIN, LOW);
      digitalWrite(BUZZER_PIN, LOW);

      Serial.println("[BUTTON] ✓ Quick test complete");
    }
  }

  lastButtonState = buttonState;
}

// ============================================================================
// FULL HARDWARE TEST
// ============================================================================

void runFullTest() {
  printHeader("RUNNING FULL HARDWARE TEST");

  // Test 1: Status LED
  Serial.println("\n[TEST 1/5] Status LED (GPIO 2 - Built-in Blue)");
  testLED(STATUS_LED_PIN, "Status LED");

  // Test 2: Red Alert LED
  Serial.println("\n[TEST 2/5] Red Alert LED (GPIO 5)");
  testLED(RED_LED_PIN, "Red Alert LED");

  // Test 3: Buzzer
  Serial.println("\n[TEST 3/5] Buzzer (GPIO 18)");
  testBuzzer();

  // Test 4: DHT22 Sensor
  Serial.println("\n[TEST 4/5] DHT22 Sensor (GPIO 4)");
  testDHTSensor();

  // Test 5: Button
  Serial.println("\n[TEST 5/5] Reset Button (GPIO 0)");
  testButton();

  printHeader("HARDWARE TEST COMPLETE");
}

void testLED(int pin, const char *name) {
  Serial.printf("  Testing %s on GPIO %d...\n", name, pin);

  for (int i = 0; i < 3; i++) {
    digitalWrite(pin, HIGH);
    Serial.printf("    [%d/3] ON  ", i + 1);
    delay(300);
    digitalWrite(pin, LOW);
    Serial.printf("→ OFF\n");
    delay(300);
  }

  Serial.printf("  ✓ %s test complete - Did you see 3 blinks?\n", name);
}

void testBuzzer() {
  Serial.println("  Testing Buzzer on GPIO 18...");
  Serial.println("  Playing 3 beeps...");

  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.printf("    [%d/3] BEEP ", i + 1);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.printf("→ silence\n");
    delay(200);
  }

  Serial.println("  ✓ Buzzer test complete - Did you hear 3 beeps?");
}

void testDHTSensor() {
  Serial.println("  Reading from DHT22 sensor on GPIO 4...");
  Serial.println("  (Waiting 2 seconds for sensor to stabilize)");

  delay(2000);

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("  ❌ FAILED to read from DHT sensor!");
    Serial.println();
    Serial.println("  Troubleshooting steps:");
    Serial.println("  ┌─────────────────────────────────────────────────┐");
    Serial.println("  │ 1. Check wiring:                                │");
    Serial.println("  │    - DATA pin → GPIO 4                          │");
    Serial.println("  │    - VCC      → 3.3V                            │");
    Serial.println("  │    - GND      → GND                             │");
    Serial.println("  │                                                 │");
    Serial.println("  │ 2. Add 4.7kΩ pull-up resistor:                  │");
    Serial.println("  │    - Between DATA and VCC (3.3V)                │");
    Serial.println("  │                                                 │");
    Serial.println("  │ 3. If using DHT11:                              │");
    Serial.println("  │    - Change DHT_TYPE from DHT22 to DHT11        │");
    Serial.println("  │                                                 │");
    Serial.println("  │ 4. Try a different sensor (may be defective)    │");
    Serial.println("  └─────────────────────────────────────────────────┘");
  } else {
    float heatIndex = dht.computeHeatIndex(temperature, humidity, false);

    Serial.println("  ✓ DHT22 sensor working correctly!");
    Serial.println();
    Serial.println("  ┌─────────────────────────────────────┐");
    Serial.printf("  │ Temperature: %6.1f °C (%5.1f °F)   │\n", temperature,
                  temperature * 9 / 5 + 32);
    Serial.printf("  │ Humidity:    %6.1f %%               │\n", humidity);
    Serial.printf("  │ Heat Index:  %6.1f °C              │\n", heatIndex);
    Serial.println("  └─────────────────────────────────────┘");
    Serial.println();
    Serial.println("  Current thresholds:");
    Serial.printf("    Temperature: %.0f°C - %.0f°C\n", TEMP_LOW_THRESHOLD,
                  TEMP_HIGH_THRESHOLD);
    Serial.printf("    Humidity:    %.0f%% - %.0f%%\n", HUMIDITY_LOW_THRESHOLD,
                  HUMIDITY_HIGH_THRESHOLD);

    sensorConnected = true;
    lastTemperature = temperature;
    lastHumidity = humidity;
  }
}

void testButton() {
  bool currentState = digitalRead(RESET_BUTTON_PIN);
  Serial.println("  Testing Reset Button on GPIO 0...");
  Serial.printf("  Current state: %s\n",
                currentState == LOW ? "PRESSED" : "RELEASED");
  Serial.println();
  Serial.println("  ┌─────────────────────────────────────────────┐");
  Serial.println("  │ Button functions:                           │");
  Serial.println("  │  • Short press (<3s): Quick LED/Buzzer test │");
  Serial.println("  │  • Long press  (≥3s): Full hardware test    │");
  Serial.println("  └─────────────────────────────────────────────┘");
  Serial.println("  ✓ Button test complete");
}

// ============================================================================
// LED & BUZZER PATTERNS
// ============================================================================

void heartbeatBlink() {
  // Single short blink to show device is alive
  digitalWrite(STATUS_LED_PIN, HIGH);
  delay(100);
  digitalWrite(STATUS_LED_PIN, LOW);
  Serial.println("[HEARTBEAT] ♥");
}

void alertBlink() {
  // Rapid red LED flashing for alert
  for (int i = 0; i < 5; i++) {
    digitalWrite(RED_LED_PIN, HIGH);
    delay(100);
    digitalWrite(RED_LED_PIN, LOW);
    delay(100);
  }
}

void alertBeep() {
  // Beep pattern for alert
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

void printSeparator() {
  Serial.println(
      "============================================================");
}

void printHeader(const char *title) {
  Serial.println();
  printSeparator();
  Serial.print("  ");
  Serial.println(title);
  printSeparator();
}
