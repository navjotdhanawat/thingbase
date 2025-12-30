# IoT SaaS Platform - Happy Path Guide

Quick guide to test the full end-to-end flow.

## Prerequisites

```bash
# Start infrastructure
docker compose up -d

# Start dev servers (API + Web + Shared)
pnpm dev
```

**URLs:**
- Web App: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

---

## Step 1: Create New User (Register)

### Option A: Web UI
1. Go to http://localhost:3000
2. Click **"Sign Up"**
3. Fill in:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `Password123!`
   - Company Name: `My IoT Company`
   - Company Slug: `my-iot-company`
4. Click **Register**

### Option B: API (curl)
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123!",
    "name": "John Doe",
    "tenantName": "My IoT Company",
    "tenantSlug": "my-iot-company"
  }'
```

---

## Step 2: Create Device Type

### Via Web UI
1. Login → Go to **Device Types**
2. Click **"Add from Preset"**
3. Select **"Smart Switch"** (or Thermostat)

### Via API
```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123!"}' | jq -r '.data.accessToken')

# Create device type from preset
curl -X POST http://localhost:3001/api/v1/device-types/presets/switch \
  -H "Authorization: Bearer $TOKEN"
```

---

## Step 3: Add New Device

### Option A: Web UI
1. Go to **Devices** → Click **"Add Device"**
2. Enter device name: `Living Room Switch`
3. Select type: `Smart Switch`
4. Click **Create**
5. Copy the **Claim Token** or scan **QR Code**

### Option B: API - Generate Claim Token
```bash
# Generate claim token (returns QR code data for mobile)
curl -X POST http://localhost:3001/api/v1/devices/claim-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Living Room Switch",
    "deviceTypeId": "<DEVICE_TYPE_ID>"
  }'
```

Response includes:
```json
{
  "claimToken": "ct_xxxxx",
  "deviceId": "uuid",
  "qrCodeData": "iot://claim?token=ct_xxxxx&device=uuid"
}
```

---

## Step 4: Provision Device (Simulate Device Claiming)

This simulates what a physical device does when it scans the QR code:

```bash
# Device claims itself using the token
curl -X POST http://localhost:3001/api/v1/devices/claim \
  -H "Content-Type: application/json" \
  -d '{
    "claimToken": "ct_xxxxx",
    "deviceInfo": {
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "firmwareVersion": "1.0.0"
    }
  }'
```

Response includes MQTT credentials:
```json
{
  "deviceId": "uuid",
  "mqtt": {
    "broker": "mqtt://localhost:1883",
    "clientId": "d_uuid",
    "username": "uuid",
    "password": "secret",
    "topics": {
      "telemetry": "t/{tenantId}/d/{deviceId}/telemetry",
      "commands": "t/{tenantId}/d/{deviceId}/cmd"
    }
  }
}
```

---

## Step 5: Run Device Simulator

```bash
cd apps/simulator

# Run simulator with device credentials
node dist/cli.js run \
  --tenant "<TENANT_ID>" \
  --device "<DEVICE_ID>" \
  --type switch \
  --interval 3000
```

Simulator will:
- ✅ Connect to MQTT broker
- ✅ Send telemetry every 3 seconds
- ✅ Listen for commands
- ✅ Respond to on/off commands

---

## Step 6: Test Commands (Turn Switch On/Off)

### Option A: Web UI
1. Go to **Devices** → Click on your device
2. Click **"Power On"** or **"Power Off"** button
3. Watch the simulator terminal for command receipt

### Option B: Mobile App
1. Login with your credentials
2. Go to **Devices** tab
3. Tap on the device
4. Toggle the **Power** switch

### Option C: API
```bash
# Send "power on" command
curl -X POST http://localhost:3001/api/v1/commands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "<DEVICE_ID>",
    "type": "set_power",
    "payload": {"power": true}
  }'

# Send "power off" command
curl -X POST http://localhost:3001/api/v1/commands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "<DEVICE_ID>",
    "type": "set_power",
    "payload": {"power": false}
  }'
```

---

## Step 7: Verify in Simulator

When you send a command, the simulator shows:

```
📥 Command received: set_power (correlation-id)
  ✓ Command executed: set_power
```

The next telemetry will reflect the new state:
```
📤 Telemetry: power=ON, energy=12.5kWh, current=2.1A, voltage=220V
```

---

## Quick Reference

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| demo@iotsaas.io | Demo123!@# | Admin |
| navjot1@gmail.com | Admin@123 | Admin |

### Device Type Presets

| Preset | Fields |
|--------|--------|
| `thermostat` | temperature, humidity, power, mode |
| `switch` | power, energy, current, voltage |
| `water-pump` | running, flow_rate, pressure, motor_temp |

### Key API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Register | POST | `/api/v1/auth/register` |
| Login | POST | `/api/v1/auth/login` |
| Create Device Type | POST | `/api/v1/device-types/presets/:slug` |
| Generate Claim Token | POST | `/api/v1/devices/claim-token` |
| Claim Device | POST | `/api/v1/devices/claim` |
| Send Command | POST | `/api/v1/commands` |
| Get Telemetry | GET | `/api/v1/telemetry/:deviceId` |

---

## Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Web/App   │───▶│   API       │───▶│  Database   │
│   (React/   │    │  (NestJS)   │    │ (Postgres)  │
│   Flutter)  │    │             │    │             │
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │
                          │ MQTT
                          ▼
                   ┌─────────────┐
                   │    EMQX     │
                   │   Broker    │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Simulator  │
                   │  (Device)   │
                   └─────────────┘
```

**Command Flow:**
1. User clicks "Power On" in Web/Mobile
2. API creates command record, publishes to MQTT
3. Simulator receives command, executes it
4. Simulator sends ACK + updated telemetry
5. UI updates with new device state

