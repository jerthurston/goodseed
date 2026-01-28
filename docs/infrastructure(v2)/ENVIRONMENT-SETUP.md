# Environment Configuration Guide

## Overview

This document provides detailed information about configuring environment variables for the GoodSeed Cannabis App across different environments (development, preview, production).

---

## Table of Contents

1. [Environment Types](#environment-types)
2. [Required Variables](#required-variables)
3. [Optional Variables](#optional-variables)
4. [Service-Specific Configuration](#service-specific-configuration)
5. [Security Best Practices](#security-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Environment Types

### Development (.env.local)
```bash
# For local development
# File: .env.local (not committed to Git)
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/goodseed_db
NEXTAUTH_URL=http://localhost:3000
```

### Preview (Vercel Preview Deployments)
```bash
# Auto-created for each PR
# Managed in Vercel Dashboard
NODE_ENV=preview
DATABASE_URL=[Neon preview branch]
NEXTAUTH_URL=[auto-generated preview URL]
```

### Production (Vercel Production)
```bash
# Live application
# Managed in Vercel Dashboard
NODE_ENV=production
DATABASE_URL=[Neon production database]
NEXTAUTH_URL=[production domain]
```

---

## Required Variables

### Database Configuration

#### DATABASE_URL
**Purpose**: Main PostgreSQL connection string (pooled)

**Format**:
```bash
# Neon (Production)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# Local Development
DATABASE_URL="postgresql://postgres:password@localhost:5432/goodseed_db"
```

**Notes**:
- Must include `?sslmode=require` for Neon
- Use pooled connection for application queries
- Prisma uses this by default

#### DIRECT_URL
**Purpose**: Direct PostgreSQL connection (for migrations)

**Format**:
```bash
# Same as DATABASE_URL but direct connection
DIRECT_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

**Notes**:
- Required for running migrations
- Not pooled (direct database connection)
- Use same credentials as DATABASE_URL

**How to Get**:
1. Go to Neon Console → Your Project
2. Connection Details → "Direct connection"
3. Copy the connection string

---

### Redis Configuration

#### REDIS_HOST
**Purpose**: Upstash Redis hostname

**Format**:
```bash
# Production (Upstash)
REDIS_HOST="eager-mantis-12345.upstash.io"

# Local Development
REDIS_HOST="localhost"
```

**How to Get**:
1. Upstash Console → Your Database
2. Details → Endpoint
3. Copy hostname (without port)

#### REDIS_PORT
**Purpose**: Redis port number

**Format**:
```bash
REDIS_PORT="6379"
```

**Notes**:
- Standard Redis port is 6379
- Same for both Upstash and local

#### REDIS_PASSWORD
**Purpose**: Redis authentication password

**Format**:
```bash
# Production (Upstash)
REDIS_PASSWORD="AYG4MTk1Y2QtYmI2OC00YWRjLTk1YTktMTcwZTA1MWNhNmZh"

# Local Development (if password protected)
REDIS_PASSWORD="your-local-redis-password"
```

**How to Get**:
1. Upstash Console → Your Database
2. Details → Password
3. Copy password

**Security**:
- Never commit this to Git
- Rotate regularly
- Different passwords for each environment

---

### Authentication Configuration

#### NEXTAUTH_URL / AUTH_URL
**Purpose**: Base URL of your application

**Format**:
```bash
# Production
NEXTAUTH_URL="https://goodseed.lembooking.com"
AUTH_URL="https://goodseed.lembooking.com"

# Vercel auto-assigned
NEXTAUTH_URL="https://goodseed-app-vercel.vercel.app"
AUTH_URL="https://goodseed-app-vercel.vercel.app"

# Local Development
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"
```

**Notes**:
- Both NEXTAUTH_URL and AUTH_URL should have same value
- Must be HTTPS in production (except localhost)
- Update when using custom domain
- Include protocol (https:// or http://)
- No trailing slash

#### NEXTAUTH_SECRET / AUTH_SECRET
**Purpose**: Encryption key for sessions and tokens

**Format**:
```bash
NEXTAUTH_SECRET="sJ/Yha7xT9HWDPDMsVG/N+kcDlsKvqEg2+gvmMU1K3s="
AUTH_SECRET="sJ/Yha7xT9HWDPDMsVG/N+kcDlsKvqEg2+gvmMU1K3s="
```

**How to Generate**:
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Online (not recommended for production):
# https://generate-secret.vercel.app/32
```

**Security**:
- Generate unique secret for each environment
- Never reuse between dev/staging/production
- Store securely
- Rotate periodically (requires re-authentication of all users)

#### AUTH_TRUST_HOST
**Purpose**: Trust reverse proxy host headers

**Format**:
```bash
AUTH_TRUST_HOST=true
```

**Notes**:
- Set to `true` when using Vercel (behind reverse proxy)
- Required for NextAuth.js to work correctly
- Safe to enable in production with Vercel

---

### Email Configuration (Resend)

#### RESEND_API_KEY
**Purpose**: Resend API authentication key

**Format**:
```bash
RESEND_API_KEY="re_Hvt7XKUt_Jm5FDLBh4mzDRvUdGUvAQqCa"
```

**How to Get**:
1. Resend Dashboard → API Keys
2. Create API Key
3. Copy key (shown only once!)

**Security**:
- Never expose in client-side code
- Only use in server-side API routes
- Rotate if compromised

#### RESEND_FROM_EMAIL
**Purpose**: Sender email address

**Format**:
```bash
# Verified domain (production)
RESEND_FROM_EMAIL="noreply@lembooking.com"

# Resend test email (development)
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

**Notes**:
- Must verify domain in Resend for custom email
- Use test email for development
- Format: `Name <email@domain.com>` or just `email@domain.com`

---

### Security Configuration

#### CRON_SECRET
**Purpose**: Authenticate cron job requests

**Format**:
```bash
CRON_SECRET="adVG2ceJ6RC97xEsd7boFjUZv74aykNEai/Jg5sHgQA="
```

**How to Generate**:
```bash
openssl rand -base64 32
```

**Usage**:
```typescript
// In cron API route
const secret = request.nextUrl.searchParams.get('secret');
if (secret !== process.env.CRON_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Security**:
- Different secret for each environment
- Never expose in client-side code
- Include in cron job URLs: `/api/cron/trigger?secret=YOUR_SECRET`

---

## Optional Variables

### OAuth Providers

#### Google OAuth
```bash
AUTH_GOOGLE_ID="395770100821-xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxxxxxxxxxx"
```

**How to Get**:
1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`

#### Facebook OAuth
```bash
AUTH_FACEBOOK_ID="1827193591292370"
AUTH_FACEBOOK_SECRET="9896f70e7551196b87a57ba92d694cde"
```

**How to Get**:
1. Meta for Developers → My Apps
2. Create new app
3. Add Facebook Login product
4. Valid OAuth Redirect URIs: `https://your-domain.com/api/auth/callback/facebook`

---

### Monitoring & Error Tracking

#### Sentry
```bash
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_ORG="your-organization"
SENTRY_PROJECT="goodseed-app"
SENTRY_AUTH_TOKEN="sntrys_xxxxxxxxxxxxx"
```

**How to Get**:
1. Sentry Dashboard → Settings → Projects → Your Project
2. Client Keys (DSN)
3. Copy DSN

**Notes**:
- Different DSN for each environment (dev/staging/production)
- SENTRY_AUTH_TOKEN only needed for source maps upload

---

### Worker Configuration

#### WORKER_HEALTH_URL
```bash
# Render worker
WORKER_HEALTH_URL="https://goodseed-worker.onrender.com/health"

# Railway worker
WORKER_HEALTH_URL="https://goodseed-worker.railway.app/health"
```

**Purpose**: Health check endpoint for background worker

**Notes**:
- Only needed if using separate worker service
- Used to keep worker alive (prevent auto-sleep)

#### SCRAPER_VERBOSE
```bash
# Development (detailed logs)
SCRAPER_VERBOSE=true

# Production (optimized logs)
SCRAPER_VERBOSE=false
```

**Purpose**: Enable/disable verbose scraper logging

**Notes**:
- `true`: Detailed debug logs (slower, helpful for debugging)
- `false`: Production logs only (faster, less verbose)

---

### Feature Flags

#### NEXT_PUBLIC_DEMO_PASSWORD
```bash
NEXT_PUBLIC_DEMO_PASSWORD="goodseed2026"
```

**Purpose**: Password protection for demo site

**Notes**:
- Prefix `NEXT_PUBLIC_` makes it available to client-side
- Optional, for demo environments only
- Remove for production

---

## Service-Specific Configuration

### Neon PostgreSQL

**Connection String Anatomy**:
```
postgresql://[user]:[password]@[host]/[database]?[parameters]

Example:
postgresql://neondb_owner:npg_P1dSlcLX9WNF@ep-dark-haze-ae148zgh-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Parameters**:
- `sslmode=require`: Force SSL connection (required for Neon)
- `channel_binding=require`: Additional security (optional)
- `pool_timeout=30`: Connection pool timeout
- `connect_timeout=30`: Connection timeout

**Environment-Specific Setup**:

```bash
# Development (local PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/goodseed_db"
DIRECT_URL="postgresql://postgres:password@localhost:5432/goodseed_db"

# Preview (Neon branch)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/preview_branch?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/preview_branch?sslmode=require"

# Production (Neon main)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

---

### Upstash Redis

**Connection Options**:

**Option 1: Traditional Redis (ioredis)**
```bash
REDIS_HOST="eager-mantis-12345.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="AYG4MTk1Y2QtYmI2OC00YWRjLTk1YTktMTcwZTA1MWNhNmZh"
```

**Option 2: REST API (serverless-friendly)**
```bash
UPSTASH_REDIS_REST_URL="https://eager-mantis-12345.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AYG4MTk1Y2QtYmI2OC00YWRjLTk1YTktMTcwZTA1MWNhNmZh"
```

**When to Use Each**:
- **Traditional**: Better for persistent connections (worker services)
- **REST API**: Better for serverless functions (no connection pooling issues)

**Configuration in Code**:
```typescript
// Traditional (ioredis)
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
  tls: {}, // Required for Upstash
});

// REST API (@upstash/redis)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

---

### Resend Email

**Domain Setup**:

1. **Add Domain**:
   - Resend Dashboard → Domains → Add Domain
   - Enter: `lembooking.com`

2. **Add DNS Records**:
```bash
# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all

# DKIM Record (provided by Resend)
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]

# DMARC Record
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@lembooking.com
```

3. **Verify Domain**:
   - Wait 5-30 minutes for DNS propagation
   - Resend will automatically verify

4. **Update Environment**:
```bash
RESEND_FROM_EMAIL="noreply@lembooking.com"
# or with name
RESEND_FROM_EMAIL="GoodSeed <noreply@lembooking.com>"
```

---

## Security Best Practices

### 1. Never Commit Secrets to Git

**Create .env.local**:
```bash
# Copy template
cp .env.example .env.local

# Edit with your values
# .env.local is in .gitignore
```

**What to Commit**:
- ✅ `.env.example` (template with dummy values)
- ❌ `.env.local` (actual secrets)
- ❌ `.env.production` (production secrets)

### 2. Use Different Secrets Per Environment

```bash
# Development
NEXTAUTH_SECRET="dev_secret_xxx"
DATABASE_URL="postgresql://localhost:5432/dev_db"

# Production
NEXTAUTH_SECRET="prod_secret_yyy"
DATABASE_URL="postgresql://ep-xxx.neon.tech/prod_db"
```

### 3. Rotate Secrets Regularly

**Rotation Schedule**:
- **Critical** (AUTH_SECRET, API keys): Every 90 days
- **Important** (Database passwords): Every 180 days
- **Standard** (CRON_SECRET): Every 365 days

**Rotation Process**:
1. Generate new secret
2. Update in all environments
3. Deploy/restart services
4. Verify everything works
5. Invalidate old secret

### 4. Principle of Least Privilege

```bash
# Database user: Only needed permissions
# Not: SUPERUSER
# Yes: READ, WRITE on specific tables

# API Keys: Minimum scope
# Not: Full access
# Yes: Only required operations
```

### 5. Encrypt Sensitive Variables

**Vercel** (automatic):
- All environment variables encrypted at rest
- Encrypted in transit
- Only decrypted at runtime

**Local Development**:
```bash
# Use tools like:
- git-crypt
- SOPS (Secrets OPerationS)
- HashiCorp Vault
```

---

## Environment Variable Checklist

### Development Setup
- [ ] Create `.env.local` from `.env.example`
- [ ] Set DATABASE_URL to local PostgreSQL
- [ ] Set REDIS_HOST to localhost (or skip if not using)
- [ ] Generate NEXTAUTH_SECRET
- [ ] Set NEXTAUTH_URL to http://localhost:3000
- [ ] Add Resend test API key (optional)

### Vercel Production Setup
- [ ] Add DATABASE_URL (Neon pooled connection)
- [ ] Add DIRECT_URL (Neon direct connection)
- [ ] Add REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (Upstash)
- [ ] Generate and add NEXTAUTH_SECRET
- [ ] Set NEXTAUTH_URL to production domain
- [ ] Add RESEND_API_KEY
- [ ] Add RESEND_FROM_EMAIL (verified domain)
- [ ] Generate and add CRON_SECRET
- [ ] Add OAuth provider credentials (optional)
- [ ] Add Sentry credentials (optional)
- [ ] Set NODE_ENV to production
- [ ] Set AUTH_TRUST_HOST to true

### Worker Service Setup (if using)
- [ ] Same environment variables as Vercel
- [ ] Add WORKER_HEALTH_URL in Vercel
- [ ] Verify worker can connect to database
- [ ] Verify worker can connect to Redis

---

## Troubleshooting

### Issue: "Cannot find environment variable DATABASE_URL"

**Cause**: Environment variable not set or not loaded

**Solutions**:
```bash
# Verify .env.local exists
ls -la .env.local

# Check variable is set
echo $DATABASE_URL

# For Prisma commands, use dotenv:
npx dotenv -e .env.local -- npx prisma generate

# Or export manually:
export DATABASE_URL="postgresql://..."
npx prisma generate
```

### Issue: "Database connection failed"

**Causes & Solutions**:

1. **Wrong connection string**:
```bash
# Verify format
postgresql://user:password@host/database?sslmode=require
#          ^^^^          ^^^^  ^^^^    ^^ Required for Neon
```

2. **Database paused** (Neon auto-suspends):
```bash
# Solution: First connection wakes it up (may take 5-10 seconds)
# Or disable auto-suspend in Neon settings
```

3. **SSL/TLS issue**:
```bash
# Add to connection string:
?sslmode=require

# For Neon specifically:
?sslmode=require&channel_binding=require
```

### Issue: "Redis connection timeout"

**Causes & Solutions**:

1. **Wrong host/port/password**:
```bash
# Verify in Upstash console
# Check for typos
```

2. **TLS not enabled**:
```typescript
// Upstash requires TLS
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD,
  tls: {}, // ← Required!
});
```

3. **Firewall/network issue**:
```bash
# Test connection:
curl https://your-redis-host.upstash.io/ping
```

### Issue: "Email not sending"

**Causes & Solutions**:

1. **Wrong API key**:
```bash
# Verify in Resend dashboard
# Regenerate if needed
```

2. **Domain not verified**:
```bash
# Check domain status in Resend
# Wait for DNS propagation (up to 48 hours)
# Use onboarding@resend.dev for testing
```

3. **Rate limit exceeded**:
```bash
# Check Resend dashboard for limits
# Free tier: 100/day
# Upgrade plan if needed
```

### Issue: "NextAuth callback URL mismatch"

**Cause**: NEXTAUTH_URL doesn't match actual URL

**Solution**:
```bash
# Development
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://goodseed.lembooking.com

# Update OAuth provider callback URLs:
# https://goodseed.lembooking.com/api/auth/callback/google
# https://goodseed.lembooking.com/api/auth/callback/facebook
```

---

## Environment Variables Template

### Complete .env.example
```bash
# ==================================
# ENVIRONMENT CONFIGURATION TEMPLATE
# ==================================
# Copy this to .env.local and fill in actual values
# NEVER commit .env.local to Git

# ===== DATABASE =====
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host/database?sslmode=require"

# ===== REDIS =====
REDIS_HOST="your-redis-host.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"

# ===== AUTHENTICATION =====
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_TRUST_HOST="true"

# ===== EMAIL (Resend) =====
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# ===== OAUTH PROVIDERS (Optional) =====
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxxxxxxxxxx"
AUTH_FACEBOOK_ID="your-facebook-app-id"
AUTH_FACEBOOK_SECRET="your-facebook-app-secret"

# ===== SECURITY =====
CRON_SECRET="generate-with-openssl-rand-base64-32"

# ===== MONITORING (Optional) =====
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_ORG="your-organization"
SENTRY_PROJECT="your-project"

# ===== WORKER (Optional) =====
WORKER_HEALTH_URL="https://your-worker.onrender.com/health"

# ===== FEATURES =====
SCRAPER_VERBOSE="false"
NODE_ENV="development"

# ===== DEMO (Optional) =====
NEXT_PUBLIC_DEMO_PASSWORD="your-demo-password"
```

---

## Quick Reference

### Generate Secrets
```bash
# NEXTAUTH_SECRET, AUTH_SECRET, CRON_SECRET
openssl rand -base64 32
```

### Test Database Connection
```bash
npx prisma db push
```

### Test Redis Connection
```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

### Verify Environment Variables
```bash
# In Node.js
node -e "console.log(process.env.DATABASE_URL)"

# In Vercel build logs
# Check "Environment Variables" section
```

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)
- [Neon Database Setup](./NEON-DATABASE.md)
- [Upstash Redis Setup](./UPSTASH-REDIS.md)
- [Resend Email Setup](./RESEND-EMAIL.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Last Updated**: 2026-01-28
