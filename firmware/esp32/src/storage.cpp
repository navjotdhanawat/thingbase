#include "storage.h"
#include <Preferences.h>

static Preferences prefs;

void storageInit() { prefs.begin("thingbase", false); }

void storageClear() {
  prefs.clear();
  Serial.println("[Storage] All credentials cleared");
}

bool storageIsProvisioned() { return prefs.getBool("provisioned", false); }

void storageSaveWifi(const char *ssid, const char *password) {
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", password);
  Serial.printf("[Storage] WiFi saved: %s\n", ssid);
}

WifiCredentials storageLoadWifi() {
  WifiCredentials creds;
  String ssid = prefs.getString("wifi_ssid", "");
  String pass = prefs.getString("wifi_pass", "");

  if (ssid.length() > 0) {
    strncpy(creds.ssid, ssid.c_str(), sizeof(creds.ssid) - 1);
    strncpy(creds.password, pass.c_str(), sizeof(creds.password) - 1);
    creds.isValid = true;
  } else {
    creds.isValid = false;
  }

  return creds;
}

void storageSaveMqtt(const char *broker, const char *clientId,
                     const char *username, const char *password,
                     const char *topicTelemetry, const char *topicCommands,
                     const char *topicAck, const char *topicStatus,
                     const char *tenantId, const char *deviceId) {
  prefs.putString("mqtt_broker", broker);
  prefs.putString("mqtt_client", clientId);
  prefs.putString("mqtt_user", username);
  prefs.putString("mqtt_pass", password);
  prefs.putString("topic_tele", topicTelemetry);
  prefs.putString("topic_cmd", topicCommands);
  prefs.putString("topic_ack", topicAck);
  prefs.putString("topic_status", topicStatus);
  prefs.putString("tenant_id", tenantId);
  prefs.putString("device_id", deviceId);
  prefs.putBool("provisioned", true);

  Serial.printf("[Storage] MQTT saved: %s\n", broker);
}

MqttCredentials storageLoadMqtt() {
  MqttCredentials creds;

  String broker = prefs.getString("mqtt_broker", "");
  if (broker.length() > 0) {
    strncpy(creds.broker, broker.c_str(), sizeof(creds.broker) - 1);
    strncpy(creds.clientId, prefs.getString("mqtt_client", "").c_str(),
            sizeof(creds.clientId) - 1);
    strncpy(creds.username, prefs.getString("mqtt_user", "").c_str(),
            sizeof(creds.username) - 1);
    strncpy(creds.password, prefs.getString("mqtt_pass", "").c_str(),
            sizeof(creds.password) - 1);
    strncpy(creds.topicTelemetry, prefs.getString("topic_tele", "").c_str(),
            sizeof(creds.topicTelemetry) - 1);
    strncpy(creds.topicCommands, prefs.getString("topic_cmd", "").c_str(),
            sizeof(creds.topicCommands) - 1);
    strncpy(creds.topicAck, prefs.getString("topic_ack", "").c_str(),
            sizeof(creds.topicAck) - 1);
    strncpy(creds.topicStatus, prefs.getString("topic_status", "").c_str(),
            sizeof(creds.topicStatus) - 1);
    strncpy(creds.tenantId, prefs.getString("tenant_id", "").c_str(),
            sizeof(creds.tenantId) - 1);
    strncpy(creds.deviceId, prefs.getString("device_id", "").c_str(),
            sizeof(creds.deviceId) - 1);
    creds.isValid = true;
  } else {
    creds.isValid = false;
  }

  return creds;
}
