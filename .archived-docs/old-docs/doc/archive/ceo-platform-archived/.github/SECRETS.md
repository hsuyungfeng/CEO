# GitHub Secrets 配置指南

## 概述
此文件說明需要在GitHub Repository中設置的Secrets，用於CI/CD流程。

## 必要 Secrets

### 1. 部署相關
| Secret 名稱 | 描述 | 範例值 |
|------------|------|--------|
| `DEPLOY_HOST` | 部署伺服器IP或域名 | `192.168.1.100` |
| `DEPLOY_USER` | 部署伺服器用戶名 | `deploy` |
| `DEPLOY_PATH` | 部署目錄路徑 | `/var/www/ceo-platform` |
| `SSH_PRIVATE_KEY` | SSH私鑰（用於部署） | `-----BEGIN RSA PRIVATE KEY-----...` |
| `APP_URL` | 應用URL（用於健康檢查） | `https://your-domain.com` |

### 2. 容器註冊表
| Secret 名稱 | 描述 | 獲取方式 |
|------------|------|----------|
| `GITHUB_TOKEN` | 自動生成，用於推送鏡像 | 自動設置 |
| `DOCKERHUB_USERNAME` | Docker Hub用戶名（如果使用） | 用戶註冊 |
| `DOCKERHUB_TOKEN` | Docker Hub訪問令牌 | Docker Hub設置 |

### 3. 安全掃描
| Secret 名稱 | 描述 | 獲取方式 |
|------------|------|----------|
| `SNYK_TOKEN` | Snyk安全掃描令牌 | [Snyk官網](https://snyk.io) |
| `TRIVY_USERNAME` | Trivy用戶名（可選） | 註冊獲取 |
| `TRIVY_PASSWORD` | Trivy密碼（可選） | 註冊獲取 |

### 4. 通知集成
| Secret 名稱 | 描述 | 獲取方式 |
|------------|------|----------|
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | Slack設置 |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | BotFather |
| `TELEGRAM_CHAT_ID` | Telegram Chat ID | Telegram |

## 設置步驟

### 1. 訪問GitHub Secrets設置
```
Settings → Secrets and variables → Actions → New repository secret
```

### 2. 生成SSH密鑰對
```bash
# 在本地生成SSH密鑰
ssh-keygen -t rsa -b 4096 -C "github-actions@ceo-platform" -f github-actions-key

# 將公鑰添加到伺服器的authorized_keys
cat github-actions-key.pub >> ~/.ssh/authorized_keys

# 將私鑰添加到GitHub Secrets
cat github-actions-key
```

### 3. 設置環境變數文件
在伺服器上創建 `.env.production` 文件：
```bash
# 在部署伺服器上
cd /var/www/ceo-platform
cp .env.production.example .env.production
vim .env.production  # 編輯環境變數
```

## 測試 Secrets

### 1. 測試SSH連接
```bash
# 在本地測試
ssh -i github-actions-key deploy@192.168.1.100 "echo 'SSH test successful'"
```

### 2. 測試部署腳本
```bash
# 在伺服器上測試
cd /var/www/ceo-platform
./scripts/deploy.sh production
```

### 3. 測試健康檢查
```bash
curl https://your-domain.com/api/health
```

## 安全最佳實踐

### 1. 密鑰管理
- 定期輪換密鑰（每90天）
- 使用不同的密鑰用於不同環境
- 限制密鑰權限（最小權限原則）

### 2. 訪問控制
- 限制IP訪問（防火牆規則）
- 使用VPN訪問生產環境
- 啟用雙因素認證

### 3. 監控與審計
- 記錄所有部署活動
- 監控異常訪問
- 定期審計Secrets使用

### 4. 備份與恢復
- 備份Secrets到安全位置
- 建立恢復流程
- 測試恢復流程

## 故障排除

### 1. SSH連接失敗
```bash
# 檢查SSH服務
sudo systemctl status ssh

# 檢查防火牆
sudo ufw status

# 檢查authorized_keys權限
chmod 600 ~/.ssh/authorized_keys
```

### 2. 部署失敗
```bash
# 檢查日誌
journalctl -u docker
docker-compose logs

# 檢查磁碟空間
df -h

# 檢查記憶體
free -h
```

### 3. 健康檢查失敗
```bash
# 檢查應用日誌
docker-compose logs app

# 檢查資料庫連接
docker-compose exec postgres pg_isready

# 檢查網路連接
curl -v http://localhost:3000/api/health
```

## 緊急情況

### 1. Secrets洩露
1. 立即撤銷所有受影響的Secrets
2. 生成新的密鑰對
3. 更新所有相關配置
4. 審計訪問日誌

### 2. 部署失敗回滾
```bash
# 回滾到上一個版本
git checkout <previous-commit>
./scripts/deploy.sh production

# 恢復資料庫備份
./scripts/restore.sh production backup_file.sql
```

### 3. 聯繫支援
- GitHub支援: https://support.github.com
- 安全問題: security@github.com
- 技術問題: 查看GitHub文檔

## 更新記錄

| 日期 | 版本 | 變更說明 |
|------|------|----------|
| 2026-02-08 | 1.0.0 | 初始版本 |
| - | - | - |

---

**重要提醒**：
- 不要將Secrets提交到版本控制
- 定期審計Secrets使用情況
- 遵循最小權限原則
- 建立緊急恢復流程