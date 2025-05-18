#!/bin/bash
# test_changes.sh - 测试在Linux环境中的修改

# 设置错误时退出
set -e

# 设置日志文件
LOG_FILE="test_changes.log"
echo "开始测试: $(date)" > $LOG_FILE

# 函数：记录日志
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" | tee -a $LOG_FILE
}

# 步骤 1: 拉取最新代码
log "步骤 1: 拉取最新代码"
if [ -d "Dify_UI" ]; then
    cd Dify_UI
    git pull
    log "已拉取最新代码"
else
    git clone https://github.com/fafactx/Dify_UI.git
    cd Dify_UI
    log "已克隆代码库"
fi

# 步骤 2: 启动服务器并检查日志
log "步骤 2: 启动服务器并检查日志"
cd backend
npm install
log "已安装依赖"

# 创建日志目录
mkdir -p logs

# 启动服务器并将输出重定向到日志文件
log "启动服务器"
node server.js > ../server.log 2>&1 &
SERVER_PID=$!
log "服务器进程ID: $SERVER_PID"

# 等待服务器启动
sleep 5
log "服务器已启动"

# 检查日志
log "检查服务器日志"
if grep -q "未发现 JSON 文件" ../server.log || grep -q "已删除 JSON 文件" ../server.log; then
    log "JSON文件删除功能正常工作"
else
    log "警告: 未找到JSON文件删除相关日志"
fi

if grep -q "数据库初始化成功" ../server.log; then
    log "数据库初始化成功"
else
    log "警告: 未找到数据库初始化成功的日志"
fi

# 停止服务器
kill $SERVER_PID
log "服务器已停止"

# 步骤 3: 测试数据库文件自动创建功能
log "步骤 3: 测试数据库文件自动创建功能"
# 删除数据库文件（如果存在）
if [ -f "data/evaluations.db" ]; then
    rm -f data/evaluations.db
    log "已删除数据库文件"
fi

# 重启服务器
log "重启服务器"
node server.js > ../server_recreate_db.log 2>&1 &
SERVER_PID=$!
log "服务器进程ID: $SERVER_PID"

# 等待服务器启动
sleep 5
log "服务器已启动"

# 检查日志
log "检查服务器日志"
if grep -q "数据库文件不存在" ../server_recreate_db.log; then
    log "检测到数据库文件不存在的日志"
else
    log "警告: 未找到数据库文件不存在的日志"
fi

if grep -q "已创建空数据库文件" ../server_recreate_db.log; then
    log "检测到创建空数据库文件的日志"
else
    log "警告: 未找到创建空数据库文件的日志"
fi

if grep -q "数据库初始化成功" ../server_recreate_db.log; then
    log "数据库初始化成功"
else
    log "警告: 未找到数据库初始化成功的日志"
fi

# 检查数据库文件是否存在
if [ -f "data/evaluations.db" ]; then
    log "数据库文件已自动创建"
else
    log "错误: 数据库文件未创建"
    exit 1
fi

# 步骤 5: 测试Dify数据保存功能
log "步骤 5: 测试Dify数据保存功能"
# 使用curl发送测试数据
curl -X POST -H "Content-Type: application/json" -d '{
  "result0": {
    "CAS Name": "Test CAS",
    "Product Family": "Test Family",
    "Part Number": "PN-1001",
    "MAG": "MAG-001",
    "hallucination_control": 80,
    "quality": 75,
    "professionalism": 70,
    "usefulness": 65
  }
}' http://localhost:3000/api/save-evaluation > ../curl_response.log 2>&1
log "已发送测试数据"

# 检查响应
if grep -q "success" ../curl_response.log; then
    log "数据保存成功"
else
    log "警告: 数据保存可能失败"
fi

# 步骤 6: 检查数据目录
log "步骤 6: 检查数据目录"
# 列出数据目录中的文件
ls -la data/ > ../data_dir.log 2>&1
log "已列出数据目录中的文件"

# 检查是否有JSON文件
JSON_FILES=$(find data/ -name "*.json" | wc -l)
if [ "$JSON_FILES" -eq 0 ]; then
    log "数据目录中没有JSON文件，符合预期"
else
    log "警告: 数据目录中存在 $JSON_FILES 个JSON文件"
fi

# 停止服务器
kill $SERVER_PID
log "服务器已停止"

# 总结测试结果
log "测试完成"
log "请查看日志文件了解详细信息: $LOG_FILE"
log "请手动检查前端显示是否正确"

echo "测试脚本执行完毕，请查看日志文件: $LOG_FILE"
