# Phase 6 Section 1 - Task 1.2: Deployment Environment Setup
**Date**: 2026-03-03
**Owner**: DevOps Team
**Status**: 📋 CHECKLIST CREATED (Ready for Infrastructure Setup)

---

## Task Overview
Prepare production infrastructure for zero-downtime deployment. This task includes database preparation, application server setup, monitoring, backups, and CDN configuration.

---

## 1.2.1 Production Database Preparation
**Owner**: Database Administrator | **Estimated Time**: 2 hours

### Pre-Deployment Checklist
- [ ] **Database Server Ready**
  - [ ] PostgreSQL v14+ installed
  - [ ] Database created: `ceo_platform`
  - [ ] Database user created: `ceo_admin`
  - [ ] User has CREATEDB privilege
  - [ ] Connection test successful

- [ ] **Connection Pool Configuration**
  - [ ] PgBouncer installed (if using connection pooling)
  - [ ] Pool size: 20 connections
  - [ ] Reserved: 5 connections
  - [ ] Timeout: 3600 seconds
  - [ ] Reserve pool mode: transaction
  - [ ] Connection string: `postgresql://ceo_admin:PASSWORD@db-host:5432/ceo_platform?sslmode=require`

- [ ] **Database Backup - Pre-Production**
  - [ ] Create full database backup
    ```bash
    pg_dump -Fc ceo_platform > /backups/ceo_platform_pre_prod_$(date +%Y%m%d_%H%M%S).dump
    ```
  - [ ] Test restore from backup
    ```bash
    createdb ceo_platform_test
    pg_restore -d ceo_platform_test /backups/ceo_platform_pre_prod_*.dump
    ```
  - [ ] Verify all tables restored
  - [ ] Store backup in secure location

- [ ] **Automated Backup Configuration**
  - [ ] Daily backup script created
    ```bash
    # /etc/cron.daily/backup-ceo-platform
    #!/bin/bash
    pg_dump -Fc ceo_platform > /backups/daily/ceo_platform_$(date +%Y%m%d).dump
    # Keep 7 days of daily backups
    find /backups/daily -mtime +7 -delete
    ```
  - [ ] Weekly backup script created
    ```bash
    # /etc/cron.weekly/backup-ceo-platform-weekly
    pg_dump -Fc ceo_platform > /backups/weekly/ceo_platform_$(date +%G_W%V).dump
    # Keep 12 weeks of weekly backups
    find /backups/weekly -mtime +84 -delete
    ```
  - [ ] Backup retention policy: 30 days minimum
  - [ ] Monitor backup completion (email alerts)
  - [ ] Test weekly restore procedure

### Configuration Details
```env
DATABASE_URL="postgresql://ceo_admin:SecurePassword_2026@db-prod:5432/ceo_platform?sslmode=require"
DB_POOL_SIZE=20
DB_RESERVED_POOL_SIZE=5
DB_TIMEOUT=3600
```

### Verification Commands
```bash
# Test database connection
psql -c "SELECT version();" $DATABASE_URL

# Check table count
psql -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';" $DATABASE_URL

# Verify indexes
psql -c "SELECT tablename FROM pg_tables WHERE schemaname='public';" $DATABASE_URL
```

---

## 1.2.2 Application Server Setup
**Owner**: DevOps Lead | **Estimated Time**: 2 hours

### Server Requirements
- [ ] **Compute Resources**
  - [ ] CPU: Minimum 2 cores (4 recommended)
  - [ ] RAM: Minimum 4GB (8GB recommended)
  - [ ] Disk: Minimum 50GB (SSD recommended)
  - [ ] Network: Minimum 100 Mbps

- [ ] **Operating System**
  - [ ] Ubuntu 22.04 LTS or equivalent
  - [ ] Node.js v20 LTS installed
  - [ ] npm/pnpm package manager installed
  - [ ] Git installed

- [ ] **Next.js Application Deployment**
  - [ ] Clone repository to `/app/ceo-platform`
    ```bash
    cd /app
    git clone https://github.com/company/ceo-platform.git
    cd ceo-platform/ceo-monorepo/apps/web
    ```
  - [ ] Install dependencies
    ```bash
    pnpm install
    ```
  - [ ] Build application
    ```bash
    pnpm build
    ```
  - [ ] Verify .next/ directory created

- [ ] **Environment Variables Configuration**
  - [ ] Create `.env.production`
    ```env
    NEXTAUTH_URL=https://ceo-platform.example.com
    NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
    DATABASE_URL=postgresql://ceo_admin:SecurePassword_2026@db-prod:5432/ceo_platform
    API_RATE_LIMIT=100
    LOG_LEVEL=info
    NODE_ENV=production
    SENTRY_DSN=<from-sentry-project>
    ```
  - [ ] No .env.production file in git (added to .gitignore)
  - [ ] Verify all required variables set
  - [ ] Test database connection string

- [ ] **SSL/TLS Certificate Setup**
  - [ ] Purchase or provision SSL certificate
  - [ ] Install certificate on reverse proxy
  - [ ] Configure certificate auto-renewal (Let's Encrypt)
    ```bash
    # Using Certbot with nginx
    certbot certonly --nginx -d ceo-platform.example.com
    certbot renew --dry-run
    ```
  - [ ] Test HTTPS access: https://ceo-platform.example.com
  - [ ] Verify certificate validity (60+ days)
  - [ ] Configure HSTS headers
    ```nginx
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    ```

- [ ] **Reverse Proxy Configuration (nginx)**
  - [ ] Install nginx (or caddy/haproxy)
  - [ ] Configure upstream to Next.js
    ```nginx
    upstream ceo_platform {
      server localhost:3000;
      keepalive 32;
    }

    server {
      listen 80;
      server_name ceo-platform.example.com;

      location / {
        return 301 https://$server_name$request_uri;
      }
    }

    server {
      listen 443 ssl http2;
      server_name ceo-platform.example.com;

      ssl_certificate /etc/letsencrypt/live/ceo-platform.example.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/ceo-platform.example.com/privkey.pem;

      location / {
        proxy_pass http://ceo_platform;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
      }
    }
    ```
  - [ ] Enable gzip compression
  - [ ] Configure security headers
  - [ ] Test proxy configuration: `nginx -t`

- [ ] **Process Manager Setup (PM2)**
  - [ ] Install PM2 globally
    ```bash
    npm install -g pm2
    ```
  - [ ] Create ecosystem.config.js
    ```javascript
    module.exports = {
      apps: [{
        name: 'ceo-platform',
        script: 'pnpm',
        args: 'start',
        cwd: '/app/ceo-platform/ceo-monorepo/apps/web',
        instances: 4,
        exec_mode: 'cluster',
        env: {
          NODE_ENV: 'production'
        },
        error_file: '/var/log/ceo-platform-error.log',
        out_file: '/var/log/ceo-platform-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
      }]
    };
    ```
  - [ ] Start application with PM2
    ```bash
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    ```
  - [ ] Verify application running: `pm2 list`

### Verification Commands
```bash
# Test application startup
curl http://localhost:3000/api/health

# Verify SSL certificate
openssl s_client -connect ceo-platform.example.com:443

# Check process status
pm2 status
```

---

## 1.2.3 Monitoring & Alerting Configuration
**Owner**: DevOps Team | **Estimated Time**: 2 hours

### Application Monitoring (Sentry)
- [ ] **Sentry Project Setup**
  - [ ] Create Sentry organization
  - [ ] Create project: "CEO Platform"
  - [ ] Generate DSN: `https://key@sentry.io/project-id`
  - [ ] Add to `.env.production`

- [ ] **Error Tracking Configuration**
  - [ ] Sentry Next.js SDK already imported
  - [ ] Configure error rate alerts
    - [ ] Alert if error rate > 1%
    - [ ] Alert if new error patterns detected
    - [ ] Severity levels: error, critical
  - [ ] Configure performance monitoring
    - [ ] Track transaction duration
    - [ ] Slow transaction threshold: 3s
  - [ ] Setup release tracking
    ```bash
    # Tag each deployment with version
    sentry-cli releases create ceo-platform@1.0.0
    ```

### Database Monitoring
- [ ] **PostgreSQL Monitoring Tool**
  - [ ] Install pgAdmin or equivalent
  - [ ] Connect to production database
  - [ ] Configure query logging
    ```sql
    ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
    ALTER SYSTEM SET log_statement = 'all';
    SELECT pg_reload_conf();
    ```
  - [ ] Monitor slow query log
  - [ ] Set up slow query alerts (queries > 2s)

- [ ] **Connection Pool Monitoring**
  - [ ] Monitor active connections
    ```sql
    SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
    ```
  - [ ] Set up alert if connections > 15 of 20
  - [ ] Monitor idle connections
  - [ ] Monitor transaction duration

- [ ] **Database Health Checks**
  - [ ] Disk space monitoring (alert if > 80%)
  - [ ] Replication lag monitoring (if applicable)
  - [ ] Backup completion monitoring
  - [ ] VACUUM operation monitoring

### Infrastructure Monitoring
- [ ] **System Resource Monitoring (Prometheus/Grafana)**
  - [ ] Install Prometheus
  - [ ] Configure node_exporter for system metrics
  - [ ] Create dashboard for:
    - [ ] CPU usage
    - [ ] Memory usage (alert if > 85%)
    - [ ] Disk usage (alert if > 80%)
    - [ ] Network I/O
    - [ ] Load average

- [ ] **Log Aggregation (ELK/Loki)**
  - [ ] Configure log shipping
    ```bash
    # All logs to /var/log/ceo-platform*.log
    # Ship to Loki/ELK for centralized logging
    ```
  - [ ] Index logs by:
    - [ ] Timestamp
    - [ ] Log level (INFO, ERROR, WARN)
    - [ ] Service (api, web, database)
  - [ ] Create log alerts for ERROR level

### Alert Configuration
- [ ] **Alert Thresholds**
  - [ ] Error rate > 1% → P1 alert
  - [ ] Response time p95 > 200ms → P2 alert
  - [ ] Database CPU > 80% → P2 alert
  - [ ] Memory usage > 85% → P2 alert
  - [ ] Disk space > 80% → P2 alert
  - [ ] HTTP 5xx rate > 0.1% → P1 alert

- [ ] **Alert Delivery**
  - [ ] Email alerts for P1
  - [ ] Slack notifications for P1/P2
  - [ ] SMS for critical P0 issues
  - [ ] PagerDuty integration for on-call rotation

### Verification Commands
```bash
# Check Sentry integration
curl -H "Authorization: Bearer <token>" https://sentry.io/api/0/organizations/org-slug/projects/

# Test database monitoring
psql -c "SELECT * FROM pg_stat_statements LIMIT 10;" $DATABASE_URL

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

---

## 1.2.4 Backup & Disaster Recovery
**Owner**: Database Administrator | **Estimated Time**: 1.5 hours

### Automated Backup Setup
- [ ] **Daily Backups**
  - [ ] Full database dump: `/backups/daily/ceo_platform_$(date +%Y%m%d).dump`
  - [ ] Schedule: Every day at 2:00 AM UTC
  - [ ] Retention: 7 days minimum, 30 days optimal
  - [ ] Size: ~100MB per backup
  - [ ] Backup verification: Automated test restore

- [ ] **Weekly Backups**
  - [ ] Full database dump: `/backups/weekly/ceo_platform_$(date +%G_W%V).dump`
  - [ ] Schedule: Every Sunday at 3:00 AM UTC
  - [ ] Retention: 12 weeks minimum, 24 weeks optimal
  - [ ] Archive to cold storage (S3 Glacier)

- [ ] **Code Backups**
  - [ ] Repository backed up automatically (GitHub)
  - [ ] Create release tags for each deployment
  - [ ] Maintain deployment history (3+ previous versions)

### Backup Storage
- [ ] **Local Storage**
  - [ ] Location: `/backups/` on dedicated backup server
  - [ ] Separate disk/mount from production database
  - [ ] Raid configuration: RAID-1 or RAID-6

- [ ] **Remote Storage**
  - [ ] AWS S3 or equivalent cloud storage
  - [ ] Encryption at rest: AES-256
  - [ ] Daily sync of backups to cloud
  - [ ] Test cloud restore: Monthly

### Disaster Recovery Plan
- [ ] **Recovery Time Objective (RTO)**
  - [ ] Target: < 1 hour
  - [ ] Method: Restore from daily backup

- [ ] **Recovery Point Objective (RPO)**
  - [ ] Target: < 1 hour
  - [ ] Frequency: Hourly database snapshots (if available)

- [ ] **Restore Procedure**
  ```bash
  # Step 1: Stop application
  pm2 stop ceo-platform

  # Step 2: Create backup of corrupted database (for forensics)
  pg_dump -Fc ceo_platform > /backups/corrupted_ceo_platform_$(date +%Y%m%d_%H%M%S).dump

  # Step 3: Drop and recreate database
  dropdb ceo_platform
  createdb ceo_platform

  # Step 4: Restore from backup
  pg_restore -d ceo_platform /backups/daily/ceo_platform_20260303.dump

  # Step 5: Verify restore
  psql -c "SELECT count(*) FROM users;" ceo_platform

  # Step 6: Start application
  pm2 start ceo-platform
  ```

- [ ] **Restore Testing Schedule**
  - [ ] Monthly: Restore from daily backup
  - [ ] Quarterly: Restore from weekly backup
  - [ ] Document restore time and any issues

### Documentation
- [ ] **Recovery Runbook**
  - [ ] Complete step-by-step restore instructions
  - [ ] Contact list for database team
  - [ ] Escalation procedures
  - [ ] Documented assumptions and prerequisites

---

## 1.2.5 CDN & Response Caching Setup
**Owner**: DevOps Team | **Estimated Time**: 1.5 hours

### Static Asset Caching
- [ ] **Cloudflare Configuration** (or equivalent CDN)
  - [ ] Create zone for ceo-platform.example.com
  - [ ] Configure DNS to point to Cloudflare
  - [ ] Cache TTL for static assets: 1 year (images, fonts, CSS)
  - [ ] Browser cache TTL: 30 days
  - [ ] Rules:
    ```
    Pattern: /public/*
    Cache Level: Cache Everything
    Browser TTL: 1 year (31536000)

    Pattern: /api/*
    Cache Level: Bypass
    (Don't cache API responses)
    ```

- [ ] **Next.js Static Optimization**
  - [ ] Configure next.config.js
    ```javascript
    module.exports = {
      images: {
        domains: ['cdn.example.com'],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      },
      compress: true,
    }
    ```
  - [ ] Enable Image Optimization
  - [ ] Configure font preloading

### API Response Caching
- [ ] **Cache Strategy**
  ```
  GET /api/products
    - Cache: 5 minutes (public, products change infrequently)

  GET /api/orders
    - Cache: Don't cache (user-specific, changes frequently)

  GET /api/health
    - Cache: Don't cache (status endpoint)
  ```

- [ ] **HTTP Cache Headers**
  - [ ] Add to Next.js API responses
    ```javascript
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('CDN-Cache-Control', 'max-age=300');
    ```

- [ ] **Server-Side Rendering Cache**
  - [ ] Enable incremental static regeneration (ISR) for product pages
  - [ ] Revalidate interval: 60 seconds
  - [ ] On-demand revalidation webhook

### Compression
- [ ] **Gzip/Brotli Compression**
  - [ ] Enable on nginx/reverse proxy
  - [ ] Compression level: 6 (balanced)
  - [ ] Min-length: 1024 bytes
  - [ ] Types: text/html, application/json, text/css, application/javascript

### Performance Monitoring
- [ ] **Core Web Vitals Monitoring**
  - [ ] Monitor LCP (Largest Contentful Paint): Target < 2.5s
  - [ ] Monitor FID (First Input Delay): Target < 100ms
  - [ ] Monitor CLS (Cumulative Layout Shift): Target < 0.1
  - [ ] Use Sentry Performance to track

---

## Summary: Task 1.2 Checklist Status

### Database Preparation
- [ ] Pre-deployment backup created & verified
- [ ] Connection pooling configured (20 connections)
- [ ] Automated daily/weekly backups scheduled
- [ ] Backup retention policy: 30 days

### Application Server
- [ ] Next.js production build verified
- [ ] Environment variables configured
- [ ] SSL/TLS certificates installed and auto-renewal enabled
- [ ] nginx reverse proxy configured
- [ ] PM2 process manager setup with 4 cluster instances

### Monitoring & Alerting
- [ ] Sentry error tracking configured
- [ ] Database slow query logging enabled
- [ ] Infrastructure monitoring (CPU, memory, disk)
- [ ] Alert thresholds configured
- [ ] Log aggregation setup

### Backup & Disaster Recovery
- [ ] Daily backup script created and tested
- [ ] Weekly backup script created
- [ ] Remote backup storage (S3) configured
- [ ] Recovery procedure documented
- [ ] Restore testing scheduled (monthly)

### CDN & Caching
- [ ] Cloudflare configured with cache rules
- [ ] Static asset caching: 1 year
- [ ] API caching strategy: No cache (user-specific)
- [ ] Compression enabled (gzip/brotli)
- [ ] Performance monitoring enabled

---

**Task 1.2 Status**: 📋 **CHECKLIST CREATED - Ready for Infrastructure Team**
**Next Step**: Execute checklist items with infrastructure team
**Estimated Completion**: 2026-03-03 EOD
