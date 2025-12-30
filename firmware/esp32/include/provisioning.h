#ifndef PROVISIONING_H
#define PROVISIONING_H

#include <Arduino.h>

// Callback when provisioning is complete
typedef void (*ProvisioningCompleteCallback)(bool success);

// Start SoftAP provisioning mode
void provisioningStart(ProvisioningCompleteCallback callback);

// Stop provisioning mode
void provisioningStop();

// Check if currently in provisioning mode
bool provisioningIsActive();

// Get the AP name being used
String provisioningGetAPName();

#endif
