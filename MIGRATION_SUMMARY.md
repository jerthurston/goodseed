# Summary: Complete NEXTAUTH_URL Removal

## What Changed?

**Completely removed `NEXTAUTH_URL`** from entire codebase and replaced with `AUTH_URL` (Auth.js v5 standard).

## Files Modified

### Code Files
- ✅ `lib/api.ts` - Uses `AUTH_URL` only
- ✅ `lib/cron.ts` - Uses `AUTH_URL` only

### Infrastructure
- ✅ `Dockerfile` - Removed NEXTAUTH_URL build arg & env var
- ✅ `.github/workflows/deploy.yml` - Removed NEXTAUTH_URL from build-args and inject step
- ✅ `infrastructure/inject-secrets-to-task-definition.js` - Removed NEXTAUTH_URL, added AUTH_TRUST_HOST
- ✅ `infrastructure/ecs-task-definition.json` - Replaced NEXTAUTH_URL with AUTH_TRUST_HOST

### Configuration
- ✅ `.env.development` - Already has AUTH_URL, NEXTAUTH_URL commented out
- ✅ `.env.production` - Removed NEXTAUTH_URL

### Documentation
- ✅ `docs/migration-nextauth-url-to-auth-url.md` - Updated to reflect complete removal
- ✅ `docs/fix-auth-untrusted-host.md` - Already explains AUTH_URL requirement

## Required GitHub Secret

```
AUTH_URL=https://lembooking.com
```

## Next Steps

1. ✅ Verify GitHub Secret `AUTH_URL` exists
2. ✅ Commit and push changes
3. ✅ Deploy to ECS
4. ✅ Verify OAuth works (no UntrustedHost error)
5. ✅ Monitor CloudWatch logs for AUTH_URL value

## Validation Commands

```bash
# Check all NEXTAUTH_URL references (should find only in docs/comments)
git grep -n "NEXTAUTH_URL"

# Check AUTH_URL is used correctly
git grep -n "AUTH_URL"

# Check inject script has correct vars
cat infrastructure/inject-secrets-to-task-definition.js | grep -A5 "ENV_VARS"
```

## Why This Approach?

1. **Clean migration** - No confusion between NEXTAUTH_URL and AUTH_URL
2. **Auth.js v5 standard** - Follows official documentation
3. **Fixes UntrustedHost error** - AUTH_URL + AUTH_TRUST_HOST required for production
4. **Consistent** - One variable for one purpose across all environments

## Commit Message

```
fix: migrate from NEXTAUTH_URL to AUTH_URL for Auth.js v5 compliance

- Remove all NEXTAUTH_URL references from code and infrastructure
- Add AUTH_URL and AUTH_TRUST_HOST to all configs
- Update lib/api.ts and lib/cron.ts to use AUTH_URL
- Update Dockerfile, workflow, and task definitions
- Fixes UntrustedHost error in production (AWS ECS)

BREAKING CHANGE: NEXTAUTH_URL no longer supported, use AUTH_URL instead
```
