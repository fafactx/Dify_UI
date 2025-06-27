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
    echo "⚠️  环境检查发现问题，正在自动修复..."

    # 自动修复Better-SQLite3段错误问题
    echo "🔧 修复Better-SQLite3编译问题..."

    # 检查是否有段错误
    if dmesg | tail -20 | grep -q "segfault\|Segmentation fault"; then
        echo "   检测到段错误，重新编译Better-SQLite3..."

        # 清理并重新安装
        echo "   清理node_modules..."
        rm -rf node_modules package-lock.json

        # 确保编译环境
        echo "   检查编译环境..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y build-essential python3
        elif command -v yum &> /dev/null; then
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y python3
        fi

        # 重新安装依赖
        echo "   重新安装依赖包..."
        npm install

        # 单独重新编译Better-SQLite3
        echo "   重新编译Better-SQLite3..."
        npm rebuild better-sqlite3

        # 如果还有问题，尝试使用预编译版本
        if ! node -e "require('better-sqlite3')" 2>/dev/null; then
            echo "   尝试使用预编译版本..."
            npm uninstall better-sqlite3
            npm install better-sqlite3@8.4.0
        fi
    fi

    # 修复npm安全漏洞
    echo "🔒 修复npm安全漏洞..."
    npm audit fix --force 2>/dev/null || true

    # 再次运行环境检查
    echo "🔍 重新运行环境检查..."
    node check-environment.js

    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ 自动修复失败，请手动解决问题"
        exit 1
    fi

    echo "✅ 自动修复完成"
fi

echo ""
echo "🔍 检查端口3000占用情况..."

# 检查端口3000是否被占用
PORT_PID=$(lsof -ti:3000 2>/dev/null)

if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  发现端口3000被进程 $PORT_PID 占用"
    echo "🔧 正在终止占用进程..."

    # 尝试优雅终止
    kill $PORT_PID 2>/dev/null
    sleep 2

    # 检查进程是否还在运行
    if kill -0 $PORT_PID 2>/dev/null; then
        echo "🔨 优雅终止失败，强制终止进程..."
        kill -9 $PORT_PID 2>/dev/null
        sleep 1
    fi

    # 再次检查
    if kill -0 $PORT_PID 2>/dev/null; then
        echo "❌ 无法终止进程 $PORT_PID，可能需要管理员权限"
        echo "💡 请手动终止进程: sudo kill -9 $PORT_PID"
        exit 1
    else
        echo "✅ 成功终止占用进程"
    fi
else
    echo "✅ 端口3000可用"
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
