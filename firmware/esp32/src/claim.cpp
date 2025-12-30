#include "claim.h"
#include "config.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

ClaimResult claimDevice(const char *serverUrl, const char *claimToken) {
  ClaimResult result;
  result.success = false;

  WiFiClientSecure client;
  client.setInsecure();     // Skip certificate verification for now
  client.setTimeout(15000); // 15 second timeout

  HTTPClient http;

  // Build URL: serverUrl might be like "https://api.example.com/api/v1"
  String url = String(serverUrl);
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += "devices/claim";

  Serial.printf("[Claim] POST %s\n", url.c_str());

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000); // 15 second timeout

  // Build request body
  JsonDocument requestDoc;
  requestDoc["claimToken"] = claimToken;

  // Add device info
  JsonObject deviceInfo = requestDoc["deviceInfo"].to<JsonObject>();
  deviceInfo["macAddress"] = WiFi.macAddress();
  deviceInfo["firmwareVersion"] = FIRMWARE_VERSION;
  deviceInfo["model"] = DEVICE_MODEL;

  // Get chip ID
  uint64_t chipId = ESP.getEfuseMac();
  char chipIdStr[17];
  snprintf(chipIdStr, sizeof(chipIdStr), "%016llX", chipId);
  deviceInfo["chipId"] = chipIdStr;

  String requestBody;
  serializeJson(requestDoc, requestBody);
  Serial.printf("[Claim] Body: %s\n", requestBody.c_str());

  int httpCode = http.POST(requestBody);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.printf("[Claim] Response: %s\n", response.c_str());

    JsonDocument responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (error) {
      result.error = "Failed to parse response: " + String(error.c_str());
      http.end();
      return result;
    }

    if (responseDoc["success"].as<bool>() == true) {
      JsonObject data = responseDoc["data"];

      result.deviceId = data["deviceId"].as<String>();
      result.tenantId = data["tenantId"].as<String>();

      JsonObject mqtt = data["mqtt"];
      strncpy(result.mqtt.broker, mqtt["broker"] | "",
              sizeof(result.mqtt.broker) - 1);
      strncpy(result.mqtt.clientId, mqtt["clientId"] | "",
              sizeof(result.mqtt.clientId) - 1);
      strncpy(result.mqtt.username, mqtt["username"] | "",
              sizeof(result.mqtt.username) - 1);
      strncpy(result.mqtt.password, mqtt["password"] | "",
              sizeof(result.mqtt.password) - 1);

      JsonObject topics = mqtt["topics"];
      strncpy(result.mqtt.topicTelemetry, topics["telemetry"] | "",
              sizeof(result.mqtt.topicTelemetry) - 1);
      strncpy(result.mqtt.topicCommands, topics["commands"] | "",
              sizeof(result.mqtt.topicCommands) - 1);
      strncpy(result.mqtt.topicAck, topics["ack"] | "",
              sizeof(result.mqtt.topicAck) - 1);
      strncpy(result.mqtt.topicStatus, topics["status"] | "",
              sizeof(result.mqtt.topicStatus) - 1);
      strncpy(result.mqtt.tenantId, result.tenantId.c_str(),
              sizeof(result.mqtt.tenantId) - 1);
      strncpy(result.mqtt.deviceId, result.deviceId.c_str(),
              sizeof(result.mqtt.deviceId) - 1);
      result.mqtt.isValid = true;

      result.success = true;
      Serial.println("[Claim] Device claimed successfully!");
    } else {
      result.error = responseDoc["error"].as<String>();
    }
  } else if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[Claim] HTTP Error %d: %s\n", httpCode, response.c_str());

    JsonDocument errorDoc;
    if (deserializeJson(errorDoc, response) == DeserializationError::Ok) {
      result.error = errorDoc["message"].as<String>();
    } else {
      result.error = "HTTP Error: " + String(httpCode);
    }
  } else {
    result.error = "Connection failed: " + http.errorToString(httpCode);
  }

  http.end();
  return result;
}
