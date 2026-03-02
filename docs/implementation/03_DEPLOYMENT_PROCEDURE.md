# CEO Platform - Deployment Procedure
**Version**: 1.0
**Last Updated**: 2026-03-03
**Owner**: DevOps Lead

---

## Table of Contents
1. Pre-Deployment Checklist
2. Zero-Downtime Deployment Strategy
3. Step-by-Step Deployment
4. Post-Deployment Verification
5. Rollback Procedures

---

## 1. Pre-Deployment Checklist

### Code Quality Gates (30 minutes)
- [ ] **All tests passing**
  ```bash
  pnpm test
  # Expected: No failures (or only known acceptable failures)
  ```

- [ ] **TypeScript compilation clean**
  ```bash
  pnpm typecheck
  # Expected: 0 errors in src/
  ```

- [ ] **Build successful**
  ```bash
  pnpm build
  # Expected: .next/ directory created, no errors
  ```

- [ ] **No security vulnerabilities**
  ```bash
  npm audit
  # Expected: No high or critical vulnerabilities
  ```

- [ ] **Code review approved**
  - [ ] At least 1 approval from code reviewer
  - [ ] All comments resolved
  - [ ] No "Request Changes"

### Deployment Readiness (20 minutes)
- [ ] **Staging environment tested**
  - [ ] Deploy to staging first
  - [ ] Run smoke tests on staging
  - [ ] Verify all critical endpoints
  - [ ] Load test staging (optional)

- [ ] **Rollback plan prepared**
  - [ ] Previous version tagged in git
  - [ ] Rollback procedures written
  - [ ] Team aware of rollback process
  - [ ] Tested rollback in staging

- [ ] **Communication plan ready**
  - [ ] Deployment window announced (24 hours before)
  - [ ] Team notified
  - [ ] Support team briefed
  - [ ] Customers notified if applicable

- [ ] **Database migrations reviewed** (if any)
  - [ ] Migrations are backwards-compatible
  - [ ] Rollback migration prepared
  - [ ] No data loss risks
  - [ ] Migrations tested on staging

- [ ] **Environment variables configured**
  - [ ] All required variables present in production
  - [ ] Secrets securely stored
  - [ ] No sensitive data in code
  - [ ] .env.production exists and is secure

### Monitoring Preparation (10 minutes)
- [ ] **Monitoring systems ready**
  - [ ] Sentry configured and testing
  - [ ] Database monitoring active
  - [ ] Application monitoring running
  - [ ] Alerting active

- [ ] **Incident response team ready**
  - [ ] On-call engineer assigned
  - [ ] Team on standby during deployment
  - [ ] Incident response plan reviewed
  - [ ] Escalation chain understood

---

## 2. Zero-Downtime Deployment Strategy

### Strategy Overview

The CEO Platform uses a **rolling deployment** strategy to achieve zero downtime:

```
Before:     [Instance 1] [Instance 2] [Instance 3] [Instance 4]
            All running v1.0

During:     [Instance 1] [Instance 2] [Instance 3] [Instance 4]
            v1.1        v1.1        v1.0        v1.0
            Deploying one instance at a time, keeping others running

After:      [Instance 1] [Instance 2] [Instance 3] [Instance 4]
            All running v1.1
```

### How It Works

1. **Load Balancer**: Distributes traffic to 4 instances (PM2 cluster mode)
2. **Graceful Shutdown**: Existing connections complete before shutdown
3. **Sequential Deployment**: Deploy to 1 instance at a time
4. **Health Checks**: Verify each instance healthy before moving to next
5. **Automatic Rollback**: If health checks fail, revert instance

### Benefits
- ✅ Zero downtime (users never see 503 errors)
- ✅ Traffic never routed to broken instances
- ✅ Can rollback if issues detected
- ✅ Users experience seamless deployment

---

## 3. Step-by-Step Deployment

### Phase 1: Pre-Deployment (15 minutes before deployment window)

**On Deployment Machine** (authorized DevOps engineer):

```bash
# 1. Verify you're on the correct branch
git status
git branch

# 2. Pull latest code
git pull origin main

# 3. Verify commit hash matches approved version
git log --oneline -1

# 4. Verify all checks passing locally
pnpm install
pnpm build
pnpm test

# 5. Verify git working tree is clean
git status
# Should show: "working tree clean"
```

### Phase 2: Backup & Pre-Deployment Tasks (At deployment window start)

**Create Database Backup**:
```bash
# Full backup before any changes
pg_dump -Fc ceo_platform > /backups/pre_deployment_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
ls -lh /backups/pre_deployment_*.dump
```

**Record Current Version**:
```bash
# Document current production version
echo "Pre-deployment version: $(git log --oneline -1)" >> /deployments/deployment.log
echo "Timestamp: $(date)" >> /deployments/deployment.log
```

**Post to Status Page**:
```
Maintenance Window: Deploying CEO Platform v1.X.X
- Expected duration: 15-30 minutes
- May experience brief high latency during deployment
```

### Phase 3: Application Deployment (Actual deployment)

**Deploy Using PM2**:

```bash
cd /app/ceo-platform/ceo-monorepo/apps/web

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Build application
pnpm build

# 4. Stop instances one at a time and redeploy
# PM2 can do this automatically with 0 downtime

# Start new version alongside old
pm2 start ecosystem.config.js --name "ceo-platform-v$(date +%Y%m%d)"

# Verify new instance is healthy
sleep 5
curl http://localhost:3001/api/health

# Update load balancer to include new instance
# (nginx reload to include new upstream)
sudo nginx -t && sudo systemctl reload nginx

# Stop old instance after new one is warm
pm2 stop ceo-platform

# Verify traffic routed to new instance
curl https://ceo-platform.example.com/api/health

# Clean up
pm2 delete ceo-platform
pm2 restart ecosystem.config.js
```

**Alternative Using Deployment Script**:

```bash
# Run automated deployment script (if available)
./scripts/deploy/zero-downtime-deploy.sh v1.X.X

# This script handles:
# - Building new version
# - Starting new instances
# - Health checks
# - Gradual traffic migration
# - Stopping old instances
# - Cleanup
```

### Phase 4: Database Migrations (If applicable)

**Run Migrations**:
```bash
# Only if schema changes in this release
cd /app/ceo-platform/ceo-monorepo/apps/web

# Check what migrations pending
DATABASE_URL=$DB_URL pnpm prisma migrate status

# Run migrations
DATABASE_URL=$DB_URL pnpm prisma migrate deploy

# Verify migrations applied
DATABASE_URL=$DB_URL psql -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;"
```

**Important**: Migrations must be backwards compatible with previous version running during deployment!

### Phase 5: Post-Deployment Verification (Immediately after)

**Health Checks**:
```bash
# Verify application responding
curl -I https://ceo-platform.example.com/api/health
# Expected: 200 OK

# Verify database connected
curl https://ceo-platform.example.com/api/products
# Expected: 200 OK with product list

# Check application is running
pm2 status
# Expected: ceo-platform online (4 instances)

# Verify no errors in logs
pm2 logs ceo-platform --lines 50
# Should not see ERROR level logs
```

**Smoke Tests** (5-10 minutes):
```bash
# Verify critical workflows work
curl -X POST https://ceo-platform.example.com/api/products -d '...'
# Should create product

curl https://ceo-platform.example.com/api/orders
# Should list orders

curl https://ceo-platform.example.com/api/invoices
# Should list invoices
```

**Monitoring Check**:
```bash
# Check Sentry for new errors
# Expected: No spike in error rate

# Check response times
# Expected: < 200ms p95

# Check database
psql -c "SELECT count(*) FROM users;" $DATABASE_URL
# Should return correct user count
```

---

## 4. Post-Deployment Procedures

### Immediate Post-Deployment (First 30 minutes)

1. **Monitor Error Rates**
   - Check Sentry every 5 minutes
   - Alert if error rate > 1%
   - Check response times

2. **Monitor System Resources**
   ```bash
   watch -n 5 'ps aux | grep node'
   watch -n 5 'free -h'
   watch -n 5 'df -h'
   ```

3. **Communication**
   - Post "deployment successful" to #deployments
   - Note deployment time
   - Note any issues encountered

4. **Verify No Issues**
   - No customer complaints in support
   - No errors in logs
   - Performance normal
   - Database healthy

### Extended Monitoring (First 24 hours)

1. **Watch for Issues**
   - Monitor error logs closely
   - Track slow query performance
   - Watch for memory leaks
   - Monitor connection pool usage

2. **Document Issues**
   - Log any problems encountered
   - Note error patterns
   - Gather data for post-mortem

3. **Quick Hotfix Capability**
   - Have rollback plan ready
   - Team on standby
   - Can deploy fix quickly if needed

---

## 5. Rollback Procedures

### When to Rollback

Rollback immediately if you observe:
- [ ] Error rate jumps to > 5%
- [ ] Multiple 500 errors in logs
- [ ] Database becomes inaccessible
- [ ] Critical business flow broken
- [ ] Performance degradation > 50%

### Quick Rollback (< 5 minutes)

```bash
# 1. Stop current version
pm2 stop ceo-platform

# 2. Revert to previous version
cd /app/ceo-platform
git checkout <previous-version-tag>

# 3. Install dependencies (if changed)
pnpm install

# 4. Build previous version
pnpm build

# 5. Start previous version
pm2 restart ceo-platform

# 6. Verify health
sleep 5
curl https://ceo-platform.example.com/api/health
```

### Rollback with Database Revert (If migrations caused issue)

```bash
# 1. Stop application
pm2 stop ceo-platform

# 2. Revert database migration
DATABASE_URL=$DB_URL pnpm prisma migrate resolve --rolled-back <migration-name>

# 3. OR restore from backup if corrupted
dropdb ceo_platform
createdb ceo_platform
pg_restore -d ceo_platform /backups/pre_deployment_*.dump

# 4. Revert code
git checkout <previous-version>

# 5. Start application
pm2 start ecosystem.config.js

# 6. Verify
curl https://ceo-platform.example.com/api/health
```

### Communication During Rollback

```
🔴 Issue detected in deployment - rolling back to v1.X.X
- Current issue: [Brief description]
- Rollback initiated at [time]
- Estimated recovery: [5-10 minutes]
- Updates every 2 minutes
```

---

## 6. Deployment Checklist Template

Use this for every deployment:

```
Deployment Date: _______________
Deployment Version: ____________
Engineer: ___________________

PRE-DEPLOYMENT:
☐ Code review approved
☐ Tests passing
☐ Build successful
☐ Staging tested
☐ Database backup created
☐ Team notified
☐ Rollback plan ready

DEPLOYMENT:
☐ Pre-deployment tasks complete
☐ Database backup verified
☐ Application built
☐ Health checks pass
☐ Smoke tests pass
☐ Monitoring active
☐ No new errors
☐ Performance normal

POST-DEPLOYMENT:
☐ Error rate stable (< 1%)
☐ Response times normal (< 200ms p95)
☐ Database healthy
☐ All endpoints responding
☐ Monitoring alerts set
☐ Team notified of completion
☐ Issue logged (if any)

SIGN-OFF:
☐ Engineer: _________________ Date: ________
☐ Lead: _________________ Date: ________
```

---

## 7. Common Deployment Issues

### Issue: New version won't start

**Symptoms**: `pm2 start` fails or instance crashes immediately

**Cause**: Likely missing dependency or misconfigured variable

**Fix**:
```bash
# Check logs
pm2 logs

# Revert to previous version
git checkout <previous-version>
pnpm install
pnpm build
pm2 restart

# Investigate issue in development
# Fix and redeploy
```

### Issue: Health checks fail after deployment

**Symptoms**: `/api/health` returns 500

**Cause**: Database connection issue or missing migration

**Fix**:
```bash
# Check database
psql -c "SELECT 1;" $DATABASE_URL

# Check migrations
pnpm prisma migrate status

# Run migrations if needed
pnpm prisma migrate deploy

# Restart application
pm2 restart ceo-platform
```

### Issue: Slow performance after deployment

**Symptoms**: Response times > 500ms

**Cause**: New code less optimized, or database index missing

**Fix**:
```bash
# Check slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;" $DATABASE_URL

# Option 1: Rollback if critical
# Option 2: Add database indexes
# Option 3: Optimize code and redeploy
```

---

## 8. Success Criteria

Deployment is successful when:
- ✅ Zero downtime (no 503 errors)
- ✅ All health checks passing
- ✅ Error rate < 1%
- ✅ Response time < 200ms p95
- ✅ No new errors in Sentry
- ✅ Database healthy
- ✅ All critical workflows functioning
- ✅ No customer complaints in first 24 hours

---

## Deployment Timing

**Optimal Deployment Windows**:
- Monday-Thursday: 2:00-3:00 AM UTC (off-peak hours)
- Friday: 10:00-11:00 AM UTC (before weekend)
- Avoid: Friday evenings, holidays, peak traffic times

**Deployment Duration**: 15-30 minutes

---

**Document Status**: ✅ Ready for Production Deployments
**Last Tested**: 2026-03-03
**Next Review**: 2026-04-03
