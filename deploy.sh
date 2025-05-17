#!/bin/bash

echo "Dify 评估结果可视化框架部署脚本"
echo "======================================"

# 检查是否使用 --install 参数
if [ "$1" = "--install" ]; then
    echo "步骤 1: 安装依赖"

    echo "安装后端依赖..."
    cd backend
    npm install
    if [ $? -ne 0 ]; then
        echo "安装后端依赖失败，请检查 Node.js 是否正确安装"
        exit 1
    fi
    echo "后端依赖安装完成"
    cd ..

    echo "安装前端依赖..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "安装前端依赖失败，请检查 Node.js 是否正确安装"
        exit 1
    fi
    echo "前端依赖安装完成"
    cd ..
fi

echo "步骤 1: 准备后端"
cd backend
echo "创建数据目录"
mkdir -p data

echo "步骤 2: 检查并终止占用 3000 端口的进程"
PORT_PID=$(lsof -t -i:3000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 3000 被进程 $PORT_PID 占用，正在终止..."
    kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "进程已终止"
fi

echo "步骤 3: 启动后端服务"
node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务已启动，PID: $BACKEND_PID"
cd ..

echo "步骤 4: 准备前端"
cd frontend
echo "检查并终止占用 3001 端口的进程"
PORT_PID=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 3001 被进程 $PORT_PID 占用，正在终止..."
    kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "进程已终止"
fi

echo "步骤 5: 启动前端服务"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务已启动，PID: $FRONTEND_PID"
cd ..

echo "步骤 6: 打开可视化仪表板"
sleep 5
if command -v xdg-open > /dev/null; then
    xdg-open http://10.193.21.115:3001
elif command -v open > /dev/null; then
    open http://10.193.21.115:3001
else
    echo "请手动打开浏览器访问 http://10.193.21.115:3001"
fi

echo "部署完成！"
echo "请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点"
echo "后端日志保存在 backend/backend.log 文件中"
echo "前端日志保存在 frontend/frontend.log 文件中"
echo "按 Ctrl+C 停止所有服务"
echo ""
echo "提示: 如果需要安装依赖，请使用 ./deploy.sh --install"

# 使脚本可执行
chmod +x deploy.sh

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
