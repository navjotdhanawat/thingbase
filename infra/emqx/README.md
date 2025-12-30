# ThingBase EMQX MQTT Broker

This directory contains the configuration for deploying EMQX MQTT broker on Railway with HTTP authentication.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ESP32 Device  │────▶│   EMQX Broker   │────▶│  ThingBase API  │
│                 │     │   (Railway)     │     │   (Railway)     │
│ username: devId │     │                 │     │                 │
│ password: token │     │  HTTP Auth ─────┼────▶│ /api/v1/mqtt/   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## How It Works

1. **Device Claims**: Device calls `/api/v1/devices/claim` with claim token
2. **Credentials Generated**: API generates MQTT username (deviceId) + password (random token)
3. **Credentials Stored**: Password hash saved in `device_credentials` table
4. **Device Connects**: Device connects to EMQX with credentials
5. **EMQX Validates**: EMQX calls `POST /api/v1/mqtt/auth` with credentials
6. **API Verifies**: API looks up credentials in database and validates password
7. **Connection Allowed**: EMQX allows/denies connection based on API response

## Deployment to Railway

### Step 1: Create EMQX Service

1. Go to your Railway project
2. Click **"New"** → **"GitHub Repo"**
3. Select your repository
4. Set the **Root Directory** to: `infra/emqx`
5. Railway will detect the Dockerfile

### Step 2: Configure Environment Variables

In the EMQX service settings, add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `THINGBASE_API_URL` | `https://your-api.railway.app` | Your API's public URL |
| `EMQX_DASHBOARD_PASSWORD` | `your-secure-password` | Dashboard login password |
| `EMQX_NODE_COOKIE` | `random-string` | Cluster cookie (any random value) |

### Step 3: Configure Networking

1. Go to EMQX service → **Settings** → **Networking**
2. Click **"Generate Domain"** to get a public URL
3. Add **TCP Proxy** for port `1883` (MQTT)
4. Note the generated hostname and port (e.g., `emqx.railway.app:12345`)

### Step 4: Update API Environment Variables

In your API service, update:

| Variable | Value |
|----------|-------|
| `MQTT_URL` | `mqtt://emqx.railway.app:12345` |
| `MQTT_API_USERNAME` | `iot-api` |
| `MQTT_API_PASSWORD` | `your-secure-api-password` |

### Step 5: Redeploy

1. Commit and push your changes
2. Railway will automatically redeploy both services

## Local Development

For local development with Docker Compose:

```bash
# Start services (from project root)
docker-compose up -d

# EMQX Dashboard will be at: http://localhost:18083
# Default login: admin / public
```

## Accessing EMQX Dashboard

- **URL**: `https://your-emqx.railway.app:18083`
- **Username**: `admin`
- **Password**: Value of `EMQX_DASHBOARD_PASSWORD`

## Testing Authentication

You can test the auth endpoint manually:

```bash
# Test successful auth (replace with your API URL)
curl -X POST https://your-api.railway.app/api/v1/mqtt/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "iot-api", "password": "dev-mqtt-password"}'

# Expected response: {"result": "allow", "is_superuser": true}
```

## Troubleshooting

### Device gets rc=5 (Not Authorized)

1. Check if device credentials exist in database
2. Verify EMQX can reach API URL
3. Check API logs for auth requests
4. Verify password matches what was stored

### EMQX can't reach API

1. Ensure `THINGBASE_API_URL` uses HTTPS
2. Check Railway internal networking
3. Verify API is deployed and healthy

### Dashboard not accessible

1. Ensure port 18083 is exposed
2. Check `EMQX_DASHBOARD_PASSWORD` is set
3. Try accessing via Railway's TCP proxy
