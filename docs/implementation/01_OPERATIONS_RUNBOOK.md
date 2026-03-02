# CEO Platform - Operations Runbook
**Version**: 1.0
**Last Updated**: 2026-03-03
**Owner**: Operations Team

---

## Table of Contents
1. Daily Operations Checklist
2. Monitoring & Alerting
3. Common Troubleshooting
4. Incident Response Procedures
5. Emergency Contacts

---

## 1. Daily Operations Checklist

### Morning Check (8:00 AM UTC)
Use this checklist to verify system health at the start of each business day.

#### Health Checks (15 minutes)
- [ ] **Website Accessibility**
  ```bash
  curl -I https://ceo-platform.example.com
  # Expected: 200 OK
  ```

- [ ] **API Health Endpoint**
  ```bash
  curl https://ceo-platform.example.com/api/health | jq .
  # Expected: {"status":"healthy"}
  ```

- [ ] **Database Connectivity**
  ```bash
  psql -c "SELECT now();" $DATABASE_URL
  # Expected: Current timestamp
  ```

- [ ] **Application Process Status**
  ```bash
  pm2 status
  # Expected: ceo-platform: online (4 instances)
  ```

#### System Resources (10 minutes)
- [ ] **CPU Usage**
  ```bash
  top -bn1 | head -n 10
  # Expected: < 60% average
  ```

- [ ] **Memory Usage**
  ```bash
  free -h
  # Expected: Used < 80% of available
  ```

- [ ] **Disk Space**
  ```bash
  df -h /
  # Expected: Used < 80%
  ```

- [ ] **Database Connections**
  ```bash
  psql -c "SELECT count(*) as connections FROM pg_stat_activity;" $DATABASE_URL
  # Expected: < 15 active connections
  ```

#### Monitoring System Check (5 minutes)
- [ ] **Sentry Error Rate**
  - Navigate to Sentry dashboard
  - Check error rate: Expected < 0.5%
  - Review any new error patterns

- [ ] **Slow Query Log**
  ```bash
  psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;" $DATABASE_URL
  # Review for unusual patterns
  ```

- [ ] **Backup Status**
  ```bash
  ls -lh /backups/daily/ | tail -3
  # Expected: Most recent backup from yesterday
  ```

### Hourly Check (Every hour, automated)
- [ ] Application responds to health check
- [ ] Error rate < 1%
- [ ] Response time < 200ms p95
- [ ] No database connection pool exhaustion
- [ ] Disk space > 20% available

---

## 2. Monitoring & Alerting

### Alert Severity Levels

| Level | Response Time | Escalation | Example |
|-------|---------------|------------|---------|
| P0 | 15 minutes | Immediate SMS to on-call | Database down, 500 errors > 10% |
| P1 | 30 minutes | Slack + Email | Error rate > 1%, Response time > 500ms |
| P2 | 2 hours | Slack notification | Warning logs, non-critical errors |
| P3 | 24 hours | Daily digest | Info logs, minor issues |

### Alert Routing
```
P0 Alerts → PagerDuty → On-call Engineer (SMS + Call)
P1 Alerts → Slack #incident-response + Email
P2 Alerts → Slack #alerts + Daily Digest
```

### Common Alerts & Responses

#### Alert: High Error Rate (> 1%)
1. Check Sentry dashboard for error patterns
2. Identify affected endpoints
3. Review recent deployments
4. If deployment related: Consider rollback
5. If not: Check database and system resources

#### Alert: Slow Response Times (p95 > 200ms)
1. Check database slow query log
2. Review Prometheus metrics for resource usage
3. Check if any heavy migrations running
4. Identify slow endpoint with highest traffic
5. Consider horizontal scaling if needed

#### Alert: Database Connection Pool Near Limit
1. Check active connections
   ```bash
   psql -c "SELECT * FROM pg_stat_activity WHERE state='active';" $DATABASE_URL
   ```
2. Kill idle connections if safe
   ```bash
   psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND query_start < now() - interval '30 minutes';" $DATABASE_URL
   ```
3. Restart application if connections stuck
4. Review for connection leaks in code

---

## 3. Common Troubleshooting

### Issue: Website Returns 502 Bad Gateway

**Symptoms**:
- Browser shows "502 Bad Gateway"
- nginx error log shows connection refused to upstream

**Diagnosis**:
```bash
# Check if Next.js application is running
pm2 status
# Expected: ceo-platform online

# Check if port 3000 is listening
lsof -i :3000

# Check application logs
pm2 logs ceo-platform --lines 50
```

**Resolution**:
```bash
# If application crashed:
pm2 restart ceo-platform

# If hanging, force restart:
pm2 kill
pm2 start ecosystem.config.js

# Check logs for root cause
pm2 logs ceo-platform --lines 100 | grep ERROR
```

### Issue: Database Connection Refused

**Symptoms**:
- API returns 500 errors
- Application logs show "ECONNREFUSED"

**Diagnosis**:
```bash
# Test database connectivity
psql -c "SELECT 1;" $DATABASE_URL

# Check database is running
ps aux | grep postgres

# Check database logs
tail -100 /var/log/postgresql/postgresql.log
```

**Resolution**:
```bash
# If PostgreSQL is down:
sudo systemctl restart postgresql

# If connection pool exhausted:
# 1. Kill idle connections (see above)
# 2. Restart application
# 3. Review for connection leaks

# If authentication failed:
# Verify DATABASE_URL in .env.production
# Reset password if needed:
sudo -u postgres psql -c "ALTER USER ceo_admin WITH PASSWORD 'new_password';"
```

### Issue: High CPU Usage (> 80%)

**Symptoms**:
- Server slow to respond
- CPU temperature high
- System load high

**Diagnosis**:
```bash
# Identify process using CPU
top -b -n 1 | head -20

# Check Node.js memory usage
ps aux | grep "node\|pnpm"

# Check database CPU usage
psql -c "SELECT * FROM pg_stat_statements ORDER BY total_plan_time DESC LIMIT 10;" $DATABASE_URL
```

**Resolution**:
```bash
# If Node.js using excessive CPU:
pm2 logs ceo-platform | grep ERROR

# Restart if needed
pm2 restart ceo-platform

# If database using CPU:
# Check slow queries and optimize
# May need to restart PostgreSQL after optimization
sudo systemctl restart postgresql

# Monitor with watch
watch -n 1 'top -b -n 1 | head -15'
```

### Issue: Out of Disk Space

**Symptoms**:
- Disk space alert triggered
- Application crashes trying to write logs
- Database cannot accept new data

**Diagnosis**:
```bash
# Check disk usage
df -h

# Find large files
du -sh /* | sort -rh

# Check log file sizes
du -sh /var/log/*
```

**Resolution**:
```bash
# Clear old logs (keep 7 days)
find /var/log -type f -mtime +7 -delete

# Rotate database logs
sudo -u postgres vacuumdb ceo_platform --analyze

# Archive old backups to remote storage
tar -czf backups_archive_$(date +%Y%m).tar.gz /backups/daily/*
aws s3 cp backups_archive_$(date +%Y%m).tar.gz s3://backup-bucket/

# Clean up backups older than 30 days
find /backups -mtime +30 -delete
```

### Issue: Slow Page Load

**Symptoms**:
- Website loads slowly
- Specific pages affected
- Intermittent performance issues

**Diagnosis**:
```bash
# Check response time
time curl https://ceo-platform.example.com/api/products

# Check slow queries
psql -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC;" $DATABASE_URL

# Check cache hit ratio
psql -c "SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit) as heap_hit, sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio FROM pg_statio_user_tables;" $DATABASE_URL
```

**Resolution**:
```bash
# Add database indexes if needed
# Review schema and add missing indexes

# Clear application cache
# Most caching is handled by Cloudflare/CDN

# Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM products WHERE name ILIKE 'search_term';

# Consider horizontal scaling if load-related
```

---

## 4. Incident Response Procedures

### Incident Classification

| Severity | Definition | Example | Response |
|----------|-----------|---------|----------|
| Critical (P0) | Service completely down | Database down, 100% error rate | Immediately escalate |
| Major (P1) | Service partially degraded | Error rate > 5%, response slow | Notify team, investigate |
| Minor (P2) | Service operational but issues | Warning logs, one endpoint slow | Monitor and plan fix |
| Info (P3) | No impact, informational | New logs, metrics for analysis | Log and trend |

### P0 Critical Incident Procedure

1. **Detection**: Alert triggers or customer reports complete outage
2. **Notification** (0-5 minutes):
   - Page on-call engineer via PagerDuty
   - Post in #incident-response Slack channel
   - Notify manager

3. **Triage** (5-10 minutes):
   - Assess impact: How many users affected?
   - Identify scope: Which systems down?
   - Run diagnostics:
     ```bash
     curl https://ceo-platform.example.com/api/health
     pm2 status
     psql -c "SELECT 1;" $DATABASE_URL
     ```
   - Determine if rollback needed

4. **Mitigation** (10-30 minutes):
   - **If infrastructure issue**:
     - Restart services (application, database, reverse proxy)
     - Check system resources
   - **If code issue**:
     - Review recent deployments
     - Prepare rollback
     - Execute rollback if needed
   - **If data issue**:
     - Check database integrity
     - Prepare restore from backup if needed

5. **Communication**:
   - Update #incident-response every 5 minutes
   - Notify customers if appropriate (status page)
   - Keep senior management informed

6. **Resolution**:
   - Verify system recovered
   - Run smoke tests
   - Confirm with customer
   - Post all-clear message

7. **Post-Incident**:
   - Schedule post-mortem within 24 hours
   - Document root cause
   - Create action items to prevent recurrence
   - Update runbooks if needed

### P1 Major Incident Procedure

1. **Notification** (0-15 minutes):
   - Slack #incident-response
   - Email to engineering team
   - Page on-call if during off-hours

2. **Investigation** (15-30 minutes):
   - Gather logs from affected time period
   - Review Sentry for error patterns
   - Check recent changes
   - Identify root cause

3. **Resolution** (30-120 minutes):
   - Implement fix or workaround
   - Test in staging if possible
   - Deploy fix to production
   - Verify resolution

4. **Communication**:
   - Update #incident-response channel
   - Notify affected customers if needed

---

## 5. Emergency Contacts

### On-Call Engineer
- **Primary**: [Name] - [Phone]
- **Secondary**: [Name] - [Phone]
- **Manager**: [Name] - [Phone]

### Escalation Chain
1. On-call Engineer
2. Engineering Lead
3. CTO

### Critical Service Providers
- **Database Provider**: [Support Portal]
- **Cloud Provider**: [Support Portal]
- **DNS Provider**: [Support Portal]
- **Email Provider**: [Support Portal]

### External Support
- **AWS Support**: [Account ID] - [Support Plan]
- **PostgreSQL Support**: [Contact info]

---

## 6. Maintenance Windows

### Planned Maintenance
Schedule: Every second Sunday, 2:00 AM UTC (30-minute window)

**Pre-Maintenance**:
- Post announcement to status page 24 hours before
- Notify major customers
- Prepare rollback plan

**During Maintenance**:
- Run database updates
- Update dependencies if needed
- Perform backup verification

**Post-Maintenance**:
- Run smoke tests
- Verify all systems operational
- Update status page

---

## 7. Key Commands Reference

### Application Management
```bash
# Status
pm2 status

# Logs
pm2 logs ceo-platform --lines 100

# Restart
pm2 restart ceo-platform

# Stop
pm2 stop ceo-platform

# Start
pm2 start ceo-platform
```

### Database Backup
```bash
# Create backup
pg_dump -Fc ceo_platform > /backups/manual_$(date +%Y%m%d_%H%M%S).dump

# Restore backup
pg_restore -d ceo_platform /backups/manual_20260303_100000.dump

# List backups
ls -lh /backups/daily/

# Test backup
createdb ceo_test
pg_restore -d ceo_test /backups/daily/ceo_platform_20260303.dump
```

### System Monitoring
```bash
# CPU/Memory
top -b -n 1 | head -15

# Disk
df -h

# Network connections
netstat -tuln | grep LISTEN

# Process list
ps aux | grep -E "node|postgres"
```

### Log Checking
```bash
# Application logs
pm2 logs ceo-platform --lines 200

# System logs
tail -100 /var/log/syslog

# Database logs
tail -100 /var/log/postgresql/postgresql.log

# nginx logs
tail -100 /var/log/nginx/error.log
```

---

## Document Control
- **Version**: 1.0
- **Last Updated**: 2026-03-03
- **Next Review**: 2026-03-17 (after Phase 6 launch)
- **Owner**: Operations Team
- **Approver**: Engineering Lead

---

**Status**: ✅ Ready for Production Use
