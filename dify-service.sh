#!/bin/bash
# dify-service.sh - Dify UI 服务部署和启动脚本

# 设置工作目录为脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查必要的命令
check_command node
check_command npm
check_command python3

# 创建必要的目录
create_directories() {
    print_info "创建必要的目录..."
    
    # 创建数据目录
    mkdir -p backend/data
    mkdir -p backend/logs
    mkdir -p backend/backups
    
    print_success "目录创建完成"
}

# 初始化空数据库文件
initialize_database() {
    print_info "检查数据库文件..."
    
    DB_FILE="backend/data/evaluations.db"
    
    if [ -f "$DB_FILE" ]; then
        print_info "数据库文件已存在: $DB_FILE"
    else
        print_info "数据库文件不存在，创建空数据库文件..."
        
        # 创建空数据库文件
        touch "$DB_FILE"
        
        # 使用 SQLite 初始化数据库结构
        if command -v sqlite3 &> /dev/null; then
            print_info "使用 SQLite 初始化数据库结构..."
            
            # 创建基本表结构
            sqlite3 "$DB_FILE" <<EOF
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_key TEXT UNIQUE,
  timestamp INTEGER NOT NULL,
  date TEXT NOT NULL,
  data JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_number TEXT UNIQUE NOT NULL,
  product_family TEXT NOT NULL,
  last_updated INTEGER NOT NULL,
  evaluation_count INTEGER DEFAULT 0,
  avg_score REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mag_id TEXT UNIQUE NOT NULL,
  last_updated INTEGER NOT NULL,
  evaluation_count INTEGER DEFAULT 0,
  avg_score REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stats_cache (
  id TEXT PRIMARY KEY,
  data JSON NOT NULL,
  last_updated INTEGER NOT NULL
);
EOF
            print_success "数据库结构初始化完成"
        else
            print_warning "SQLite 未安装，将由应用程序自动创建数据库结构"
        fi
        
        # 设置适当的权限
        chmod 666 "$DB_FILE"
        print_success "空数据库文件创建完成: $DB_FILE"
    fi
}

# 安装依赖
install_dependencies() {
    print_info "安装后端依赖..."
    cd backend
    npm install
    cd ..
    print_success "依赖安装完成"
}

# 启动服务
start_services() {
    print_info "启动后端服务..."
    
    # 检查是否已有后端服务运行
    if pgrep -f "node backend/server.js" > /dev/null; then
        print_warning "后端服务已在运行，正在重启..."
        pkill -f "node backend/server.js"
        sleep 2
    fi
    
    # 启动后端服务
    cd backend
    nohup node server.js > logs/server.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    print_success "后端服务已启动，PID: $BACKEND_PID"
    print_info "日志文件: backend/logs/server.log"
    
    # 启动前端服务
    print_info "启动前端服务..."
    
    # 检查是否已有前端服务运行
    if pgrep -f "python3 -m http.server 3001" > /dev/null; then
        print_warning "前端服务已在运行，正在重启..."
        pkill -f "python3 -m http.server 3001"
        sleep 2
    fi
    
    # 启动前端服务
    cd frontend-html
    nohup python3 -m http.server 3001 > ../backend/logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    print_success "前端服务已启动，PID: $FRONTEND_PID"
    print_info "日志文件: backend/logs/frontend.log"
    
    # 显示访问信息
    HOST_IP=$(hostname -I | awk '{print $1}')
    print_info "服务已启动，可通过以下地址访问:"
    print_info "后端 API: http://$HOST_IP:3000/api"
    print_info "前端页面: http://$HOST_IP:3001/raglim-dashboard.html"
}

# 主函数
main() {
    print_info "开始部署 Dify UI 服务..."
    
    create_directories
    initialize_database
    install_dependencies
    start_services
    
    print_success "Dify UI 服务部署完成"
}

# 执行主函数
main
