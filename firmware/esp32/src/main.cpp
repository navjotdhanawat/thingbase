#include "claim.h"
#include "config.h"
#include "provisioning.h"
#include "storage.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

// ============================================================================
// GLOBALS
// ============================================================================

WiFiClient espClient;
WiFiClientSecure espSecureClient;
PubSubClient mqttClient(espClient);
bool useTLS = false;

MqttCredentials mqttCreds;
unsigned long lastTelemetryTime = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long buttonPressStart = 0;
bool buttonWasPressed = false;

// ============================================================================
// FORWARD DECLARATIONS
// ============================================================================

void onProvisioningComplete(bool success);
void connectToWiFi();
void connectToMQTT();
void mqttCallback(char *topic, byte *payload, unsigned int length);
void sendTelemetry();
void sendStatus(bool online);
void handleCommand(const JsonObject &command);
void checkFactoryReset();

// ============================================================================
// SETUP & LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("     ThingBase ESP32 Firmware");
  Serial.printf("     Version: %s\n", FIRMWARE_VERSION);
  Serial.println("========================================");

  pinMode(LED_PIN, OUTPUT);
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);

  // Initialize storage
  storageInit();

  // Check if we have a pending claim (after reboot from provisioning)
  Preferences prefs;
  prefs.begin("thingbase", false);
  String claimToken = prefs.getString("claim_token", "");
  String claimUrl = prefs.getString("claim_url", "");
  prefs.end();

  if (claimToken.length() > 0) {
    Serial.println("[Main] Found pending claim token, connecting to WiFi...");
    WifiCredentials wifiCreds = storageLoadWifi();

    Serial.printf("[Main] DEBUG - Loaded SSID: '%s'\n", wifiCreds.ssid);
    Serial.printf("[Main] DEBUG - Loaded Password: '%s'\n", wifiCreds.password);
    Serial.printf("[Main] DEBUG - IsValid: %d\n", wifiCreds.isValid);

    if (wifiCreds.isValid) {
      WiFi.mode(WIFI_STA);
      WiFi.begin(wifiCreds.ssid, wifiCreds.password);

      unsigned long startTime = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - startTime < 30000) {
        delay(500);
        Serial.print(".");
      }
      Serial.println();

      if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[Main] Connected! IP: %s\n",
                      WiFi.localIP().toString().c_str());
        Serial.println("[Main] Calling claim API...");

        ClaimResult result = claimDevice(claimUrl.c_str(), claimToken.c_str());

        if (result.success) {
          Serial.println("[Main] CLAIM SUCCESS!");
          storageSaveMqtt(result.mqtt.broker, result.mqtt.clientId,
                          result.mqtt.username, result.mqtt.password,
                          result.mqtt.topicTelemetry, result.mqtt.topicCommands,
                          result.mqtt.topicAck, result.mqtt.topicStatus,
                          result.mqtt.tenantId, result.mqtt.deviceId);

          // Clear pending claim
          prefs.begin("thingbase", false);
          prefs.remove("claim_token");
          prefs.remove("claim_url");
          prefs.end();

          mqttCreds = result.mqtt;
          Serial.println("[Main] Device provisioned successfully!");
          return; // Will continue in loop() with MQTT
        } else {
          Serial.printf("[Main] Claim failed: %s\n", result.error.c_str());
          storageClear();
          // Clear pending claim
          prefs.begin("thingbase", false);
          prefs.remove("claim_token");
          prefs.remove("claim_url");
          prefs.end();
        }
      } else {
        Serial.println("[Main] WiFi connection failed!");
        storageClear();
      }
    }

    // If we get here, something failed - start provisioning
    provisioningStart(onProvisioningComplete);
    return;
  }

  // Check if already provisioned
  if (storageIsProvisioned()) {
    Serial.println("[Main] Device is provisioned, connecting...");
    mqttCreds = storageLoadMqtt();
    WifiCredentials wifiCreds = storageLoadWifi();

    if (wifiCreds.isValid && mqttCreds.isValid) {
      connectToWiFi();
    } else {
      Serial.println("[Main] Invalid credentials, starting provisioning...");
      provisioningStart(onProvisioningComplete);
    }
  } else {
    Serial.println(
        "[Main] Device not provisioned, starting provisioning mode...");
    provisioningStart(onProvisioningComplete);
  }
}

void loop() {
  // Check for factory reset button
  checkFactoryReset();

  // If in provisioning mode, nothing else to do
  if (provisioningIsActive()) {
    return;
  }

  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Main] WiFi disconnected, reconnecting...");
    connectToWiFi();
    return;
  }

  // Handle MQTT
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > MQTT_RECONNECT_DELAY_MS) {
      lastReconnectAttempt = now;
      connectToMQTT();
    }
  } else {
    mqttClient.loop();
  }

  // Send telemetry periodically
  unsigned long now = millis();
  if (now - lastTelemetryTime > TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    if (mqttClient.connected()) {
      sendTelemetry();
    }
  }
}

// ============================================================================
// PROVISIONING CALLBACK
// ============================================================================

void onProvisioningComplete(bool success) {
  if (success) {
    Serial.println("[Main] Provisioning successful! Loading credentials...");
    mqttCreds = storageLoadMqtt();
    connectToMQTT();
  } else {
    Serial.println("[Main] Provisioning failed. Restarting provisioning...");
    delay(2000);
    provisioningStart(onProvisioningComplete);
  }
}

// ============================================================================
// WIFI
// ============================================================================

void connectToWiFi() {
  WifiCredentials creds = storageLoadWifi();
  if (!creds.isValid) {
    Serial.println("[WiFi] No valid credentials");
    return;
  }

  Serial.printf("[WiFi] Connecting to %s...\n", creds.ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(creds.ssid, creds.password);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] Connection failed!");
  }
}

// ============================================================================
// MQTT
// ============================================================================

void connectToMQTT() {
  if (!mqttCreds.isValid) {
    Serial.println("[MQTT] No valid credentials");
    return;
  }

  // Parse broker URL (mqtt://host:port or mqtts://host:port)
  String brokerUrl = String(mqttCreds.broker);
  String host;
  int port = 1883;
  useTLS = false;

  // Remove protocol prefix and detect TLS
  if (brokerUrl.startsWith("mqtt://")) {
    brokerUrl = brokerUrl.substring(7);
    useTLS = false;
  } else if (brokerUrl.startsWith("mqtts://")) {
    brokerUrl = brokerUrl.substring(8);
    port = 8883;
    useTLS = true;
  }

  // Parse host and port
  int colonPos = brokerUrl.indexOf(':');
  if (colonPos > 0) {
    host = brokerUrl.substring(0, colonPos);
    port = brokerUrl.substring(colonPos + 1).toInt();
  } else {
    host = brokerUrl;
  }

  Serial.printf("[MQTT] Connecting to %s:%d (TLS: %s)...\n", host.c_str(), port,
                useTLS ? "yes" : "no");

  // Configure client based on TLS requirement
  if (useTLS) {
    // Use secure client for mqtts:// connections (HiveMQ Cloud, etc.)
    espSecureClient
        .setInsecure(); // Skip certificate verification (for simplicity)
    mqttClient.setClient(espSecureClient);
  } else {
    // Use regular client for mqtt:// connections
    mqttClient.setClient(espClient);
  }

  mqttClient.setBufferSize(512);
  mqttClient.setServer(host.c_str(), port);
  mqttClient.setCallback(mqttCallback);

  // Create LWT payload
  JsonDocument lwtDoc;
  lwtDoc["status"] = "offline";
  lwtDoc["timestamp"] = "2024-01-01T00:00:00Z";
  char lwtBuffer[128];
  serializeJson(lwtDoc, lwtBuffer);

  Serial.printf("[MQTT] DEBUG - ClientId: '%s'\n", mqttCreds.clientId);
  Serial.printf("[MQTT] DEBUG - Username: '%s'\n", mqttCreds.username);
  Serial.printf("[MQTT] DEBUG - Password len: %d\n",
                strlen(mqttCreds.password));

  if (mqttClient.connect(mqttCreds.clientId, mqttCreds.username,
                         mqttCreds.password, mqttCreds.topicStatus, 1, true,
                         lwtBuffer)) {
    Serial.println("[MQTT] Connected!");

    // Subscribe to commands
    mqttClient.subscribe(mqttCreds.topicCommands);
    Serial.printf("[MQTT] Subscribed to: %s\n", mqttCreds.topicCommands);

    // Send online status
    sendStatus(true);

    // Blink LED to indicate connected
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  } else {
    Serial.printf("[MQTT] Connection failed, rc=%d\n", mqttClient.state());
  }
}

void mqttCallback(char *topic, byte *payload, unsigned int length) {
  Serial.printf("[MQTT] Message on %s\n", topic);

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.printf("[MQTT] JSON parse failed: %s\n", error.c_str());
    return;
  }

  handleCommand(doc.as<JsonObject>());
}

void sendStatus(bool online) {
  JsonDocument doc;
  doc["status"] = online ? "online" : "offline";
  doc["timestamp"] = "2024-01-01T00:00:00Z"; // TODO: Use NTP

  char buffer[128];
  serializeJson(doc, buffer);

  mqttClient.publish(mqttCreds.topicStatus, buffer, true);
  Serial.printf("[MQTT] Status: %s\n", online ? "online" : "offline");
}

void sendTelemetry() {
  JsonDocument doc;

  JsonObject data = doc["data"].to<JsonObject>();
  data["temperature"] = 20.0 + random(0, 100) / 10.0;
  data["humidity"] = 40.0 + random(0, 200) / 10.0;
  data["uptime"] = millis() / 1000;
  data["rssi"] = WiFi.RSSI();
  data["led"] = digitalRead(LED_PIN) == HIGH;

  doc["timestamp"] = "2024-01-01T00:00:00Z"; // TODO: Use NTP

  char buffer[256];
  serializeJson(doc, buffer);

  mqttClient.publish(mqttCreds.topicTelemetry, buffer);
  Serial.printf("[MQTT] Telemetry: temp=%.1f°C, hum=%.1f%%\n",
                data["temperature"].as<float>(), data["humidity"].as<float>());
}

// ============================================================================
// COMMAND HANDLING
// ============================================================================

void handleCommand(const JsonObject &command) {
  const char *action = command["action"];
  const char *correlationId = command["correlationId"];
  JsonObject params = command["params"];

  Serial.printf("[Cmd] Received: %s (ID: %s)\n", action, correlationId);

  bool success = false;
  String errorMsg = "";

  if (action && strcmp(action, "set_state") == 0) {
    // Generic state setter - handles any parameter
    for (JsonPair kv : params) {
      if (strcmp(kv.key().c_str(), "led") == 0) {
        bool state = kv.value().as<bool>();
        digitalWrite(LED_PIN, state ? HIGH : LOW);
        Serial.printf("[Cmd] LED set to %s\n", state ? "ON" : "OFF");
      }
    }
    success = true;
  } else if (action && strcmp(action, "toggle-led") == 0) {
    bool state = params["state"] | false;
    digitalWrite(LED_PIN, state ? HIGH : LOW);
    success = true;
  } else {
    errorMsg = "Unknown command";
    success = true; // Still ACK unknown commands
  }

  // Send ACK
  JsonDocument ackDoc;
  ackDoc["correlationId"] = correlationId;
  ackDoc["status"] = success ? "success" : "error";
  if (!success && errorMsg.length() > 0) {
    ackDoc["error"] = errorMsg;
  }

  // Include current state
  JsonObject state = ackDoc["state"].to<JsonObject>();
  state["led"] = digitalRead(LED_PIN) == HIGH;

  ackDoc["timestamp"] = "2024-01-01T00:00:00Z"; // TODO: Use NTP

  char buffer[256];
  serializeJson(ackDoc, buffer);

  mqttClient.publish(mqttCreds.topicAck, buffer);
  Serial.printf("[Cmd] ACK sent: %s\n", success ? "success" : "error");
}

// ============================================================================
// FACTORY RESET
// ============================================================================

void checkFactoryReset() {
  bool buttonPressed = digitalRead(RESET_BUTTON_PIN) == LOW;

  if (buttonPressed && !buttonWasPressed) {
    buttonPressStart = millis();
    buttonWasPressed = true;
    Serial.println(
        "[Reset] Button pressed - hold for 5 seconds to factory reset");
  } else if (buttonPressed && buttonWasPressed) {
    if (millis() - buttonPressStart >= RESET_HOLD_TIME_MS) {
      Serial.println("[Reset] Factory reset triggered!");

      // Blink LED rapidly
      for (int i = 0; i < 10; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
      }

      // Clear credentials
      storageClear();

      // Restart
      Serial.println("[Reset] Restarting...");
      delay(1000);
      ESP.restart();
    }
  } else {
    buttonWasPressed = false;
  }
}
