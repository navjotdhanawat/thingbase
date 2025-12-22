#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Run Prisma migrations (or db push for simpler setup)
# For production migrations: npx prisma migrate deploy
# For development/simple setup: npx prisma db push
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "📦 Applying database schema..."
  npx prisma db push --accept-data-loss=false
  echo "✅ Database schema applied successfully!"
fi

echo "🚀 Starting ThingBase API..."
exec "$@"
