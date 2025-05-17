#!/bin/bash

echo "Dify 评估结果可视化框架部署脚本 (现代版)"
echo "======================================"

# 检查是否使用 --install 参数
if [ "$1" == "--install" ]; then
    echo "步骤 1: 安装前端依赖"
    npm install
    if [ $? -ne 0 ]; then
        echo "安装依赖失败，请检查 Node.js 是否正确安装"
        exit 1
    fi
    echo "依赖安装完成"
fi

echo "步骤 1: 检查并终止占用 3001 端口的进程"
PORT_PID=$(lsof -t -i:3001)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 3001 被进程 $PORT_PID 占用，正在终止..."
    kill -9 $PORT_PID
    sleep 1
    echo "进程已终止"
fi

echo "步骤 2: 启动开发服务器"
nohup npm run dev > frontend.log 2>&1 &
SERVER_PID=$!
echo "服务器已启动，PID: $SERVER_PID"

echo "步骤 3: 打开可视化仪表板"
sleep 3
xdg-open http://10.193.21.115:3001 || open http://10.193.21.115:3001 || echo "无法自动打开浏览器，请手动访问 http://10.193.21.115:3001"

echo "部署完成！"
echo "服务器日志将保存在 frontend.log 文件中"
echo "提示: 如果需要安装依赖，请使用 ./deploy.sh --install"

# 使脚本可执行
chmod +x deploy.sh
