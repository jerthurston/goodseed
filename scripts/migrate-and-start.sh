#!/bin/bash
# scripts/migrate-and-start.sh
# Production startup script with automatic migration

set -e

echo "🚀 Starting GoodSeed production deployment..."

# Run database migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

# Check migration status
echo "✅ Checking migration status..."
npx prisma migrate status

# Generate Prisma client (if needed)
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Database setup completed successfully!"

# Start the application
echo "🚀 Starting Next.js application..."
exec node server.js