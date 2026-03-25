---
wave: 1
depends_on: [13]
files_modified:
  - .env.production
  - docker-compose.prod.yml
  - kubernetes/deployment.yaml
  - .github/workflows/deploy.yml
  - src/middleware.ts
  - prisma/schema.prisma
autonomous: false
---

# Phase 14 Plan — Production Deployment & Infrastructure Setup

## Wave 1: Production Environment & CI/CD Pipeline

### Task 14.1.1: Production Environment Configuration

<read_first>
- `.planning/phases/13-e2e-validation/13-SUMMARY.md` — Phase 13 completion & system readiness
- `.env.example` — Environment variables template
- `CLAUDE.md` — Project conventions
- `docker-compose.yml` — Current development setup (reference)
- `package.json` — Dependencies and build scripts
</read_first>

<action>
建立完整的生產環境配置：

1. 環境變數設置
   ```bash
   cp .env.example .env.production
   ```

   配置以下變數：
   ```
   # Database (Production PostgreSQL)
   DATABASE_URL=postgresql://prod_user:${DB_PASSWORD}@prod-db.internal/ceo_prod
   DIRECT_URL=postgresql://prod_user:${DB_PASSWORD}@prod-db.internal/ceo_prod

   # NextAuth
   NEXTAUTH_SECRET=${NEXTAUTH_SECRET_PROD}
   NEXTAUTH_URL=https://ceo.company.com

   # WebSocket (wss:// for production)
   WEBSOCKET_URL=wss://ceo.company.com/ws
   WEBSOCKET_DEV_MODE=false  # Production mode

   # Redis (for session store & rate limiting)
   REDIS_URL=redis://prod-redis:6379
   REDIS_PASSWORD=${REDIS_PASSWORD}

   # API Keys & Secrets
   STRIPE_PUBLIC_KEY=${STRIPE_PUBLIC_KEY}
   STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
   CRON_SECRET=${CRON_SECRET_PROD}

   # Monitoring & Logging
   SENTRY_DSN=${SENTRY_DSN}
   LOG_LEVEL=info

   # Email Service
   SENDGRID_API_KEY=${SENDGRID_API_KEY}
   ```

2. Docker 生產設定
   ```bash
   cat > docker-compose.prod.yml << 'DOCKER'
   version: '3.8'
   services:
     web:
       image: ceo-web:${VERSION}
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL
         - NEXTAUTH_SECRET
         - REDIS_URL
         - NODE_ENV=production
       depends_on:
         - db
         - redis
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
       restart: unless-stopped

     db:
       image: postgres:16-alpine
       environment:
         - POSTGRES_DB=ceo_prod
         - POSTGRES_USER=prod_user
         - POSTGRES_PASSWORD=${DB_PASSWORD}
       volumes:
         - db_data:/var/lib/postgresql/data
       restart: unless-stopped

     redis:
       image: redis:7-alpine
       command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
       volumes:
         - redis_data:/data
       restart: unless-stopped

   volumes:
     db_data:
     redis_data:
   DOCKER
   ```

3. Kubernetes 部署設定
   ```bash
   mkdir -p kubernetes
   cat > kubernetes/deployment.yaml << 'K8S'
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: ceo-web
     namespace: production
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: ceo-web
     template:
       metadata:
         labels:
           app: ceo-web
       spec:
         containers:
         - name: web
           image: ceo-web:${VERSION}
           ports:
           - containerPort: 3000
           env:
           - name: DATABASE_URL
             valueFrom:
               secretKeyRef:
                 name: db-secrets
                 key: connection-string
           - name: NEXTAUTH_SECRET
             valueFrom:
               secretKeyRef:
                 name: auth-secrets
                 key: secret
           livenessProbe:
             httpGet:
               path: /health
               port: 3000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /health
               port: 3000
             initialDelaySeconds: 5
             periodSeconds: 5
   K8S
   ```

4. 資料庫初始化
   ```bash
   # Run migrations
   npx prisma migrate deploy

   # Seed production data (if needed)
   npx prisma db seed
   ```

5. SSL/TLS 配置
   - 申請 SSL 憑證 (Let's Encrypt 或商業 CA)
   - 配置 HTTPS (wss:// for WebSocket)
   - 設定 HSTS 標頭

6. 備份策略
   - 資料庫每日備份
   - 備份到獨立存儲 (AWS S3、Azure Blob)
   - 驗證備份可還原性
</action>

<acceptance_criteria>
- [ ] .env.production 檔案已建立 (所有環境變數已配置)
- [ ] Docker Compose 生產設定已建立
- [ ] Kubernetes 部署配置已建立
- [ ] 資料庫連線正常 (驗證連線字串)
- [ ] Prisma migrations 已執行
- [ ] SSL/TLS 已配置
- [ ] 備份策略已驗證
- [ ] 健康檢查端點已測試
</acceptance_criteria>

---

### Task 14.1.2: CI/CD Pipeline Setup (GitHub Actions)

<read_first>
- `.github/workflows/` — GitHub Actions workflow directory
- `package.json` — Build and test scripts
- `.planning/phases/12-e2e-testing/12-SUMMARY.md` — Test specifications
- `playwright.config.ts` — E2E test configuration
</read_first>

<action>
建立完整的 CI/CD 流程：

1. 建立 GitHub Actions 工作流
   ```bash
   mkdir -p .github/workflows
   ```

2. 實裝 CI 流程 (test.yml)
   ```yaml
   name: Test & Build
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 20
         - run: npm ci
         - run: npm run lint
         - run: npm run typecheck
         - run: npm run test
         - run: npm run test:e2e

     build:
       runs-on: ubuntu-latest
       needs: test
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-artifact@v3
           with:
             name: build
             path: .next/
   ```

3. 實裝 CD 流程 (deploy.yml)
   ```yaml
   name: Deploy to Production
   on:
     push:
       branches: [main]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy to Production
           run: |
             npm run build
             docker build -t ceo-web:${GITHUB_SHA:0:7} .
             docker push registry.example.com/ceo-web:${GITHUB_SHA:0:7}
             # Trigger Kubernetes rollout
   ```

4. 部署安全檢查
   - 所有密鑰通過 GitHub Secrets 傳遞
   - 部署前執行安全掃描
   - 批准流程 (需人工核准)

5. 監控與告警
   - 部署失敗告警
   - 性能降低告警
   - 錯誤率突增告警

6. 藍綠部署策略
   - 新版本部署至綠環境
   - 執行煙霧測試
   - 逐步流量轉移 (0% → 50% → 100%)
   - 監控指標
   - 出現問題立即回滾
</action>

<acceptance_criteria>
- [ ] .github/workflows/test.yml 已建立並執行成功
- [ ] .github/workflows/deploy.yml 已建立
- [ ] Linting 在 CI 中執行
- [ ] TypeScript 類型檢查在 CI 中執行
- [ ] Unit tests 在 CI 中執行
- [ ] E2E tests 在 CI 中執行
- [ ] Build artifact 生成並可下載
- [ ] 部署流程已驗證
- [ ] 藍綠部署策略已實裝
- [ ] 回滾流程已測試
</acceptance_criteria>

---

### Task 14.1.3: Monitoring, Logging & Observability

<read_first>
- `src/middleware.ts` — Request logging middleware
- `src/lib/audit-logger.ts` — Audit logging system
- `package.json` — Dependencies
- `.env.production` — Monitoring configuration
</read_first>

<action>
建立完整的監控、日誌與可觀測性系統：

1. 結構化日誌設置
   ```typescript
   // src/lib/logger.ts
   import pino from 'pino';

   const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: {
       target: 'pino-pretty',
       options: {
         colorize: false,
         singleLine: true,
         translateTime: 'yyyy-mm-dd HH:MM:ss Z'
       }
     }
   });

   export default logger;
   ```

2. 應用性能監控 (APM)
   - 安裝 Sentry for error tracking
   - 配置 New Relic 或 Datadog 性能監控
   - 記錄關鍵操作的執行時間

3. 日誌聚合
   - 配置 ELK Stack (Elasticsearch, Logstash, Kibana)
   - 或使用 CloudWatch/Stackdriver
   - 日誌保留 30 天

4. 指標收集
   ```bash
   # Prometheus metrics
   - HTTP requests (duration, status)
   - Database queries (count, duration)
   - WebSocket connections (active count, duration)
   - Cache hit rate
   - Error rate
   ```

5. 告警設定
   ```
   - Error rate > 1%
   - Response time p99 > 1000ms
   - Database connection pool exhausted
   - WebSocket connection failures > 10/min
   - Disk space < 10%
   - Memory usage > 80%
   ```

6. 儀表板設置
   - 系統健康狀況概覽
   - 實時性能指標
   - 錯誤日誌與追蹤
   - 使用者活動監控

7. 分佈式追蹤
   - 配置 OpenTelemetry
   - 追蹤請求從前端到資料庫
   - 識別性能瓶頸
</action>

<acceptance_criteria>
- [ ] 結構化日誌已實裝
- [ ] Sentry 集成已配置
- [ ] APM 工具已集成
- [ ] Prometheus metrics 已暴露
- [ ] ELK Stack/CloudWatch 已配置
- [ ] 告警規則已設定
- [ ] 監控儀表板已建立
- [ ] 分佈式追蹤已啟用
- [ ] 日誌採樣已配置 (減少開銷)
</acceptance_criteria>

---

### Task 14.1.4: Security Hardening & Compliance

<read_first>
- `src/middleware.ts` — CSRF, rate limiting middleware
- `src/auth.ts` — Authentication configuration
- `.env.production` — Security configuration
- `CLAUDE.md` — Project security guidelines
</read_first>

<action>
實裝完整的安全加強與合規檢查：

1. 安全標頭設置
   ```bash
   # middleware.ts - Add security headers
   - Content-Security-Policy
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security (HSTS)
   - Referrer-Policy: strict-origin-when-cross-origin
   ```

2. 速率限制 (Redis-based)
   ```typescript
   // Limit requests per IP
   - API endpoints: 100 req/min
   - Login attempts: 5 req/5min
   - Password reset: 3 req/hour
   - WebSocket connections: 10 per IP
   ```

3. CORS 配置
   ```
   - 只允許 HTTPS
   - 指定 allowed origins
   - 設定 credentials 政策
   - 預檢快取時間
   ```

4. 資料保護
   - 敏感資料加密 (至靜態與傳輸中)
   - PII 資料遮蔽 (日誌中)
   - 資料庫備份加密
   - 密鑰輪替政策

5. 認証與授權
   - JWT token expiration: 30 days
   - Refresh token: 1 year
   - Session timeout: 24 hours
   - Multi-factor authentication (可選)

6. 依賴項安全
   ```bash
   # 定期掃描依賴項
   npm audit
   snyk test

   # 自動更新
   Dependabot 已啟用
   ```

7. 合規檢查
   ```
   - GDPR: 資料隱私政策、用戶同意
   - CCPA: 數據出口、刪除功能
   - PCI-DSS: 支付卡數據安全 (若有)
   ```

8. 安全測試
   - OWASP Top 10 檢查
   - SQL injection 測試 (已通過 Phase 11)
   - XSS 測試
   - CSRF 測試 (已通過 Phase 10)

9. 密鑰管理
   - 使用 AWS Secrets Manager / Azure Key Vault
   - 定期輪替密鑰
   - 禁止在代碼中儲存密鑰
   - 追蹤密鑰訪問日誌
</action>

<acceptance_criteria>
- [ ] 所有安全標頭已設置
- [ ] 速率限制已實裝並測試
- [ ] CORS 已正確配置
- [ ] 資料加密已啟用 (傳輸中與靜態)
- [ ] 依賴項掃描已整合到 CI
- [ ] GDPR/CCPA 合規檢查已完成
- [ ] OWASP Top 10 測試已通過
- [ ] 密鑰管理已配置
- [ ] 安全報告已生成
</acceptance_criteria>

---

## Verification Criteria

**All tasks must pass acceptance criteria before phase completion.**

### Production Readiness
- Environment variables properly configured
- Database migrations successful
- SSL/TLS working correctly
- Backup strategy verified

### CI/CD Pipeline
- All tests passing in CI
- Build artifacts generated
- Deployment process automated
- Rollback capability verified

### Observability
- Logging aggregation working
- Metrics collection active
- Alerts configured and tested
- Monitoring dashboards accessible

### Security
- All security headers set
- Rate limiting active
- Data encryption enabled
- Dependency scanning running

---

## Dependencies

Depends on Phase 13 (E2E validation complete, system score 95.2/100)

---

## Must-Haves

To declare Phase 14 complete:

1. ✅ Production environment configured
2. ✅ CI/CD pipeline operational
3. ✅ Monitoring & logging active
4. ✅ Security hardening implemented
5. ✅ Health checks passing
6. ✅ Backup strategy verified
7. ✅ Deployment process tested
8. ✅ Rollback procedure verified
9. ✅ System ready for production traffic
10. ✅ System score maintained at 95/100+

---

*Phase 14: Production Deployment & Infrastructure Setup*
*Created: 2026-03-25*
*Status: Ready for Execution*
