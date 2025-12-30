#ifndef STORAGE_H
#define STORAGE_H

#include <Arduino.h>

// ============================================================================
// STORAGE STRUCTURES
// ============================================================================

struct WifiCredentials {
  char ssid[64];
  char password[64];
  bool isValid;
};

struct MqttCredentials {
  char broker[128];
  char clientId[64];
  char username[64];
  char password[128];
  char topicTelemetry[128];
  char topicCommands[128];
  char topicAck[128];
  char topicStatus[128];
  char tenantId[64];
  char deviceId[64];
  bool isValid;
};

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

void storageInit();
void storageClear();

bool storageIsProvisioned();

void storageSaveWifi(const char *ssid, const char *password);
WifiCredentials storageLoadWifi();

void storageSaveMqtt(const char *broker, const char *clientId,
                     const char *username, const char *password,
                     const char *topicTelemetry, const char *topicCommands,
                     const char *topicAck, const char *topicStatus,
                     const char *tenantId, const char *deviceId);
MqttCredentials storageLoadMqtt();

#endif
