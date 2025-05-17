#!/bin/bash
#
# HTML5 前端部署脚本
# 此脚本已移动到scripts/deploy目录，为了保持兼容性而更新
#

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# 获取项目根目录（假设脚本位于scripts/deploy目录下）
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
# 获取前端目录
FRONTEND_DIR="$PROJECT_ROOT/frontend-html"

echo "HTML5 前端部署脚本"
echo "======================================"
echo "前端目录: $FRONTEND_DIR"

# 检查是否安装了 Python
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "错误: 未找到 Python。请安装 Python 3 或 Python 2。"
    exit 1
fi

# 检查 Python 版本
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo "使用 $PYTHON_VERSION 作为静态文件服务器"

# 检查并终止占用 3001 端口的进程
PORT_PID=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 3001 被进程 $PORT_PID 占用，正在终止..."
    kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "进程已终止"
fi

# 启动 Python 简易 HTTP 服务器
echo "启动 HTML5 前端服务..."
cd "$FRONTEND_DIR"
if [[ "$PYTHON_VERSION" == *"Python 3"* ]]; then
    # Python 3
    nohup $PYTHON_CMD -m http.server 3001 > frontend.log 2>&1 &
else
    # Python 2
    nohup $PYTHON_CMD -m SimpleHTTPServer 3001 > frontend.log 2>&1 &
fi

SERVER_PID=$!
echo "HTML5 前端服务已启动，PID: $SERVER_PID"
echo "前端地址: http://$(hostname -I | awk '{print $1}'):3001"
echo "日志保存在 $FRONTEND_DIR/frontend.log 文件中"

echo "部署完成！"

# 返回到原始目录
cd "$PROJECT_ROOT"
