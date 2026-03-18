-- ============================================
-- CEO Platform - PostgreSQL 初始化腳本
-- ============================================
-- 此腳本在容器首次啟動時執行
-- 創建必要的擴展和配置

-- 啟用擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 設置資料庫參數
ALTER DATABASE ceo_platform_production SET timezone TO 'Asia/Taipei';

-- 創建備份用戶（用於自動備份）
CREATE USER backup_user WITH PASSWORD 'BackupUserPassword123!';
GRANT CONNECT ON DATABASE ceo_platform_production TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

-- 設置表空間（可選）
-- CREATE TABLESPACE ceo_data LOCATION '/var/lib/postgresql/data';

-- 記錄初始化完成
DO $$
BEGIN
    RAISE NOTICE 'CEO Platform 資料庫初始化完成 - %', now();
END $$;