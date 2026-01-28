# Production Infrastructure Documentation

## 📚 Documentation Overview

This directory contains comprehensive guides for deploying and operating the GoodSeed Cannabis App in production using modern serverless infrastructure (Vercel + Neon + Upstash + Resend).

**Documentation Version**: 2.0  
**Last Updated**: January 28, 2026  
**Target Infrastructure**: Vercel, Neon PostgreSQL, Upstash Redis, Resend Email

---

## 🎯 Quick Navigation

### 🏗️ **Architecture & Design**
Start here to understand the system design and technology choices.

#### [ARCHITECTURE.md](./ARCHITECTURE.md) - System Architecture
**Complete system architecture and design principles**
- System architecture diagram
- Component breakdown (Frontend, Backend, Database, Queue, Worker)
- Data flow diagrams
- Technology stack comparison
- Security architecture
- High availability design

**Read this first** to understand how everything fits together.

---

### 🚀 **Deployment & Setup**

#### [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Production Deployment
**Step-by-step deployment guide (2-3 hours)**
- Phase 1: Service setup (Neon, Upstash, Resend, Vercel)
- Phase 2: Database migration
- Phase 3: Application deployment
- Phase 4: Worker deployment (optional)
- Phase 5: Monitoring setup
- Phase 6: Testing & verification
- Complete environment variables reference

**Use this** when deploying to production.

---

#### [ENVIRONMENT-SETUP.md](./ENVIRONMENT-SETUP.md) - Environment Configuration
**Complete environment variables reference**
- Required variables for each service
- Optional features configuration
- Security best practices
- Multi-environment setup (dev, staging, production)
- Troubleshooting configuration issues

**Reference this** when configuring services.

---

### ⚙️ **Infrastructure Components**

#### [BACKGROUND-WORKERS.md](./BACKGROUND-WORKERS.md) - Worker Architecture
**Background job processing system**
- Worker architecture design
- Bull Queue configuration
- Job types and handlers
- Deployment options (Render, Railway, Fly.io, AWS ECS)
- Worker monitoring and debugging
- Scaling worker fleet

**Use this** for background job setup.

---

### 📈 **Operations & Maintenance**

#### [SCALING-GUIDE.md](./SCALING-GUIDE.md) - Scaling Infrastructure
**From free tier to enterprise scale**
- Infrastructure tier comparison table
- When to scale each service
- Step-by-step migration procedures
- Performance benchmarks
- Cost optimization strategies
- Scaling checklist

**Use this** when ready to scale beyond free tier.

---

#### [MONITORING.md](./MONITORING.md) - Monitoring & Observability
**Complete monitoring setup**
- Monitoring stack by tier (Free, Production, Enterprise)
- Sentry setup for error tracking
- Vercel Analytics configuration
- Database and Redis monitoring
- Worker health monitoring
- Uptime monitoring setup
- Alerting strategy
- Logging best practices

**Use this** to set up monitoring and alerting.

---

#### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Issue Resolution
**Common issues and solutions**
- Deployment failures
- Database connection issues
- Redis/Queue problems
- Email delivery issues
- Worker crashes
- Authentication problems
- Performance degradation
- Emergency procedures

**Use this** when encountering production issues.

---

## 🗺️ Documentation Roadmap

### For First-Time Deployment

```
1. Read ARCHITECTURE.md
   ↓ Understand the system design
   
2. Follow DEPLOYMENT-GUIDE.md
   ↓ Deploy all services (2-3 hours)
   
3. Configure ENVIRONMENT-SETUP.md
   ↓ Set all environment variables
   
4. Setup BACKGROUND-WORKERS.md (optional)
   ↓ Deploy worker service
   
5. Configure MONITORING.md
   ↓ Setup monitoring and alerts
   
6. Keep TROUBLESHOOTING.md handy
   ↓ Reference when issues arise
```

## 🗺️ Documentation Roadmap

### For First-Time Deployment

```
1. Read ARCHITECTURE.md
   ↓ Understand the system design
   
2. Follow DEPLOYMENT-GUIDE.md
   ↓ Deploy all services (2-3 hours)
   
3. Configure ENVIRONMENT-SETUP.md
   ↓ Set all environment variables
   
4. Setup BACKGROUND-WORKERS.md (optional)
   ↓ Deploy worker service
   
5. Configure MONITORING.md
   ↓ Setup monitoring and alerts
   
6. Keep TROUBLESHOOTING.md handy
   ↓ Reference when issues arise
```

### For Scaling Existing Deployment

```
1. Review SCALING-GUIDE.md
   ↓ Determine when to upgrade
   
2. Follow migration procedures
   ↓ Upgrade services one by one
   
3. Update monitoring
   ↓ Adjust thresholds and alerts
   
4. Verify performance
   ↓ Compare before/after metrics
```

---

## 🎯 Quick Decision Matrix

| Your Situation | Recommended Path |
|----------------|------------------|
| 🆕 **New to the project** | Start with [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 🚀 **Ready to deploy production** | Follow [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) |
| 💰 **Planning free tier demo** | Use free tier in [SCALING-GUIDE.md](./SCALING-GUIDE.md#phase-1-free-tier-mvpdemo) |
| ⚙️ **Need background workers** | Setup [BACKGROUND-WORKERS.md](./BACKGROUND-WORKERS.md) |
| 📈 **Ready to scale** | Review [SCALING-GUIDE.md](./SCALING-GUIDE.md) |
| 📊 **Setup monitoring** | Configure [MONITORING.md](./MONITORING.md) |
| 🐛 **Troubleshooting issues** | Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| 🔧 **Configuring environment** | Reference [ENVIRONMENT-SETUP.md](./ENVIRONMENT-SETUP.md) |

---

## 📊 Infrastructure Tiers Comparison

| Tier | Cost/Month | Best For | Documentation |
|------|------------|----------|---------------|
| **Free Tier** | $0 | Demo, MVP validation, learning | [SCALING-GUIDE.md](./SCALING-GUIDE.md#phase-1-free-tier-mvpdemo) |
| **Starter** | ~$102 | Early customers, small user base | [SCALING-GUIDE.md](./SCALING-GUIDE.md#phase-2-starter-production) |
| **Growth** | ~$368 | Growing business, 1K-10K users | [SCALING-GUIDE.md](./SCALING-GUIDE.md#phase-3-growth-production) |
| **Enterprise** | $1,000+ | Mission-critical, 10K+ users | [SCALING-GUIDE.md](./SCALING-GUIDE.md#phase-4-enterprise-scale) |

---

## 🏗️ Architecture Summary

### Production Stack

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                       │
│  - Global CDN                                                │
│  - DDoS Protection                                           │
│  - Auto-scaling                                              │
└───┬──────────────────────────────────────┬──────────────────┘
    │                                      │
    ▼                                      ▼
┌─────────────────┐              ┌──────────────────┐
│  NEXT.JS APP    │              │   EDGE FUNCTIONS │
│  - SSR/SSG      │              │   - API Routes   │
│  - App Router   │              │   - Middleware   │
│  - React        │              │   - Auth         │
└────┬────────────┘              └────┬─────────────┘
     │                                │
     │    ┌───────────────────────────┤
     │    │                           │
     ▼    ▼                           ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ NEON         │  │ UPSTASH      │  │ RESEND       │
│ PostgreSQL   │  │ Redis        │  │ Email        │
│ - Serverless │  │ - Queue      │  │ - Transactional│
│ - Pooling    │  │ - Cache      │  │ - Marketing  │
│ - Auto-scale │  │ - Pub/Sub    │  │ - Analytics  │
└──────────────┘  └──────┬───────┘  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ WORKER       │
                  │ (Optional)   │
                  │ - Scraping   │
                  │ - Processing │
                  │ - Jobs       │
                  └──────────────┘
```

### Key Features

✅ **Serverless-First**: Pay only for what you use  
✅ **Auto-Scaling**: Handles traffic spikes automatically  
✅ **Global CDN**: Fast response times worldwide  
✅ **Zero Downtime**: Atomic deployments  
✅ **Type-Safe**: TypeScript end-to-end  
✅ **Modern Stack**: Latest Next.js, Prisma, React

---

## � Technology Stack

| Category | Technology | Purpose | Tier |
|----------|-----------|---------|------|
| **Frontend** | Next.js 16, React 19, TypeScript | UI and SSR | - |
| **Hosting** | Vercel | Serverless hosting | Free → $20/mo |
| **Database** | Neon PostgreSQL | Primary data store | Free → $19/mo |
| **ORM** | Prisma 7 | Database toolkit | Free |
| **Cache/Queue** | Upstash Redis | Cache & job queue | Free → $10/mo |
| **Auth** | NextAuth 5 (Auth.js) | Authentication | Free |
| **Email** | Resend | Transactional emails | Free → $20/mo |
| **Worker** | Render/Railway | Background jobs | Free → $7/mo |
| **Monitoring** | Sentry | Error tracking | Free → $26/mo |
| **Analytics** | Vercel Analytics | Performance monitoring | Free |
| **Scraping** | Crawlee, Cheerio | Web scraping | Free |

**Total Cost**: $0/month (Free tier) → $102/month (Production starter)

---

## ⏱️ Time Estimates

| Task | Duration | Description |
|------|----------|-------------|
| **Reading Documentation** | 1-2 hours | Understand architecture and plan |
| **Account Setup** | 30 min | Create accounts on all services |
| **Database Setup** | 30 min | Neon project and migrations |
| **Redis Setup** | 15 min | Upstash database |
| **Email Setup** | 15 min | Resend API and domain |
| **Vercel Deployment** | 30 min | Deploy application |
| **Worker Setup** | 30 min | Optional background worker |
| **Monitoring Setup** | 30 min | Sentry and alerts |
| **Testing** | 30 min | End-to-end validation |
| **TOTAL** | **3-5 hours** | From zero to production |

---

## ✅ Pre-Deployment Checklist

Before starting deployment, ensure you have:

### Accounts
- [ ] GitHub account
- [ ] Vercel account (sign up with GitHub)
- [ ] Neon account (sign up with GitHub)
- [ ] Upstash account (sign up with GitHub)
- [ ] Resend account
- [ ] (Optional) Render/Railway account
- [ ] (Optional) Sentry account

### Local Environment
- [ ] Node.js 20+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Git installed and configured
- [ ] Code editor (VS Code recommended)
- [ ] Terminal/Command line access

### Repository
- [ ] Code pushed to GitHub
- [ ] Branch protection configured (optional)
- [ ] .gitignore properly set

### Knowledge
- [ ] Familiar with Next.js basics
- [ ] Understanding of Prisma ORM
- [ ] Basic PostgreSQL knowledge
- [ ] Redis concepts (cache, queue)

### Time & Resources
- [ ] 3-5 hours available
- [ ] Internet connection stable
- [ ] Credit card ready (for paid tiers, optional)

---

## 🎯 Success Criteria

Your deployment is successful when:

### Functionality
- ✅ Application accessible at production URL
- ✅ User authentication working (all OAuth providers)
- ✅ Database connected and migrations applied
- ✅ Redis queue functional
- ✅ Email delivery working
- ✅ Admin panel accessible
- ✅ API routes responding
- ✅ Background jobs processing (if worker deployed)

### Performance
- ✅ Page load time < 2 seconds
- ✅ API response time < 500ms
- ✅ Core Web Vitals in "Good" range
- ✅ No console errors

### Monitoring
- ✅ Sentry receiving errors (test with intentional error)
- ✅ Vercel Analytics tracking pageviews
- ✅ Uptime monitoring active
- ✅ Alert channels configured

### Documentation
- ✅ Environment variables documented
- ✅ Deployment process documented
- ✅ Team trained on monitoring
- ✅ Incident response plan ready

---

## 🚨 Common Pitfalls & Solutions

### 1. Environment Variables
❌ **Mistake**: Missing or incorrect environment variables  
✅ **Solution**: Use [ENVIRONMENT-SETUP.md](./ENVIRONMENT-SETUP.md) checklist

### 2. Database Connection
❌ **Mistake**: Forgetting `?sslmode=require` in connection string  
✅ **Solution**: Always copy connection string from Neon dashboard

### 3. Redis TLS
❌ **Mistake**: Not enabling TLS for Upstash Redis  
✅ **Solution**: Include `tls: {}` in Redis client configuration

### 4. Prisma Client
❌ **Mistake**: Not generating Prisma client before build  
✅ **Solution**: Add `"postinstall": "prisma generate"` to package.json

### 5. Worker Cold Starts
❌ **Mistake**: Expecting instant worker response on free tier  
✅ **Solution**: Accept 15-30s cold start or upgrade to paid tier

### 6. OAuth Redirect URIs
❌ **Mistake**: Wrong redirect URIs in OAuth providers  
✅ **Solution**: Must match exactly: `https://yourdomain.com/api/auth/callback/[provider]`

### 7. Cron Jobs
❌ **Mistake**: Trying to use Vercel cron on Hobby tier  
✅ **Solution**: Upgrade to Pro or use external cron service

### 8. Email Spam
❌ **Mistake**: Emails going to spam folder  
✅ **Solution**: Verify domain with SPF/DKIM/DMARC records

---

## 📈 Performance Expectations

### Free Tier Performance

| Metric | Expected Value | Notes |
|--------|---------------|-------|
| **Page Load Time** | < 2 seconds | With edge caching |
| **API Response** | < 500ms | Simple queries |
| **TTFB** | < 800ms | Time to first byte |
| **Database Query** | < 200ms | With proper indexes |
| **Worker Cold Start** | 15-30 seconds | Free tier auto-sleep |
| **Worker Warm** | < 5 seconds | Already running |
| **Scraping Speed** | 5-10 products/min | Rate-limited |
| **Concurrent Users** | 50-100 | Good for demo |
| **Uptime** | 99%+ | No SLA |

### Production Tier Performance

| Metric | Expected Value | Improvement |
|--------|---------------|-------------|
| **Page Load Time** | < 1 second | **2x faster** |
| **API Response** | < 200ms | **2.5x faster** |
| **TTFB** | < 200ms | **4x faster** |
| **Database Query** | < 80ms | **2.5x faster** |
| **Worker Response** | Instant | **No cold start** |
| **Scraping Speed** | 50-100 products/min | **10x faster** |
| **Concurrent Users** | 500-1,000 | **10x more** |
| **Uptime** | 99.9%+ | Better reliability |

---

## 🔄 Deployment Workflow

### Initial Deployment

```bash
# 1. Setup accounts and services
→ See DEPLOYMENT-GUIDE.md Phase 1

# 2. Configure environment variables
→ See ENVIRONMENT-SETUP.md

# 3. Deploy to Vercel
git push origin main
→ Vercel auto-deploys

# 4. Run database migrations
→ See DEPLOYMENT-GUIDE.md Phase 2

# 5. Setup monitoring
→ See MONITORING.md

# 6. Test everything
→ See DEPLOYMENT-GUIDE.md Phase 6
```

### Continuous Deployment

```bash
# Every git push to main triggers:
1. Vercel build
2. Run tests (if configured)
3. Deploy to production
4. Invalidate CDN cache
5. Send deployment notification

# Rollback if needed:
→ Vercel Dashboard → Deployments → Promote previous version
```

---

## 🆘 Getting Help

### Documentation Hierarchy
```
1. Check TROUBLESHOOTING.md for your specific issue
2. Review relevant component documentation
3. Check service-specific documentation
4. Search community forums
5. Contact support (paid tiers)
```

### Service-Specific Help
- **Vercel**: https://vercel.com/docs | https://vercel.com/support
- **Neon**: https://neon.tech/docs | Community Discord
- **Upstash**: https://upstash.com/docs | Support email
- **Resend**: https://resend.com/docs | Support chat
- **Next.js**: https://nextjs.org/docs | GitHub Discussions
- **Prisma**: https://prisma.io/docs | Discord community

### Community Resources
- Vercel Discord: https://vercel.com/discord
- Prisma Discord: https://pris.ly/discord
- Next.js GitHub: https://github.com/vercel/next.js/discussions
- Reddit: r/nextjs, r/webdev

---

## 💡 Pro Tips

### Before Demo/Launch
1. ✅ Test everything 24-48 hours before
2. ✅ Ping worker service 10 minutes before demo (warm up)
3. ✅ Pre-load some data (don't start with empty database)
4. ✅ Clear browser cache before demo
5. ✅ Have screenshots ready as backup
6. ✅ Test on fresh browser/incognito mode

### During Demo
1. 🎯 Focus on features, not infrastructure
2. 🎯 Accept cold start delays gracefully
3. 🎯 Explain "free tier" if issues occur
4. 🎯 Have backup plan (screenshots, video)

### After Demo
1. 📊 Check all service dashboards for usage
2. 📊 Note any errors or issues
3. 📊 Gather customer feedback
4. 📊 Plan next steps (upgrade, optimize, etc.)

---

## 🎉 What's Next?

After successful deployment:

### Immediate (Day 1)
- [ ] Test all features end-to-end
- [ ] Share demo link with team
- [ ] Monitor service dashboards
- [ ] Document any issues encountered

### Short-term (Week 1)
- [ ] Conduct customer demos
- [ ] Gather feedback
- [ ] Fix critical bugs
- [ ] Optimize performance

### Mid-term (Month 1)
- [ ] Analyze usage patterns
- [ ] Decide on upgrade path (see [SCALING-GUIDE.md](./SCALING-GUIDE.md))
- [ ] Plan feature roadmap
- [ ] Set up CI/CD pipeline (if not already)

### Long-term (Month 3+)
- [ ] Scale infrastructure based on growth
- [ ] Implement advanced features
- [ ] Optimize costs
- [ ] Prepare for compliance/security audits

---

## 🚀 Ready to Deploy?

### For Production Deployment:
**Start here**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

### For Free Tier Demo:
**Start here**: [SCALING-GUIDE.md](./SCALING-GUIDE.md#phase-1-free-tier-mvpdemo)

### Just Learning?
**Start here**: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📝 Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-01-28 | Complete rewrite with new structure |
| | | Added ARCHITECTURE.md |
| | | Added SCALING-GUIDE.md with comparison table |
| | | Added MONITORING.md |
| | | Added TROUBLESHOOTING.md |
| | | Updated README with better navigation |
| 1.0 | 2026-01-27 | Initial free tier documentation |

---

## 📄 License

This documentation is part of the GoodSeed App project.  
See LICENSE.txt in the root directory.

---

**Time to build something awesome!** 🎊
