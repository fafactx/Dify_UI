#!/bin/bash

# 默认配置
DEFAULT_FRONTEND_PORT=3001
DEFAULT_BACKEND_PORT=3000
DEFAULT_HOST="10.193.21.115"
INSTALL=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
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
        *)
            # 未知参数
            echo "未知参数: $1"
            shift
            ;;
    esac
done

# 使用默认值（如果未指定）
FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
HOST=${HOST:-$DEFAULT_HOST}

echo "Dify 评估结果可视化框架部署脚本"
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

echo "步骤 5: 启动 Nginx 前端服务"
cd frontend-html
chmod +x deploy-nginx.sh

# 启动前端服务，传递端口和主机参数
./deploy-nginx.sh --port=$FRONTEND_PORT --host=$HOST
cd ..

echo "步骤 6: 服务访问信息"
echo "前端地址: http://$HOST:$FRONTEND_PORT"
echo "后端地址: http://$HOST:$BACKEND_PORT"
echo "请在局域网中的浏览器访问上述地址"

echo "部署完成！"
echo "请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点"
echo "服务已在后台运行，您可以关闭此终端"
echo ""
echo "如需查看日志，请运行:"
echo "  tail -f backend/backend.log  # 查看后端日志"
echo "  tail -f frontend-html/frontend.log  # 查看前端日志"
echo ""
echo "如需停止服务，请运行:"
echo "  pkill -f 'node server.js'  # 停止后端"
echo "  或者直接运行 ./stop.sh [--port=$FRONTEND_PORT]"
echo ""
echo "提示: 如果需要安装依赖，请使用 ./deploy.sh --install"

# 使脚本可执行
chmod +x deploy.sh
