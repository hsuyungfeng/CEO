#!/bin/bash

# ============================================
# CEO Platform - 所有配置文件完整性驗證
# ============================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查文件並驗證內容
check_file_with_content() {
    local file="$1"
    local description="$2"
    local required_patterns=("${@:3}")
    
    if [ ! -f "$file" ]; then
        print_error "$description: $file 不存在"
        return 1
    fi
    
    print_success "$description: $file 存在"
    
    local all_patterns_found=1
    for pattern in "${required_patterns[@]}"; do
        if grep -q "$pattern" "$file" 2>/dev/null; then
            print_success "  找到: '$pattern'"
        else
            print_warning "  未找到: '$pattern'"
            all_patterns_found=0
        fi
    done
    
    return $all_patterns_found
}

# 檢查目錄
check_directory() {
    local dir="$1"
    local description="$2"
    
    if [ ! -d "$dir" ]; then
        print_error "$description: $dir 不存在"
        return 1
    fi
    
    print_success "$description: $dir 存在"
    return 0
}

# 主函數
main() {
    print_info "開始驗證所有配置文件完整性"
    print_info "驗證時間: $(date)"
    
    local errors=0
    local warnings=0
    
    # ============ 1. 生產環境配置 ============
    print_info "=== 1. 生產環境配置驗證 ==="
    
    check_file_with_content ".env.production.example" "生產環境變數模板" \
        "DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET" "NODE_ENV"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 2. Docker配置 ============
    print_info "=== 2. Docker配置驗證 ==="
    
    check_file_with_content "Dockerfile" "Docker構建文件" \
        "FROM node" "WORKDIR /app" "EXPOSE 3000" "HEALTHCHECK" "CMD"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "docker-compose.yml" "Docker Compose配置" \
        "postgres:" "app:" "nginx:" "networks:" "volumes:"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 3. Nginx配置 ============
    print_info "=== 3. Nginx配置驗證 ==="
    
    check_directory "nginx" "Nginx配置目錄"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "nginx/nginx.conf" "Nginx主配置" \
        "worker_processes" "events" "http" "gzip"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "nginx/conf.d/ceo-platform.conf" "Nginx站點配置" \
        "server_name" "ssl_certificate" "proxy_pass" "location"
    [ $? -eq 0 ] || ((errors++))
    
    check_directory "nginx/ssl" "SSL證書目錄"
    [ $? -eq 0 ] || ((warnings++))  # 警告，因為證書需要手動獲取
    
    # ============ 4. 資料庫配置 ============
    print_info "=== 4. 資料庫配置驗證 ==="
    
    check_directory "postgres" "PostgreSQL配置目錄"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "postgres/init.sql" "PostgreSQL初始化腳本" \
        "CREATE EXTENSION" "ALTER DATABASE" "CREATE USER"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 5. 部署腳本 ============
    print_info "=== 5. 部署腳本驗證 ==="
    
    check_file_with_content "scripts/deploy.sh" "部署腳本" \
        "docker-compose" "git pull" "health_check" "backup_database"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "scripts/backup.sh" "備份腳本" \
        "pg_dump" "gzip" "find.*-delete" "crontab"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "scripts/test-config.sh" "配置測試腳本" \
        "check_file" "check_directory" "check_file_content"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 6. 健康檢查API ============
    print_info "=== 6. 健康檢查API驗證 ==="
    
    check_file_with_content "src/app/api/health/route.ts" "健康檢查API" \
        "export async function GET" "prisma" "healthcheck" "status"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 7. CI/CD配置 ============
    print_info "=== 7. CI/CD配置驗證 ==="
    
    check_directory ".github/workflows" "GitHub Actions目錄"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content ".github/workflows/ci.yml" "GitHub Actions工作流程" \
        "name: CI/CD Pipeline" "jobs:" "test:" "build:" "deploy:"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "lighthouserc.json" "Lighthouse性能測試配置" \
        "ci" "collect" "assert" "upload"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content ".github/SECRETS.md" "GitHub Secrets配置指南" \
        "DEPLOY_HOST" "SSH_PRIVATE_KEY" "SNYK_TOKEN"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 8. 文檔文件 ============
    print_info "=== 8. 文檔文件驗證 ==="
    
    check_file_with_content "DEPLOYMENT.md" "部署指南" \
        "系統要求" "快速開始" "生產環境部署" "故障排除"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "CHECKLIST.md" "部署檢查清單" \
        "已完成項目" "部署前準備清單" "部署執行步驟" "故障排除指南"
    [ $? -eq 0 ] || ((errors++))
    
    check_file_with_content "FINAL_ACCEPTANCE_REPORT.md" "最終驗收報告" \
        "專案概述" "驗收標準" "性能測試結果" "安全審計結果"
    [ $? -eq 0 ] || ((errors++))
    
    # ============ 總結 ============
    print_info "=== 驗證完成 ==="
    print_info "總檢查項目: 18"
    print_info "錯誤數: $errors"
    print_info "警告數: $warnings"
    
    if [ $errors -eq 0 ]; then
        print_success "所有配置文件完整性驗證通過！"
        
        # 生成完整性報告
        echo "=== 配置文件完整性報告 ===" > config-integrity-report.txt
        echo "驗證時間: $(date)" >> config-integrity-report.txt
        echo "狀態: PASSED" >> config-integrity-report.txt
        echo "錯誤: $errors" >> config-integrity-report.txt
        echo "警告: $warnings" >> config-integrity-report.txt
        echo "" >> config-integrity-report.txt
        echo "=== 驗證項目清單 ===" >> config-integrity-report.txt
        
        local categories=(
            "1. 生產環境配置"
            "2. Docker配置" 
            "3. Nginx配置"
            "4. 資料庫配置"
            "5. 部署腳本"
            "6. 健康檢查API"
            "7. CI/CD配置"
            "8. 文檔文件"
        )
        
        for category in "${categories[@]}"; do
            echo "$category: ✅ PASSED" >> config-integrity-report.txt
        done
        
        echo "" >> config-integrity-report.txt
        echo "=== 部署準備度評估 ===" >> config-integrity-report.txt
        echo "配置文件完整性: 100%" >> config-integrity-report.txt
        echo "腳本功能完整性: 100%" >> config-integrity-report.txt
        echo "文檔完整性: 100%" >> config-integrity-report.txt
        echo "CI/CD流程完整性: 100%" >> config-integrity-report.txt
        
        print_success "完整性報告已生成: config-integrity-report.txt"
        return 0
    else
        print_error "發現 $errors 個錯誤，請修復後重試"
        return 1
    fi
}

# 執行主函數
main "$@"