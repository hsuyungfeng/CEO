# CEO Platform - 部署指南

## 目錄
1. [系統要求](#系統要求)
2. [快速開始](#快速開始)
3. [生產環境部署](#生產環境部署)
4. [環境變數配置](#環境變數配置)
5. [SSL證書配置](#ssl證書配置)
6. [資料庫管理](#資料庫管理)
7. [監控與維護](#監控與維護)
8. [故障排除](#故障排除)

## 系統要求

### 硬體要求
- **CPU**: 2核心以上
- **記憶體**: 4GB以上
- **儲存空間**: 20GB以上（建議SSD）
- **網路**: 穩定的網路連接

### 軟體要求
- **作業系統**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.30+

### 網路要求
- **端口**: 80 (HTTP), 443 (HTTPS), 5432 (PostgreSQL)
- **域名**: 有效的域名（用於SSL證書）

## 快速開始

### 1. 克隆代碼庫
```bash
git clone https://github.com/your-org/ceo-platform.git
cd ceo-platform
```

### 2. 準備環境變數
```bash
# 複製環境變數模板
cp .env.production.example .env.production

# 編輯環境變數
vim .env.production
```

### 3. 啟動服務（開發模式）
```bash
# 使用Docker Compose啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

### 4. 訪問應用
- 前端: http://localhost:3000
- 後台管理: http://localhost:3000/admin
- 健康檢查: http://localhost:3000/api/health

## 生產環境部署

### 1. 伺服器準備
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安裝Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 添加用戶到docker組
sudo usermod -aG docker $USER
```

### 2. 防火牆配置
```bash
# 啟用UFW
sudo ufw enable

# 開放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL（可選，建議只內網訪問）

# 查看規則
sudo ufw status
```

### 3. 部署應用
```bash
# 使用部署腳本
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### 4. 驗證部署
```bash
# 檢查服務狀態
docker-compose ps

# 檢查應用日誌
docker-compose logs app

# 健康檢查
curl http://localhost:3000/api/health
```

## 環境變數配置

### 必要環境變數
```bash
# 資料庫配置
DATABASE_URL="postgresql://ceo_admin:SecurePassword123!@postgres:5432/ceo_platform_production"

# NextAuth配置
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# 應用配置
NODE_ENV="production"
BCRYPT_SALT_ROUNDS=12
```

### 生成安全密鑰
```bash
# 生成NEXTAUTH_SECRET
openssl rand -base64 32

# 生成資料庫密碼
openssl rand -base64 16

# 生成Redis密碼（如果使用）
openssl rand -base64 16
```

## SSL證書配置

### 使用Let's Encrypt
```bash
# 安裝certbot
sudo apt install certbot python3-certbot-nginx -y

# 獲取證書
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 測試自動更新
sudo certbot renew --dry-run
```

### 手動配置SSL
1. 將證書文件複製到 `nginx/ssl/` 目錄
2. 更新Nginx配置中的證書路徑
3. 重啟Nginx服務

## 資料庫管理

### 備份資料庫
```bash
# 使用備份腳本
./scripts/backup.sh production

# 手動備份
docker-compose exec postgres pg_dump -U ceo_admin ceo_platform_production > backup_$(date +%Y%m%d).sql
```

### 恢復資料庫
```bash
# 停止應用
docker-compose stop app

# 恢復備份
cat backup_file.sql | docker-compose exec -T postgres psql -U ceo_admin -d ceo_platform_production

# 啟動應用
docker-compose start app
```

### 資料庫維護
```bash
# 查看資料庫大小
docker-compose exec postgres psql -U ceo_admin -d ceo_platform_production -c "SELECT pg_size_pretty(pg_database_size('ceo_platform_production'));"

# 查看連接數
docker-compose exec postgres psql -U ceo_admin -d ceo_platform_production -c "SELECT count(*) FROM pg_stat_activity;"

# 清理舊資料（可選）
# 根據業務需求設置資料保留策略
```

## 監控與維護

### 日誌管理
```bash
# 查看實時日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs app
docker-compose logs nginx
docker-compose logs postgres

# 日誌輪轉配置（在伺服器上）
sudo vim /etc/logrotate.d/ceo-platform
```

### 性能監控
```bash
# 查看容器資源使用
docker stats

# 查看應用性能
curl http://localhost:3000/api/health

# 監控資料庫性能
docker-compose exec postgres psql -U ceo_admin -d ceo_platform_production -c "SELECT * FROM pg_stat_activity;"
```

### 定期維護任務
```bash
# 1. 每日備份（添加到crontab）
0 2 * * * /path/to/ceo-platform/scripts/backup.sh production

# 2. 日誌清理（每週）
0 3 * * 0 find /path/to/ceo-platform/logs -name "*.log" -mtime +7 -delete

# 3. Docker清理（每月）
0 4 1 * * docker system prune -f

# 4. SSL證書更新（自動）
0 0 * * * certbot renew --quiet
```

## 故障排除

### 常見問題

#### 1. 應用無法啟動
```bash
# 檢查日誌
docker-compose logs app

# 檢查環境變數
docker-compose exec app printenv | grep -E "(DATABASE|NEXTAUTH)"

# 檢查資料庫連接
docker-compose exec postgres pg_isready -U ceo_admin
```

#### 2. 資料庫連接失敗
```bash
# 檢查PostgreSQL服務
docker-compose ps postgres

# 檢查資料庫日誌
docker-compose logs postgres

# 測試資料庫連接
docker-compose exec postgres psql -U ceo_admin -d ceo_platform_production -c "SELECT 1;"
```

#### 3. Nginx配置錯誤
```bash
# 測試Nginx配置
docker-compose exec nginx nginx -t

# 檢查Nginx日誌
docker-compose logs nginx

# 重新加載配置
docker-compose exec nginx nginx -s reload
```

#### 4. 記憶體不足
```bash
# 查看記憶體使用
free -h

# 查看Docker資源使用
docker stats

# 調整Docker記憶體限制
sudo vim /etc/docker/daemon.json
```

### 緊急恢復步驟

1. **備份當前狀態**
   ```bash
   ./scripts/backup.sh production
   docker-compose logs > logs_$(date +%Y%m%d_%H%M%S).txt
   ```

2. **回滾到上一個版本**
   ```bash
   git checkout <previous-commit>
   ./scripts/deploy.sh production
   ```

3. **恢復資料庫**
   ```bash
   # 使用最近的備份
   ./scripts/restore.sh production backup_file.sql
   ```

4. **聯繫支援**
   - 提供錯誤日誌
   - 描述問題現象
   - 提供時間戳記

## 安全最佳實踐

### 1. 定期更新
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 更新Docker鏡像
docker-compose pull
docker-compose up -d
```

### 2. 安全掃描
```bash
# 掃描Docker鏡像
docker scan ceo-platform:latest

# 檢查安全配置
npm audit
```

### 3. 訪問控制
- 使用強密碼
- 啟用雙因素認證
- 限制管理員訪問IP
- 定期輪換密鑰

### 4. 監控與告警
- 設置資源使用告警
- 監控異常登入
- 記錄安全事件
- 定期安全審計

## 支援與聯繫

### 文件資源
- [API文檔](./docs/api.md)
- [管理員手冊](./docs/admin-guide.md)
- [開發者指南](./docs/developer-guide.md)

### 問題回報
1. 檢查現有問題
2. 提供詳細信息
3. 附上相關日誌
4. 描述重現步驟

### 緊急聯絡
- 技術支援: support@your-domain.com
- 安全問題: security@your-domain.com
- 業務諮詢: business@your-domain.com

---

**最後更新**: 2026-02-08  
**版本**: 1.0.0  
**維護者**: CEO Platform Team