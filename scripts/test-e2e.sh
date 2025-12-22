#!/bin/bash
# E2E Test Script for ThingBase Device Controls

API_URL="http://localhost:3001/api/v1"
TIMESTAMP=$(date +%s)

echo "================================================"
echo "🧪 ThingBase E2E Test - Device Controls"
echo "================================================"
echo ""

# 1. Register new user
echo "📝 Step 1: Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e${TIMESTAMP}@test.com\",\"password\":\"Test123456!\",\"name\":\"E2E User\",\"tenantName\":\"E2E Tenant ${TIMESTAMP}\",\"tenantSlug\":\"e2e-tenant-${TIMESTAMP}\"}")

echo "Register response: $REGISTER_RESPONSE"

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi
echo "✅ Got access token: ${ACCESS_TOKEN:0:50}..."
echo ""

# 2. Get available presets
echo "📋 Step 2: Getting available presets..."
PRESETS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "${API_URL}/device-types/presets")
echo "Presets response: $PRESETS_RESPONSE"
echo ""

# 3. Create relay-4ch device type
echo "🔧 Step 3: Creating relay-4ch device type..."
TYPE_RESPONSE=$(curl -s -X POST "${API_URL}/device-types/presets/relay-4ch" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")
echo "Type response: $TYPE_RESPONSE"

TYPE_ID=$(echo "$TYPE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TYPE_ID" ]; then
  echo "❌ Failed to create device type"
  exit 1
fi
echo "✅ Device type created: $TYPE_ID"
echo ""

# 4. Create a device
echo "📱 Step 4: Creating device..."
DEVICE_RESPONSE=$(curl -s -X POST "${API_URL}/devices" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Relay\",\"typeId\":\"$TYPE_ID\",\"externalId\":\"relay-${TIMESTAMP}\"}")
echo "Device response: $DEVICE_RESPONSE"

DEVICE_ID=$(echo "$DEVICE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$DEVICE_ID" ]; then
  echo "❌ Failed to create device"
  exit 1
fi
echo "✅ Device created: $DEVICE_ID"
echo ""

# 5. Send control command
echo "🎮 Step 5: Sending control command..."
CMD_RESPONSE=$(curl -s -X POST "${API_URL}/commands" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"type\":\"set_state\",\"payload\":{\"relay1\":true}}")
echo "Command response: $CMD_RESPONSE"

CMD_ID=$(echo "$CMD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CMD_ID" ]; then
  echo "❌ Failed to send command"
  exit 1
fi
echo "✅ Command sent: $CMD_ID"
echo ""

echo "================================================"
echo "✅ E2E TEST PASSED!"
echo "================================================"
