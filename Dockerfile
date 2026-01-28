# MVP Optimized Dockerfile
# Optimized for t3.micro resources and cost efficiency

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install pnpm for better performance
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with optimizations for production
RUN pnpm install --prod --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files and install all dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy source code and build script
COPY . .

# Build arguments for environment variables
ARG RESEND_API_KEY
ARG AUTH_SECRET
ARG AUTH_URL
ARG DATABASE_URL
ARG RESEND_FROM_EMAIL
ARG AUTH_GOOGLE_ID
ARG AUTH_GOOGLE_SECRET
ARG AUTH_FACEBOOK_ID
ARG AUTH_FACEBOOK_SECRET
ARG NEXT_PUBLIC_DEMO_PASSWORD
ARG CRON_SECRET
ARG REDIS_HOST
ARG REDIS_PORT
ARG REDIS_PASSWORD
ARG CLOUDFLARE_ZONE_ID
ARG CLOUDFLARE_API_TOKEN
ARG CLOUDFLARE_DOMAIN

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Enable standalone output for Docker build
ENV ENABLE_STANDALONE=true
# Use ARG for DATABASE_URL with fallback to placeholder
ENV DATABASE_URL=${DATABASE_URL:-"postgresql://placeholder:placeholder@localhost:5432/placeholder"}
ENV NODE_OPTIONS="--max-old-space-size=2048"
# Pass build args as environment variables
ENV AUTH_SECRET=${AUTH_SECRET}
ENV AUTH_URL=${AUTH_URL}
ENV RESEND_API_KEY=${RESEND_API_KEY}
ENV RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}
ENV AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
ENV AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
ENV AUTH_FACEBOOK_ID=${AUTH_FACEBOOK_ID}
ENV AUTH_FACEBOOK_SECRET=${AUTH_FACEBOOK_SECRET}
ENV NEXT_PUBLIC_DEMO_PASSWORD=${NEXT_PUBLIC_DEMO_PASSWORD}
ENV CRON_SECRET=${CRON_SECRET}
ENV REDIS_HOST=${REDIS_HOST:-"localhost"}
ENV REDIS_PORT=${REDIS_PORT:-"6379"}
ENV REDIS_PASSWORD=${REDIS_PASSWORD}
ENV CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID}
ENV CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
ENV CLOUDFLARE_DOMAIN=${CLOUDFLARE_DOMAIN}

# Generate Prisma Client and build
RUN pnpm prisma generate
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built Next.js application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Set proper permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Environment variables optimized for t3.micro
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Optimize Node.js for limited memory (t3.micro has 1GB)
ENV NODE_OPTIONS="--max-old-space-size=768"

# Expose port
EXPOSE 3000

# Health check for ALB
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling in containers
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]