# CEO團購電商平台 - 資料庫種子資料

## 已完成的項目

### 1. 初始遷移檔案
- 位置：`prisma/migrations/20260208023419_init/migration.sql`
- 包含所有資料表結構和約束
- 已成功建立資料庫結構

### 2. 種子資料
已成功插入以下測試資料：

#### 使用者 (3位)
- **管理員**：admin@example.com (密碼: admin123)
  - 角色：SUPER_ADMIN
  - 點數：1000點
- **會員1**：member1@example.com (密碼: member123)
  - 角色：MEMBER
  - 點數：500點
- **會員2**：member2@example.com (密碼: member456)
  - 角色：MEMBER
  - 點數：300點

#### 分類樹 (4個分類，三級結構)
1. **藥品** (第一級)
   - **感冒藥** (第二級)
     - **綜合感冒藥** (第三級)
     - **止咳藥** (第三級)

#### 廠商 (2家)
1. 台灣製藥股份有限公司
2. 中華藥業有限公司

#### 商品 (3個，含階梯定價)
1. **綜合感冒膠囊**
   - 廠商：台灣製藥股份有限公司
   - 分類：綜合感冒藥
   - 階梯定價：1個150元, 10個135元, 50個120元, 100個100元

2. **止咳糖漿**
   - 廠商：中華藥業有限公司
   - 分類：止咳藥
   - 階梯定價：1個180元, 5個170元, 20個160元, 50個150元

3. **感冒熱飲**
   - 廠商：台灣製藥股份有限公司
   - 分類：綜合感冒藥
   - 階梯定價：1個120元, 10個110元, 30個100元, 100個90元

#### 常見問題 (5個)
涵蓋會員註冊、訂單查詢、退換貨政策等常見問題

## 如何使用

### 執行種子資料
```bash
# 方法1：使用npm腳本
pnpm db:seed

# 方法2：直接執行SQL
psql "postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform" -f prisma/seed-simple.sql
```

### 驗證資料
```bash
# 檢查資料數量
psql "postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform" -c "
SELECT '使用者數量:' as label, COUNT(*) as count FROM users 
UNION ALL SELECT '分類數量:', COUNT(*) FROM categories 
UNION ALL SELECT '廠商數量:', COUNT(*) FROM firms 
UNION ALL SELECT '商品數量:', COUNT(*) FROM products 
UNION ALL SELECT '階梯定價數量:', COUNT(*) FROM price_tiers 
UNION ALL SELECT '常見問題數量:', COUNT(*) FROM faqs;"
```

### 登入測試帳號
- 管理員後台：admin@example.com / admin123
- 會員帳號1：member1@example.com / member123
- 會員帳號2：member2@example.com / member456

## 技術細節

### 密碼加密
所有密碼使用bcrypt加密（12輪鹽值）：
- admin123 → `$2b$12$xFXyy72MFf3k4qTQ.vHj3OPfSMpfWoViV2zAq8/sWDTC2Z4WCSJ0q`
- member123 → `$2b$12$oWhImf8mXKBhQEmHT2Z6.eCxgYEA1KLQmc9JMhr9ySg5bTeOtKKi2`
- member456 → `$2b$12$5NBgKY.I0u/D2qcwtOeDHeFQrDlygdgynh6V0xLtfJuArMNg6FTJ6`

### 資料庫連線
- 主機：localhost:5432
- 資料庫：ceo_platform
- 使用者：ceo_admin
- 密碼：SecureDevPass_2026!

### 安全注意事項
1. 生產環境請修改預設密碼
2. 請更新管理員email為實際管理員email
3. 建議定期更換資料庫密碼
4. 測試資料僅供開發環境使用