#!/bin/bash

echo "Dify 评估结果可视化框架部署脚本"
echo "======================================"

cd backend

# 检查是否使用 --install 参数
if [ "$1" = "--install" ]; then
    echo "步骤 1: 安装后端依赖"
    npm install
    if [ $? -ne 0 ]; then
        echo "安装依赖失败，请检查 Node.js 是否正确安装"
        exit 1
    fi
    echo "依赖安装完成"
fi

echo "步骤 1: 创建数据目录"
mkdir -p data

echo "步骤 2: 启动后端服务"
node server.js &
SERVER_PID=$!

echo "步骤 3: 打开可视化仪表板"
sleep 3
if command -v xdg-open > /dev/null; then
    xdg-open http://10.193.21.115:3000
elif command -v open > /dev/null; then
    open http://10.193.21.115:3000
else
    echo "请手动打开浏览器访问 http://10.193.21.115:3000"
fi

echo "部署完成！"
echo "请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点"
echo "按 Ctrl+C 停止服务器"
echo ""
echo "提示: 如果需要安装依赖，请使用 ./deploy.sh --install"

# 等待服务器进程
wait $SERVER_PID
