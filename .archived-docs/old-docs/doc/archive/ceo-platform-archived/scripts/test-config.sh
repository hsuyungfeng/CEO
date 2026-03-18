#!/bin/bash

# ============================================
# CEO Platform - 配置測試腳本
# ============================================
# 測試生產環境配置是否正確

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

# 檢查文件是否存在
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        print_success "$description: $file"
        return 0
    else
        print_error "$description: $file 不存在"
        return 1
    fi
}

# 檢查目錄是否存在
check_directory() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        print_success "$description: $dir"
        return 0
    else
        print_error "$description: $dir 不存在"
        return 1
    fi
}

# 檢查文件內容
check_file_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        print_success "$description: 找到 '$pattern'"
        return 0
    else
        print_warning "$description: 未找到 '$pattern'"
        return 1
    fi
}

# 主函數
main() {
    print_info "開始測試 CEO Platform 配置"
    print_info "測試時間: $(date)"
    
    local errors=0
    local warnings=0
    
    # ============ 檢查必要文件 ============
    print_info "檢查必要文件..."
    
    # 配置文件
    check_file ".env.production.example" "生產環境變數模板" || ((errors++))
    check_file "Dockerfile" "Docker構建文件" || ((errors++))
    check_file "docker-compose.yml" "Docker Compose配置" || ((errors++))
    check_file "DEPLOYMENT.md" "部署文檔" || ((errors++))
    
    # Nginx配置
    check_file "nginx/nginx.conf" "Nginx主配置" || ((errors++))
    check_file "nginx/conf.d/ceo-platform.conf" "Nginx站點配置" || ((errors++))
    check_directory "nginx/ssl" "SSL證書目錄" || ((warnings++))
    
    # 資料庫配置
    check_file "postgres/init.sql" "PostgreSQL初始化腳本" || ((errors++))
    
    # 部署腳本
    check_file "scripts/deploy.sh" "部署腳本" || ((errors++))
    check_file "scripts/backup.sh" "備份腳本" || ((errors++))
    
    # 健康檢查API
    check_file "src/app/api/health/route.ts" "健康檢查API" || ((errors++))
    
    # ============ 檢查文件內容 ============
    print_info "檢查文件內容..."
    
    # 檢查Dockerfile內容
    check_file_content "Dockerfile" "FROM node" "Dockerfile基礎鏡像" || ((warnings++))
    check_file_content "Dockerfile" "EXPOSE 3000" "Dockerfile暴露端口" || ((warnings++))
    check_file_content "Dockerfile" "HEALTHCHECK" "Dockerfile健康檢查" || ((warnings++))
    
    # 檢查docker-compose內容
    check_file_content "docker-compose.yml" "postgres" "Docker Compose PostgreSQL服務" || ((warnings++))
    check_file_content "docker-compose.yml" "app" "Docker Compose應用服務" || ((warnings++))
    check_file_content "docker-compose.yml" "nginx" "Docker Compose Nginx服務" || ((warnings++))
    check_file_content "docker-compose.yml" "healthcheck" "Docker Compose健康檢查" || ((warnings++))
    
    # 檢查部署腳本內容
    check_file_content "scripts/deploy.sh" "docker-compose" "部署腳本Docker命令" || ((warnings++))
    check_file_content "scripts/deploy.sh" "git pull" "部署腳本代碼更新" || ((warnings++))
    check_file_content "scripts/deploy.sh" "health_check" "部署腳本健康檢查" || ((warnings++))
    
    # ============ 檢查權限 ============
    print_info "檢查腳本權限..."
    
    if [ -x "scripts/deploy.sh" ]; then
        print_success "部署腳本可執行"
    else
        print_warning "部署腳本不可執行，正在設置權限..."
        chmod +x scripts/deploy.sh
    fi
    
    if [ -x "scripts/backup.sh" ]; then
        print_success "備份腳本可執行"
    else
        print_warning "備份腳本不可執行，正在設置權限..."
        chmod +x scripts/backup.sh
    fi
    
    # ============ 檢查GitHub Actions配置 ============
    print_info "檢查CI/CD配置..."
    
    check_file ".github/workflows/ci.yml" "GitHub Actions工作流程" || ((warnings++))
    check_file "lighthouserc.json" "Lighthouse性能測試配置" || ((warnings++))
    check_file ".github/SECRETS.md" "GitHub Secrets配置指南" || ((warnings++))
    
    # ============ 總結 ============
    print_info "測試完成"
    print_info "錯誤數: $errors"
    print_info "警告數: $warnings"
    
    if [ $errors -eq 0 ]; then
        print_success "所有必要配置檢查通過！"
        print_info "下一步："
        print_info "1. 複製環境變數: cp .env.production.example .env.production"
        print_info "2. 編輯 .env.production 文件"
        print_info "3. 測試本地部署: ./scripts/deploy.sh production"
        
        # 生成配置摘要
        echo "=== 配置測試報告 ===" > config-test-report.txt
        echo "測試時間: $(date)" >> config-test-report.txt
        echo "狀態: PASSED" >> config-test-report.txt
        echo "錯誤: $errors" >> config-test-report.txt
        echo "警告: $warnings" >> config-test-report.txt
        echo "=== 文件清單 ===" >> config-test-report.txt
        find . -type f -name "*.yml" -o -name "*.yaml" -o -name "Dockerfile" -o -name "*.sh" -o -name "*.md" | sort >> config-test-report.txt
        
        print_success "配置報告已生成: config-test-report.txt"
        return 0
    else
        print_error "發現 $errors 個錯誤，請修復後重試"
        return 1
    fi
}

# 執行主函數
main "$@"