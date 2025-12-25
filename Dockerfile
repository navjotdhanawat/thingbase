# ============================================
# ThingBase API - Production Dockerfile
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build shared package first, then API
RUN pnpm build --filter=@thingbase/shared
RUN pnpm build --filter=@thingbase/api

# Generate Prisma client
RUN cd apps/api && pnpm db:generate

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm in runner (needed for pnpm's symlink resolution)
RUN npm install -g pnpm@9

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy workspace files for pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

WORKDIR /app/apps/api

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the API
CMD ["node", "dist/main.js"]
