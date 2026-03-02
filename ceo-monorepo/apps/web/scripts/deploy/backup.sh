#!/bin/bash

# ============================================
# CEO Platform - 資料庫備份腳本
# ============================================
# 使用方法: ./scripts/backup.sh [環境]
# 建議設置定時任務: crontab -e
# 0 2 * * * /path/to/ceo-platform/scripts/backup.sh production

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查Docker服務
check_docker() {
    if ! docker-compose ps | grep -q "postgres"; then
        print_error "PostgreSQL容器未運行"
        exit 1
    fi
}

# 執行備份
perform_backup() {
    local env=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups/$env"
    local backup_file="$backup_dir/backup_$timestamp.sql"
    local compressed_file="$backup_file.gz"
    
    # 創建備份目錄
    mkdir -p "$backup_dir"
    
    print_info "開始備份資料庫 ($env)..."
    
    # 執行備份
    if docker-compose exec -T postgres pg_dump -U ceo_admin ceo_platform_$env \
        --clean --if-exists --no-owner --no-privileges > "$backup_file"; then
        
        # 壓縮備份文件
        gzip -f "$backup_file"
        
        print_success "備份完成: $compressed_file"
        
        # 記錄備份信息
        echo "$timestamp: $compressed_file ($(stat -f%z "$compressed_file") bytes)" >> "$backup_dir/backup.log"
        
        # 清理舊備份（保留最近30天）
        find "$backup_dir" -name "*.sql.gz" -mtime +30 -delete
        
        # 檢查磁碟空間
        local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
        if [ "$disk_usage" -gt 80 ]; then
            print_warning "磁碟空間使用率超過80%: $disk_usage%"
        fi
        
        return 0
    else
        print_error "備份失敗"
        return 1
    fi
}

# 驗證備份
verify_backup() {
    local env=$1
    local backup_dir="backups/$env"
    local latest_backup=$(ls -t "$backup_dir"/*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        print_error "找不到備份文件"
        return 1
    fi
    
    print_info "驗證備份文件: $latest_backup"
    
    # 檢查文件完整性
    if gzip -t "$latest_backup"; then
        print_success "備份文件完整性檢查通過"
        
        # 檢查文件大小
        local file_size=$(stat -f%z "$latest_backup")
        if [ "$file_size" -lt 1024 ]; then
            print_warning "備份文件大小異常: $file_size bytes"
        fi
        
        return 0
    else
        print_error "備份文件損壞"
        return 1
    fi
}

# 發送通知（可選）
send_notification() {
    local env=$1
    local status=$2
    local message=$3
    
    # 這裡可以集成郵件、Slack、Telegram等通知
    # 例如: curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$message\"}" $SLACK_WEBHOOK_URL
    
    print_info "備份狀態: $status - $message"
}

# 主函數
main() {
    local env=${1:-production}
    local start_time=$(date +%s)
    
    print_info "開始資料庫備份 ($env)"
    print_info "開始時間: $(date)"
    
    # 檢查環境
    if [[ ! "$env" =~ ^(production|staging|development)$ ]]; then
        print_error "無效的環境: $env"
        exit 1
    fi
    
    # 檢查Docker
    check_docker
    
    # 執行備份
    if perform_backup "$env"; then
        local status="SUCCESS"
        local message="資料庫備份成功"
        
        # 驗證備份
        if verify_backup "$env"; then
            print_success "備份驗證通過"
        else
            status="WARNING"
            message="備份完成但驗證失敗"
            print_warning "$message"
        fi
    else
        local status="FAILED"
        local message="資料庫備份失敗"
        print_error "$message"
    fi
    
    # 計算執行時間
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 發送通知
    send_notification "$env" "$status" "$message (耗時: ${duration}秒)"
    
    print_info "備份完成時間: $(date)"
    print_info "總耗時: ${duration}秒"
    
    if [ "$status" = "SUCCESS" ]; then
        print_success "資料庫備份流程完成"
        exit 0
    else
        print_error "資料庫備份流程失敗"
        exit 1
    fi
}

# 執行主函數
main "$@"