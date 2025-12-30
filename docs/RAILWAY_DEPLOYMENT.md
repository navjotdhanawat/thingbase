# 🚀 ThingBase - Railway Deployment Guide

## Overview

This guide covers deploying ThingBase to Railway.io using the Hobby plan ($5/month).

## Architecture on Railway

| Service | Type | Notes |
|---------|------|-------|
| **API** | Custom (Dockerfile) | NestJS backend |
| **Web** | Custom (Dockerfile) | Next.js frontend |
| **Redis** | Railway Plugin | Managed cache |
| **EMQX** | Custom (Dockerfile) | MQTT broker with HTTP auth |
| **PostgreSQL** | External | Neon/Supabase (free tier) |

## Prerequisites

1. [Railway account](https://railway.app)
2. [GitHub repository](https://github.com) with this code pushed
3. External PostgreSQL (recommended: [Neon](https://neon.tech) or [Supabase](https://supabase.com))

---

## Step 1: Set Up External PostgreSQL (Free)

### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb`)

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database → Connection String
4. Copy the URI connection string

---

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app/new)
2. Click **"Empty Project"**
3. Name your project (e.g., "thingbase")

---

## Step 3: Deploy EMQX MQTT Broker

EMQX provides dynamic device authentication via HTTP backend.

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Select your repository
4. Configure the service:
   - **Root Directory**: `infra/emqx`
   - **Builder**: Dockerfile

5. Add Environment Variables:
   ```
   THINGBASE_API_URL=https://${{API.RAILWAY_PUBLIC_DOMAIN}}
   EMQX_DASHBOARD_PASSWORD=<strong-password>
   EMQX_NODE_COOKIE=<random-secret-string>
   ```

6. Configure Networking:
   - Generate a public domain for dashboard access
   - Add **TCP Proxy** for port `1883` (MQTT)
   - Note the TCP endpoint (e.g., `region.proxy.rlwy.net:12345`)

See [infra/emqx/DEPLOYMENT_GUIDE.md](../infra/emqx/DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## Step 4: Deploy Redis

1. Click **"+ New"** → **"Database"** → **"Redis"**
2. Railway will provision a managed Redis instance
3. Note the URL: Use `${{Redis.REDIS_URL}}` in environment variables

---

## Step 5: Deploy API Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. In the service settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: (leave empty, uses Dockerfile)
   - **Start Command**: (leave empty, uses Dockerfile)

4. Add Environment Variables:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=<your-neon-or-supabase-connection-string>
REDIS_URL=${{Redis.REDIS_URL}}

### MQTT Broker (EMQX Cloud)

Configuring for EMQX Cloud Serverless/Dedicated:

- `MQTT_URL`: `mqtts://<your-cluster>.emqxsl.com:8883`
- `MQTT_USERNAME`: `iot-service` (Created in EMQX Console)
- `MQTT_PASSWORD`: `<your-password>`
- `MQTT_DEVICE_USERNAME`: `device` (Shared credential for all devices)
- `MQTT_DEVICE_PASSWORD`: `<device-password>`

### System Credentials

- `MQTT_API_USERNAME`: `iot-service`
- `MQTT_API_PASSWORD`: `<your-password>`
- `MQTT_SIMULATOR_USERNAME`: `iot-simulator`
- `MQTT_SIMULATOR_PASSWORD`: `<your-password>`
JWT_SECRET=<generate-a-strong-32-char-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://${{Web.RAILWAY_PUBLIC_DOMAIN}}
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=ThingBase <noreply@yourdomain.com>
FRONTEND_URL=https://${{Web.RAILWAY_PUBLIC_DOMAIN}}
```

5. Set up a custom domain or use the Railway-provided domain

---

## Step 6: Deploy Web Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select the same repository
3. In the service settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: (leave empty, uses Dockerfile)

4. Add Environment Variables:

```
NEXT_PUBLIC_API_URL=https://${{API.RAILWAY_PUBLIC_DOMAIN}}/api/v1
NEXT_PUBLIC_MQTT_BROKER_URL=mqtt://<EMQX-TCP-PROXY-HOST>:<PORT>
```

5. Generate a public domain for the web service

---

## Step 7: Database Migrations

### Option A: Automatic via CI/CD (Recommended)

Database migrations are handled automatically by GitHub Actions when you push to `main`:

1. **Add GitHub Secret** (Settings → Secrets → Actions):
   - `DATABASE_URL`: Your external PostgreSQL connection string

2. **Push to main** - The CI/CD pipeline will:
   - ✅ Build all packages
   - ✅ Run migrations (`prisma db push`)
   - ✅ Railway auto-deploys via GitHub integration (no token needed)

### Option B: Container Startup Migration

Set the `RUN_MIGRATIONS=true` environment variable on the API service:

```
RUN_MIGRATIONS=true
```

The container will run `prisma db push` on every startup.

⚠️ **Warning**: Only use this for initial setup or when you're sure schema changes are safe.

### Option C: Manual Migration

SSH into the service and run migrations manually:

```bash
# Using Railway CLI
railway run -s api -- npx prisma db push

# Or open a shell
railway shell -s api
npx prisma db push
```

### Migration Best Practices

1. **Always test migrations locally first** before pushing to main
2. **Use `db:push` for development** - syncs schema without migration history
3. **For production with migration history**, use:
   ```bash
   pnpm --filter=@thingbase/api db:migrate
   ```
4. **Check migration status**:
   ```bash
   railway run -s api -- npx prisma migrate status
   ```

---

## Step 8: Verify Deployment

1. **API Health Check**: `https://your-api.railway.app/api/health`
2. **API Docs**: `https://your-api.railway.app/api/docs`
3. **Web App**: `https://your-web.railway.app`
4. **EMQX Dashboard**: `https://your-emqx.railway.app:18083` (admin / your password)

---

## Environment Variable Reference

### API Service

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | API port | `3001` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `${{Redis.REDIS_URL}}` |
| `MQTT_URL` | MQTT broker URL | `mqtt://region.proxy.rlwy.net:12345` |
| `MQTT_API_USERNAME` | System MQTT username | `iot-api` |
| `MQTT_API_PASSWORD` | System MQTT password | Strong password |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Random string |
| `CORS_ORIGIN` | Allowed origins | `https://web.railway.app` |
| `RESEND_API_KEY` | Email service key | `re_xxx` |
| `FRONTEND_URL` | Frontend URL for emails | `https://web.railway.app` |

### Web Service

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.railway.app/api/v1` |
| `NEXT_PUBLIC_MQTT_BROKER_URL` | MQTT broker for display | `mqtt://region.proxy.rlwy.net:12345` |

### EMQX Service

| Variable | Description | Example |
|----------|-------------|---------|
| `THINGBASE_API_URL` | API URL for HTTP auth | `https://api.railway.app` |
| `EMQX_DASHBOARD_PASSWORD` | Dashboard login password | Strong password |
| `EMQX_NODE_COOKIE` | Cluster security cookie | Random string |

---

## Cost Estimation (Hobby Plan)

| Service | Est. RAM | Est. vCPU | Est. Cost |
|---------|----------|-----------|-----------|
| API | 256-512MB | 0.25-0.5 | ~$2/mo |
| Web | 128-256MB | 0.1-0.25 | ~$1/mo |
| Redis | 64-128MB | 0.1 | ~$0.50/mo |
| EMQX | 128-256MB | 0.2 | ~$1/mo |
| **Total** | | | **~$4-5/mo** |

✅ Fits within the $5 included credits!

---

## Troubleshooting

### Build Fails
- Check the build logs in Railway dashboard
- Ensure `pnpm-lock.yaml` is committed
- Verify Dockerfile paths are correct

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if database allows external connections
- For Neon: Ensure connection pooling is enabled

### CORS Errors
- Update `CORS_ORIGIN` to include the web domain
- Ensure protocol (https://) is included

### MQTT Connection Issues (rc=5)
- Ensure device credentials exist in database
- Check EMQX logs: `railway logs -s emqx`
- Verify `THINGBASE_API_URL` points to your API
- Test auth endpoint: `curl -X POST https://api.railway.app/api/v1/mqtt/auth -H "Content-Type: application/json" -d '{"username":"iot-api","password":"your-password"}'`

### EMQX Can't Reach API
- Ensure API is deployed and healthy
- Verify `THINGBASE_API_URL` uses HTTPS
- Check API is accessible externally

---

## Useful Railway CLI Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run -s api -- npx prisma db push

# View logs
railway logs -s api
railway logs -s emqx

# Open shell
railway shell -s api
```

---

## Production Checklist

- [ ] External PostgreSQL set up (Neon/Supabase)
- [ ] EMQX deployed with HTTP auth configured
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] MQTT authentication tested
- [ ] Custom domains configured (optional)
- [ ] SSL/TLS enabled (automatic on Railway)
- [ ] Monitoring set up (Railway dashboard)
- [ ] Backup strategy for external database
