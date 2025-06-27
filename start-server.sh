#!/bin/bash

# RAGLLM评估系统启动脚本

echo "🚀 RAGLLM评估系统启动脚本"
echo "================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 14.0.0或更高版本"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"

# 进入后端目录
cd backend

echo ""
echo "📋 运行环境检查..."
node check-environment.js

# 检查环境检查是否成功
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 环境检查失败，请解决上述问题后重新运行"
    exit 1
fi

echo ""
echo "🚀 启动服务器..."
echo "服务器将在 http://10.193.21.115:3000 上运行"
echo "前端界面: http://10.193.21.115:3000"
echo "API文档: http://10.193.21.115:3000/api/stats"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动服务器
node server.js
