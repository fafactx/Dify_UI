#!/bin/bash
#
# Dify 评估结果可视化框架综合服务脚本
# 此脚本用于启动或停止 Dify 评估结果可视化框架的前端和后端服务
#

# 默认配置
DEFAULT_FRONTEND_PORT=3001
DEFAULT_BACKEND_PORT=3000
DEFAULT_HOST="10.193.21.115"
DEFAULT_ACTION="start"
INSTALL=false

# 显示帮助信息
show_help() {
    echo "Dify 评估结果可视化框架服务脚本"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --action=start|stop     指定操作类型，启动或停止服务 (默认: start)"
    echo "  --frontend-port=PORT    指定前端服务端口 (默认: 3001)"
    echo "  --backend-port=PORT     指定后端服务端口 (默认: 3000)"
    echo "  --host=HOST             指定主机地址 (默认: 10.193.21.115)"
    echo "  --install               安装依赖 (仅在 start 操作时有效)"
    echo "  --help                  显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --action=start                   # 启动服务"
    echo "  $0 --action=start --install         # 安装依赖并启动服务"
    echo "  $0 --action=stop                    # 停止服务"
    echo "  $0 --frontend-port=8080 --backend-port=8000  # 使用自定义端口"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --action=*)
            ACTION="${1#*=}"
            shift
            ;;
        --frontend-port=*)
            FRONTEND_PORT="${1#*=}"
            shift
            ;;
        --backend-port=*)
            BACKEND_PORT="${1#*=}"
            shift
            ;;
        --host=*)
            HOST="${1#*=}"
            shift
            ;;
        --install)
            INSTALL=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            # 未知参数
            echo "错误: 未知参数 $1"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 使用默认值（如果未指定）
ACTION=${ACTION:-$DEFAULT_ACTION}
FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
HOST=${HOST:-$DEFAULT_HOST}

# 验证 ACTION 参数
if [[ "$ACTION" != "start" && "$ACTION" != "stop" ]]; then
    echo "错误: --action 参数必须是 start 或 stop"
    echo "使用 --help 查看帮助信息"
    exit 1
fi

# 启动服务
start_services() {
    echo "Dify 评估结果可视化框架服务启动"
    echo "======================================"
    echo "前端端口: $FRONTEND_PORT"
    echo "后端端口: $BACKEND_PORT"
    echo "主机地址: $HOST"

    # 检查是否安装依赖
    if [ "$INSTALL" = true ]; then
        echo "步骤 1: 安装依赖"

        # 检查根目录 package.json 是否存在
        if [ -f "package.json" ]; then
            echo "使用根目录 package.json 安装依赖..."
            npm install
            npm run install:all
            if [ $? -ne 0 ]; then
                echo "安装依赖失败，请检查 Node.js 是否正确安装"
                exit 1
            fi
        else
            echo "安装后端依赖..."
            cd backend
            npm install
            if [ $? -ne 0 ]; then
                echo "安装后端依赖失败，请检查 Node.js 是否正确安装"
                exit 1
            fi
            echo "后端依赖安装完成"
            cd ..

            echo "前端使用 HTML5，无需安装依赖"
        fi

        # 运行设置脚本
        if [ -f "scripts/setup.js" ]; then
            echo "运行设置脚本..."
            node scripts/setup.js
        fi
    fi

    echo "步骤 1: 准备后端"
    cd backend
    echo "创建数据目录"
    mkdir -p data

    echo "步骤 2: 检查并终止占用 $BACKEND_PORT 端口的进程"
    PORT_PID=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 $BACKEND_PORT 被进程 $PORT_PID 占用，正在终止..."
        kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    fi

    echo "步骤 3: 启动后端服务"
    nohup node server.js > backend.log 2>&1 &
    echo "后端服务已在后台启动，日志保存在 backend/backend.log"
    cd ..

    echo "步骤 4: 准备前端"
    echo "检查并终止占用 $FRONTEND_PORT 端口的进程"
    PORT_PID=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 $FRONTEND_PORT 被进程 $PORT_PID 占用，正在终止..."
        kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    fi

    echo "步骤 5: 启动前端服务"
    cd frontend-html

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

    # 启动 Python 简易 HTTP 服务器
    echo "启动 HTML5 前端服务..."
    if [[ "$PYTHON_VERSION" == *"Python 3"* ]]; then
        # Python 3
        nohup $PYTHON_CMD -m http.server $FRONTEND_PORT > frontend.log 2>&1 &
    else
        # Python 2
        nohup $PYTHON_CMD -m SimpleHTTPServer $FRONTEND_PORT > frontend.log 2>&1 &
    fi

    SERVER_PID=$!
    echo "HTML5 前端服务已启动，PID: $SERVER_PID"
    cd ..

    echo "步骤 6: 服务访问信息"
    echo "前端地址: http://$HOST:$FRONTEND_PORT"
    echo "后端地址: http://$HOST:$BACKEND_PORT"
    echo "请在局域网中的浏览器访问上述地址"

    echo "启动完成！"
    echo "请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点"
    echo "服务已在后台运行，您可以关闭此终端"
    echo ""
    echo "如需查看日志，请运行:"
    echo "  tail -f backend/backend.log  # 查看后端日志"
    echo "  tail -f frontend-html/frontend.log  # 查看前端日志"
    echo ""
    echo "如需停止服务，请运行:"
    echo "  $0 --action=stop"
}

# 停止服务
stop_services() {
    echo "Dify 评估结果可视化框架服务停止"
    echo "======================================"
    echo "前端端口: $FRONTEND_PORT"

    echo "步骤 1: 停止后端服务"
    BACKEND_PID=$(pgrep -f "node server.js")
    if [ ! -z "$BACKEND_PID" ]; then
        echo "发现后端服务进程 $BACKEND_PID，正在终止..."
        kill $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null
        sleep 1
        echo "后端服务已终止"
    else
        echo "未发现运行中的后端服务"
    fi

    echo "步骤 2: 停止前端服务"
    # 检查是否有 Python HTTP 服务器运行
    FRONTEND_PID=$(pgrep -f "SimpleHTTPServer $FRONTEND_PORT\|http.server $FRONTEND_PORT")
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "发现 Python HTTP 服务进程 $FRONTEND_PID，正在终止..."
        kill $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
        sleep 1
        echo "Python HTTP 服务已终止"
    fi

    # 检查并终止占用前端端口的任何进程
    PORT_PID=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 $FRONTEND_PORT 被进程 $PORT_PID 占用，正在终止..."
        kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    fi

    echo "所有服务已停止"
    echo "如需重新启动服务，请运行 $0 --action=start"
}

# 根据 ACTION 参数执行相应操作
if [ "$ACTION" = "start" ]; then
    start_services
elif [ "$ACTION" = "stop" ]; then
    stop_services
fi

# 设置脚本执行权限
chmod +x "$0"
