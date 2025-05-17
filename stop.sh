#!/bin/bash

echo "Dify 评估结果可视化框架停止脚本"
echo "======================================"

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
FRONTEND_PID=$(pgrep -f "vite")
if [ ! -z "$FRONTEND_PID" ]; then
    echo "发现前端服务进程 $FRONTEND_PID，正在终止..."
    kill $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
    sleep 1
    echo "前端服务已终止"
else
    echo "未发现运行中的前端服务"
fi

echo "所有服务已停止"
echo "如需重新启动服务，请运行 ./deploy.sh"

# 使脚本可执行
chmod +x stop.sh
