#!/bin/bash

# Build script for Docker with proper environment setup

set -e

echo "🔧 Setting up build environment..."

# Set production environment for Prisma
export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

echo "📦 Generating Prisma client..."
pnpm prisma generate

echo "🏗️ Building Next.js application..."
pnpm run build

echo "✅ Build completed successfully!"