# ThingBase EMQX Railway Deployment Guide

## Overview

This guide walks you through deploying EMQX MQTT broker on Railway with HTTP authentication, enabling dynamic device credentials.

## Prerequisites

- Railway account
- Your ThingBase API already deployed on Railway
- Git repository pushed to GitHub

---

## Step 1: Add EMQX Service to Railway

### Option A: Using Railway Dashboard (Recommended)

1. **Go to your Railway project** (where API and Web are deployed)

2. **Add New Service**:
   - Click **"+ New"** button
   - Select **"Empty Service"** (we'll configure manually)

3. **Configure the Service**:
   - Click on the new service
   - Go to **Settings** tab
   - Under **Source**, connect to your GitHub repo
   - Set **Root Directory** to: `infra/emqx`
   - Set **Builder** to: `Dockerfile`

### Option B: Using Railway CLI

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Add EMQX service from infra/emqx directory
cd infra/emqx
railway up
```

---

## Step 2: Configure Environment Variables

In the EMQX service on Railway, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `THINGBASE_API_URL` | `https://thingbase-api-production-XXXX.up.railway.app` | Your API's Railway URL |
| `EMQX_DASHBOARD_PASSWORD` | `strong-password-here` | Min 8 chars, used for dashboard login |
| `EMQX_NODE_COOKIE` | `random-secret-string` | Any random string for cluster security |

### How to find your API URL:
1. Go to your API service in Railway
2. Go to **Settings** → **Networking**
3. Copy the public domain (e.g., `thingbase-api-production-abc123.up.railway.app`)

---

## Step 3: Configure Networking (CRITICAL)

EMQX needs TCP ports exposed for MQTT connections. Railway supports this via TCP Proxy.

### 3.1 Generate Public Domain

1. Go to EMQX service → **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Note the generated domain (e.g., `thingbase-emqx-production.up.railway.app`)

### 3.2 Add TCP Proxy for MQTT Port

1. In the same **Networking** section
2. Under **Public Networking**
3. Click **"Add TCP Proxy"**
4. Enter port: `1883`
5. Railway will generate a TCP endpoint like: `region.proxy.rlwy.net:12345`

**Important**: Note this TCP endpoint! This is what devices will connect to.

---

## Step 4: Update API Environment Variables

Now update your **API service** to connect to EMQX:

| Variable | Value | Notes |
|----------|-------|-------|
| `MQTT_URL` | `mqtt://region.proxy.rlwy.net:12345` | EMQX TCP proxy URL from Step 3 |
| `MQTT_API_USERNAME` | `iot-api` | System user for API |
| `MQTT_API_PASSWORD` | `your-secure-password` | Password for API's MQTT connection |
| `MQTT_SIMULATOR_USERNAME` | `iot-simulator` | System user for simulator |
| `MQTT_SIMULATOR_PASSWORD` | `your-secure-password` | Password for simulator |

---

## Step 5: Deploy and Verify

1. **Commit and push** your changes:
   ```bash
   git add .
   git commit -m "Add EMQX MQTT broker with HTTP auth"
   git push
   ```

2. **Wait for deployment** - Railway will auto-deploy

3. **Check EMQX Dashboard**:
   - URL: `https://thingbase-emqx-production.up.railway.app:18083`
   - Username: `admin`
   - Password: Your `EMQX_DASHBOARD_PASSWORD`

4. **Verify API can connect**:
   - Check API logs in Railway
   - Look for: `Connected to MQTT broker`

---

## Step 6: Test Device Authentication

### Test auth endpoint manually:

```bash
# Test system user auth
curl -X POST https://YOUR-API-URL/api/v1/mqtt/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "iot-api", "password": "your-password"}'

# Expected: {"result": "allow", "is_superuser": true}
```

### Test with ESP32 device:

1. Reset your ESP32 to trigger re-provisioning
2. Complete the claim flow
3. Device should now connect successfully!

---

## Network Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                     Railway                              │
│                                                          │
│  ┌─────────────┐  TCP:12345   ┌─────────────────────┐   │
│  │   ESP32     │─────────────▶│      EMQX           │   │
│  │   Device    │ MQTT Connect │   (MQTT Broker)     │   │
│  └─────────────┘              │                     │   │
│                               │   On Connect:       │   │
│                               │   POST /mqtt/auth   │   │
│                               │         │           │   │
│  ┌─────────────┐              │         ▼           │   │
│  │  API Server │◀─────────────┤   HTTP Request      │   │
│  │  (NestJS)   │   Auth Check │                     │   │
│  │             │──────────────▶  {"result":"allow"} │   │
│  │  /mqtt/auth │              │         │           │   │
│  │  /mqtt/acl  │              │         ▼           │   │
│  └─────────────┘              │   Allow Connection  │   │
│         │                     └─────────────────────┘   │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │  PostgreSQL │  (Stores device credentials)           │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Error: rc=5 (Not Authorized)

**Cause**: EMQX can't validate credentials

**Solutions**:
1. Check EMQX logs: `railway logs -s emqx`
2. Verify `THINGBASE_API_URL` is correct
3. Test auth endpoint manually (see Step 6)
4. Ensure device has valid credentials in database

### Error: EMQX can't reach API

**Cause**: Network/URL issues

**Solutions**:
1. Verify API is running: check API logs
2. Ensure `THINGBASE_API_URL` uses `https://`
3. Check if API health endpoint works: `curl https://API-URL/api/health`

### Dashboard not accessible

**Solutions**:
1. Check `EMQX_DASHBOARD_PASSWORD` is set
2. Verify port 18083 is exposed
3. Try adding explicit port in domain settings

### Device connects but gets disconnected

**Cause**: ACL check failing

**Solutions**:
1. Check API logs for ACL requests
2. Verify device is publishing to correct topic pattern
3. Topic must be: `iot/{tenantId}/devices/{deviceId}/{type}`

---

## Security Checklist

- [ ] Set strong `EMQX_DASHBOARD_PASSWORD`
- [ ] Set unique `EMQX_NODE_COOKIE`
- [ ] Use secure passwords for `MQTT_API_PASSWORD`
- [ ] Ensure API uses HTTPS in production
- [ ] Disable anonymous access (already disabled by default)
- [ ] Enable TLS for MQTT in production (port 8883)

---

## Quick Reference

| Service | Port | Purpose |
|---------|------|---------|
| EMQX MQTT | 1883 | Device connections (TCP) |
| EMQX WS | 8083 | WebSocket connections |
| EMQX Dashboard | 18083 | Admin UI |
| API | 3001 | Authentication endpoints |
