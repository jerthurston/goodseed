# Multi-stage Dockerfile for GoodSeed Next.js App

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

EXPOSE 3000

CMD ["pnpm", "dev"]
