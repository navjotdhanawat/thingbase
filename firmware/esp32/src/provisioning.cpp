#include "provisioning.h"
#include "claim.h"
#include "config.h"
#include "storage.h"
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <WiFi.h>

// ============================================================================
// GLOBALS
// ============================================================================

static AsyncWebServer *server = nullptr;
static bool isProvisioning = false;
static String apName;
static ProvisioningCompleteCallback onComplete = nullptr;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

static String getDeviceAPName() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char suffix[5];
  snprintf(suffix, sizeof(suffix), "%02X%02X", mac[4], mac[5]);
  return "ThingBase-" + String(suffix);
}

static String scanNetworksJson() {
  JsonDocument doc;
  JsonArray networks = doc["networks"].to<JsonArray>();

  int n = WiFi.scanNetworks();
  for (int i = 0; i < n && i < 20; i++) {
    JsonObject net = networks.add<JsonObject>();
    net["ssid"] = WiFi.SSID(i);
    net["rssi"] = WiFi.RSSI(i);
    net["secure"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    net["bssid"] = WiFi.BSSIDstr(i);
  }
  WiFi.scanDelete();

  String result;
  serializeJson(doc, result);
  return result;
}

// ============================================================================
// HTTP HANDLERS
// ============================================================================

static void handleInfo(AsyncWebServerRequest *request) {
  JsonDocument doc;
  doc["deviceId"] = "pending"; // Will be assigned after claim
  doc["firmware"] = FIRMWARE_VERSION;
  doc["model"] = DEVICE_MODEL;
  doc["mac"] = WiFi.macAddress();

  uint64_t chipId = ESP.getEfuseMac();
  char chipIdStr[17];
  snprintf(chipIdStr, sizeof(chipIdStr), "%016llX", chipId);
  doc["chipId"] = chipIdStr;

  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

static void handlePing(AsyncWebServerRequest *request) {
  request->send(200, "application/json", "{\"pong\":true}");
}

static void handleStatus(AsyncWebServerRequest *request) {
  JsonDocument doc;
  doc["state"] = "provisioning";
  doc["provisioned"] = false;
  doc["apName"] = apName;

  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

static void handleScan(AsyncWebServerRequest *request) {
  String json = scanNetworksJson();
  request->send(200, "application/json", json);
}

struct ProvisioningParams {
  String ssid;
  String password;
  String claimToken;
  String serverUrl;
};

static void provisioningTask(void *pvParameters) {
  ProvisioningParams *params = (ProvisioningParams *)pvParameters;

  Serial.println("[Provision] Background task started");
  Serial.printf("[Provision] DEBUG - SSID: '%s' (len=%d)\n",
                params->ssid.c_str(), params->ssid.length());
  Serial.printf("[Provision] DEBUG - Password: '%s' (len=%d)\n",
                params->password.c_str(), params->password.length());
  Serial.printf("[Provision] DEBUG - ClaimToken: '%s'\n",
                params->claimToken.c_str());
  Serial.printf("[Provision] DEBUG - ServerUrl: '%s'\n",
                params->serverUrl.c_str());

  // Store WiFi credentials AND claim info for after reboot
  storageSaveWifi(params->ssid.c_str(), params->password.c_str());

  // Save claim token and server URL temporarily for post-reboot claiming
  Preferences prefs;
  prefs.begin("thingbase", false);
  prefs.putString("claim_token", params->claimToken.c_str());
  prefs.putString("claim_url", params->serverUrl.c_str());
  prefs.end();

  Serial.println("[Provision] Credentials saved. Rebooting to connect...");

  // Blink LED to indicate reboot
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, HIGH);
    vTaskDelay(pdMS_TO_TICKS(100));
    digitalWrite(LED_PIN, LOW);
    vTaskDelay(pdMS_TO_TICKS(100));
  }

  delete params;
  vTaskDelay(pdMS_TO_TICKS(500));
  ESP.restart();
}

static void handleProvision(AsyncWebServerRequest *request, uint8_t *data,
                            size_t len, size_t index, size_t total) {
  String body = String((char *)data).substring(0, len);
  Serial.printf("[Provision] Received: %s\n", body.c_str());

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  const char *ssid = doc["ssid"];
  const char *password = doc["password"];
  const char *claimToken = doc["claimToken"];
  const char *serverUrl = doc["serverUrl"];

  if (!ssid || !password || !claimToken || !serverUrl) {
    request->send(400, "application/json",
                  "{\"error\":\"Missing required fields\"}");
    return;
  }

  // Create params for the background task
  ProvisioningParams *params = new ProvisioningParams();
  params->ssid = ssid;
  params->password = password;
  params->claimToken = claimToken;
  params->serverUrl = serverUrl;

  // Send immediate response
  request->send(200, "application/json",
                "{\"message\":\"Provisioning started\"}");

  // Start background task
  xTaskCreate(provisioningTask, "provisioning_task", 8192, params, 1, NULL);
}

// ============================================================================
// PUBLIC API
// ============================================================================

void provisioningStart(ProvisioningCompleteCallback callback) {
  if (isProvisioning) {
    provisioningStop();
  }

  onComplete = callback;
  isProvisioning = true;

  // Initialize storage
  storageInit();

  // Generate AP name
  apName = getDeviceAPName();

  Serial.println("========================================");
  Serial.println("     STARTING PROVISIONING MODE");
  Serial.println("========================================");
  Serial.printf("AP Name: %s\n", apName.c_str());
  Serial.printf("Password: %s\n", AP_PASSWORD);
  Serial.println("Connect to this WiFi and visit http://192.168.4.1");
  Serial.println("========================================");

  // Start SoftAP
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(SOFTAP_IP, SOFTAP_GATEWAY, SOFTAP_SUBNET);
  WiFi.softAP(apName.c_str(), AP_PASSWORD);

  Serial.printf("AP IP address: %s\n", WiFi.softAPIP().toString().c_str());

  // Create HTTP server
  server = new AsyncWebServer(80);

  // Register routes
  server->on("/info", HTTP_GET, handleInfo);
  server->on("/ping", HTTP_GET, handlePing);
  server->on("/status", HTTP_GET, handleStatus);
  server->on("/scan", HTTP_GET, handleScan);
  server->on(
      "/provision", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
      handleProvision);

  // CORS headers for mobile app
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods",
                                       "GET, POST, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers",
                                       "Content-Type");

  server->begin();
  Serial.println("[Provision] HTTP server started");
}

void provisioningStop() {
  isProvisioning = false;

  if (server) {
    server->end();
    delete server;
    server = nullptr;
  }

  WiFi.softAPdisconnect(true);
  Serial.println("[Provision] Provisioning mode stopped");
}

bool provisioningIsActive() { return isProvisioning; }

String provisioningGetAPName() { return apName; }
