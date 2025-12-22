# IoT SaaS Platform

A multi-tenant IoT SaaS platform for device management and real-time control.

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and pub/sub
- **Prisma** - ORM
- **JWT** - Authentication

### Frontend
- **Next.js 16** - React framework (App Router)
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form + Zod** - Forms and validation

### Infrastructure
- **Docker Compose** - Local development
- **Turborepo** - Monorepo management
- **pnpm** - Package manager

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Colima (on macOS) or Docker Desktop

### Setup

1. **Clone and install dependencies:**

```bash
pnpm install
```

2. **Start infrastructure:**

```bash
docker compose up -d
```

3. **Set up SSH tunnel (if using Colima):**

If Docker port forwarding doesn't work (common with Colima on macOS):

```bash
chmod +x scripts/dev-tunnel.sh
./scripts/dev-tunnel.sh
```

4. **Configure environment:**

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database connection
```

5. **Push database schema:**

```bash
pnpm --filter @repo/api db:push
```

6. **Start development servers:**

```bash
# In separate terminals:
pnpm --filter @repo/api dev    # API on http://localhost:3001
pnpm --filter @repo/web dev    # Web on http://localhost:3000
```

## Project Structure

```
iot-saas/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/       # JWT authentication
│   │   │   │   ├── tenants/    # Tenant management
│   │   │   │   ├── users/      # User management
│   │   │   │   ├── devices/    # Device management
│   │   │   │   └── health/     # Health checks
│   │   │   ├── common/         # Guards, decorators, pipes
│   │   │   ├── prisma/         # Database service
│   │   │   └── redis/          # Redis service
│   │   └── prisma/             # Schema and migrations
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI components
│           ├── lib/            # Utilities
│           ├── stores/         # Zustand stores
│           └── providers/      # React providers
├── packages/
│   └── shared/                 # Shared types, schemas, constants
└── docker-compose.yml          # Development infrastructure
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register tenant + admin
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/me` - Get current user

### Tenant
- `GET /api/tenant` - Get current tenant
- `GET /api/tenant/stats` - Get tenant stats
- `PATCH /api/tenant` - Update tenant (admin)

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user (admin)
- `POST /api/users/invite` - Invite user (admin)
- `PATCH /api/users/:id` - Update user (admin)
- `DELETE /api/users/:id` - Delete user (admin)

### Devices
- `GET /api/devices` - List devices
- `GET /api/devices/:id` - Get device
- `GET /api/devices/:id/state` - Get device state
- `POST /api/devices` - Create device (admin)
- `POST /api/devices/:id/provision` - Generate provision token (admin)
- `POST /api/devices/:id/activate` - Activate device (public)
- `PATCH /api/devices/:id` - Update device (admin)
- `DELETE /api/devices/:id` - Delete device (admin)

## Development

### Database Operations

```bash
# Generate Prisma client
pnpm --filter @repo/api db:generate

# Push schema to database
pnpm --filter @repo/api db:push

# Create migration
pnpm --filter @repo/api db:migrate

# Open Prisma Studio
pnpm --filter @repo/api db:studio
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @repo/api build
pnpm --filter @repo/web build
```

## Phase Roadmap

### Phase 1A: Foundation ✅
- Monorepo setup with Turborepo
- Shared schemas with Zod
- Docker Compose for Postgres + Redis
- NestJS API scaffold with Prisma

### Phase 1B: Auth & Multi-Tenancy ✅
- JWT authentication
- Tenant registration
- RBAC guards
- User management

### Phase 2: Device Management & Web UI ✅
- Device CRUD APIs
- Device provisioning
- Next.js web app
- Dashboard, devices, users pages

### Phase 3: MQTT & Real-Time ✅
- Mosquitto MQTT broker
- MQTT handlers for telemetry/acks
- Command lifecycle tracking
- WebSocket for real-time updates
- Device simulator CLI

### Phase 4: Production Readiness (Next)
- MQTT over TLS
- Rate limiting
- Audit logging
- Error tracking

## License

MIT

