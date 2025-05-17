#!/bin/bash

echo "Nginx 前端停止脚本"
echo "======================================"

# 检查 Nginx 配置文件位置
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_SITES_DIR="/etc/nginx/sites-enabled"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
CONFIG_FILES=()

# 检查所有可能的配置文件位置
if [ -f "$NGINX_CONF_DIR/dify-frontend.conf" ]; then
    CONFIG_FILES+=("$NGINX_CONF_DIR/dify-frontend.conf")
fi

if [ -f "$NGINX_CONF_DIR/dify-frontend-include.conf" ]; then
    CONFIG_FILES+=("$NGINX_CONF_DIR/dify-frontend-include.conf")
fi

if [ -f "$NGINX_SITES_DIR/dify-frontend" ]; then
    CONFIG_FILES+=("$NGINX_SITES_DIR/dify-frontend")
fi

if [ -f "$NGINX_SITES_AVAILABLE/dify-frontend" ]; then
    CONFIG_FILES+=("$NGINX_SITES_AVAILABLE/dify-frontend")
fi

if [ -f "/etc/nginx/nginx.conf.dify" ]; then
    CONFIG_FILES+=("/etc/nginx/nginx.conf.dify")
fi

# 检查主配置文件是否包含我们的配置
NGINX_MAIN_CONF="/etc/nginx/nginx.conf"
if [ -f "$NGINX_MAIN_CONF" ] && grep -q "include.*dify-frontend-include.conf" "$NGINX_MAIN_CONF"; then
    echo "主配置文件包含我们的配置，尝试移除..."
    # 创建备份
    sudo cp "$NGINX_MAIN_CONF" "${NGINX_MAIN_CONF}.bak"
    # 移除包含指令
    sudo sed -i '/include.*dify-frontend-include.conf/d' "$NGINX_MAIN_CONF"
    echo "已从主配置文件中移除包含指令"
fi

# 移除所有找到的配置文件
if [ ${#CONFIG_FILES[@]} -gt 0 ]; then
    echo "找到 ${#CONFIG_FILES[@]} 个配置文件"
    for file in "${CONFIG_FILES[@]}"; do
        echo "移除配置文件: $file"
        sudo rm -f "$file"
    done

    # 尝试重启 Nginx 以应用更改
    echo "重启 Nginx..."
    sudo systemctl restart nginx 2>/dev/null || sudo service nginx restart 2>/dev/null || sudo nginx -s reload 2>/dev/null

    echo "Nginx 前端服务已停止"
else
    echo "未找到 Nginx 配置文件"
fi

# 无论如何，都尝试停止占用 3001 端口的进程
echo "尝试停止端口 3001 上的所有进程..."

# 查找并终止占用 3001 端口的进程
PORT_PID=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 3001 被以下进程占用: $PORT_PID"
    for pid in $PORT_PID; do
        echo "终止进程 $pid..."
        sudo kill $pid 2>/dev/null || sudo kill -9 $pid 2>/dev/null
    done
    sleep 1
    echo "所有进程已终止"
else
    echo "未发现端口 3001 被占用"
fi

# 检查 Python HTTP 服务器进程
PYTHON_PID=$(pgrep -f "python.*http.server 3001\|SimpleHTTPServer 3001")
if [ ! -z "$PYTHON_PID" ]; then
    echo "发现 Python HTTP 服务器进程: $PYTHON_PID"
    for pid in $PYTHON_PID; do
        echo "终止 Python HTTP 服务器进程 $pid..."
        kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
    done
    sleep 1
    echo "Python HTTP 服务器已终止"
fi

echo "停止完成！"
