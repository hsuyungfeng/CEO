#!/bin/bash

# ============================================
# CEO Platform - 部署腳本
# ============================================
# 使用方法: ./scripts/deploy.sh [環境]
# 環境: production, staging, development

set -e  # 遇到錯誤時停止執行

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
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

# 檢查必要命令
check_requirements() {
    local missing=0
    
    for cmd in docker docker-compose git; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd 未安裝"
            missing=1
        fi
    done
    
    if [ $missing -eq 1 ]; then
        print_error "請安裝缺少的依賴"
        exit 1
    fi
}

# 檢查環境變數文件
check_env_file() {
    local env=$1
    local env_file=".env.$env"
    
    if [ ! -f "$env_file" ]; then
        print_error "環境變數文件 $env_file 不存在"
        print_info "請複製 .env.$env.example 並填寫實際值"
        exit 1
    fi
    
    # 檢查必要變數
    local required_vars=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            print_warning "$var 未在 $env_file 中設置"
        fi
    done
}

# 備份資料庫
backup_database() {
    local env=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups/$env"
    local backup_file="$backup_dir/backup_$timestamp.sql"
    
    mkdir -p "$backup_dir"
    
    print_info "開始備份資料庫..."
    
    if docker-compose exec -T postgres pg_dump -U ceo_admin ceo_platform_$env > "$backup_file"; then
        print_success "資料庫備份完成: $backup_file"
        
        # 保留最近7天的備份
        find "$backup_dir" -name "*.sql" -mtime +7 -delete
    else
        print_error "資料庫備份失敗"
        exit 1
    fi
}

# 停止服務
stop_services() {
    print_info "停止服務..."
    docker-compose down
}

# 拉取最新代碼
pull_latest_code() {
    print_info "拉取最新代碼..."
    git pull origin main
    
    # 更新子模組（如果有的話）
    if [ -f .gitmodules ]; then
        git submodule update --init --recursive
    fi
}

# 構建鏡像
build_images() {
    local env=$1
    
    print_info "構建Docker鏡像..."
    
    # 設置構建參數
    local build_args=""
    if [ "$env" = "production" ]; then
        build_args="--build-arg NODE_ENV=production"
    fi
    
    docker-compose build $build_args
}

# 啟動服務
start_services() {
    print_info "啟動服務..."
    docker-compose up -d
    
    # 等待服務啟動
    sleep 10
    
    # 檢查服務狀態
    if docker-compose ps | grep -q "Up"; then
        print_success "服務啟動成功"
    else
        print_error "服務啟動失敗"
        docker-compose logs
        exit 1
    fi
}

# 執行資料庫遷移
run_migrations() {
    print_info "執行資料庫遷移..."
    
    # 等待資料庫準備好
    local max_retries=30
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if docker-compose exec -T postgres pg_isready -U ceo_admin; then
            break
        fi
        print_info "等待資料庫準備好... ($((retry_count+1))/$max_retries)"
        sleep 2
        retry_count=$((retry_count+1))
    done
    
    if [ $retry_count -eq $max_retries ]; then
        print_error "資料庫連接超時"
        exit 1
    fi
    
    # 執行Prisma遷移
    docker-compose exec app pnpm db:push
    print_success "資料庫遷移完成"
}

# 健康檢查
health_check() {
    print_info "執行健康檢查..."
    
    local max_retries=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            print_success "應用健康檢查通過"
            return 0
        fi
        print_info "等待應用啟動... ($((retry_count+1))/$max_retries)"
        sleep 5
        retry_count=$((retry_count+1))
    done
    
    print_error "健康檢查失敗"
    docker-compose logs app
    return 1
}

# 清理舊鏡像
cleanup_old_images() {
    print_info "清理舊的Docker鏡像..."
    
    # 刪除未被使用的鏡像
    docker image prune -f
    
    # 刪除未被使用的容器
    docker container prune -f
    
    # 刪除未被使用的卷
    docker volume prune -f
}

# 主函數
main() {
    local env=${1:-production}
    
    print_info "開始部署 CEO Platform ($env 環境)"
    print_info "當前時間: $(date)"
    
    # 檢查環境
    if [[ ! "$env" =~ ^(production|staging|development)$ ]]; then
        print_error "無效的環境: $env"
        print_info "可用環境: production, staging, development"
        exit 1
    fi
    
    # 執行部署步驟
    check_requirements
    check_env_file "$env"
    backup_database "$env"
    stop_services
    pull_latest_code
    build_images "$env"
    start_services
    run_migrations
    health_check
    cleanup_old_images
    
    print_success "部署完成！"
    print_info "應用URL: $(grep '^NEXTAUTH_URL=' .env.$env | cut -d'=' -f2-)"
    print_info "查看日誌: docker-compose logs -f"
}

# 執行主函數
main "$@"