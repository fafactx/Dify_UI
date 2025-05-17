#!/bin/bash

echo "Dify 评估结果可视化框架部署脚本"
echo "======================================"

echo "步骤 1: 安装后端依赖"
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "安装依赖失败，请检查 Node.js 是否正确安装"
    exit 1
fi

echo "步骤 2: 创建数据目录"
mkdir -p data

echo "步骤 3: 启动后端服务"
node server.js &
SERVER_PID=$!

echo "步骤 4: 打开可视化仪表板"
sleep 3
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
else
    echo "请手动打开浏览器访问 http://localhost:3000"
fi

echo "部署完成！"
echo "请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点"
echo "按 Ctrl+C 停止服务器"

# 等待服务器进程
wait $SERVER_PID
