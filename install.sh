#!/bin/bash
# install.sh - 在Linux环境中安装和配置系统

# 设置错误时退出
set -e

# 设置日志文件
LOG_FILE="install.log"
echo "开始安装: $(date)" > $LOG_FILE

# 函数：记录日志
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" | tee -a $LOG_FILE
}

# 步骤 1: 安装依赖
log "步骤 1: 安装依赖"
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y git nodejs npm curl
    log "已安装依赖 (Debian/Ubuntu)"
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    sudo yum update -y
    sudo yum install -y git nodejs npm curl
    log "已安装依赖 (CentOS/RHEL)"
else
    log "未知的Linux发行版，请手动安装git、nodejs、npm和curl"
fi

# 步骤 2: 克隆代码库
log "步骤 2: 克隆代码库"
if [ -d "Dify_UI" ]; then
    cd Dify_UI
    git pull
    log "已拉取最新代码"
else
    git clone https://github.com/fafactx/Dify_UI.git
    cd Dify_UI
    log "已克隆代码库"
fi

# 步骤 3: 安装Node.js依赖
log "步骤 3: 安装Node.js依赖"
cd backend
npm install
log "已安装后端依赖"

# 步骤 4: 创建必要的目录
log "步骤 4: 创建必要的目录"
mkdir -p data
mkdir -p logs
log "已创建必要的目录"

# 步骤 5: 设置权限
log "步骤 5: 设置权限"
chmod -R 755 .
chmod -R 777 data
chmod -R 777 logs
log "已设置权限"

# 步骤 6: 创建启动脚本
log "步骤 6: 创建启动脚本"
cat > start.sh << 'EOF'
#!/bin/bash
cd backend
node server.js > ../logs/server.log 2>&1 &
echo $! > ../server.pid
echo "服务器已启动，进程ID: $(cat ../server.pid)"
EOF

chmod +x start.sh
log "已创建启动脚本"

# 步骤 7: 创建停止脚本
log "步骤 7: 创建停止脚本"
cat > stop.sh << 'EOF'
#!/bin/bash
if [ -f server.pid ]; then
    PID=$(cat server.pid)
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "服务器已停止，进程ID: $PID"
    else
        echo "服务器未运行"
    fi
    rm server.pid
else
    echo "找不到server.pid文件，服务器可能未运行"
fi
EOF

chmod +x stop.sh
log "已创建停止脚本"

# 步骤 8: 创建重启脚本
log "步骤 8: 创建重启脚本"
cat > restart.sh << 'EOF'
#!/bin/bash
./stop.sh
sleep 2
./start.sh
EOF

chmod +x restart.sh
log "已创建重启脚本"

# 步骤 9: 创建测试脚本
log "步骤 9: 创建测试脚本"
chmod +x test_changes.sh
log "已设置测试脚本权限"

# 总结安装结果
log "安装完成"
log "请使用以下命令启动服务器:"
log "  ./start.sh"
log "请使用以下命令停止服务器:"
log "  ./stop.sh"
log "请使用以下命令重启服务器:"
log "  ./restart.sh"
log "请使用以下命令测试修改:"
log "  ./test_changes.sh"

echo "安装脚本执行完毕，请查看日志文件: $LOG_FILE"
