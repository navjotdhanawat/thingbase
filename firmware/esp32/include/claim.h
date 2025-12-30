#ifndef CLAIM_H
#define CLAIM_H

#include "storage.h"
#include <Arduino.h>

// Result of claim API call
struct ClaimResult {
  bool success;
  String error;
  String deviceId;
  String tenantId;
  MqttCredentials mqtt;
};

// Claim device using token and get MQTT credentials
ClaimResult claimDevice(const char *serverUrl, const char *claimToken);

#endif
