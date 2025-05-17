#!/bin/bash

echo "Nginx 前端停止脚本"
echo "======================================"

# 检查 Nginx 配置文件位置
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_SITES_DIR="/etc/nginx/sites-enabled"
CONFIG_FILE=""

if [ -f "$NGINX_CONF_DIR/dify-frontend.conf" ]; then
    CONFIG_FILE="$NGINX_CONF_DIR/dify-frontend.conf"
elif [ -f "$NGINX_SITES_DIR/dify-frontend" ]; then
    CONFIG_FILE="$NGINX_SITES_DIR/dify-frontend"
fi

if [ ! -z "$CONFIG_FILE" ]; then
    echo "找到配置文件: $CONFIG_FILE"
    echo "移除配置文件..."
    sudo rm "$CONFIG_FILE"
    
    # 重启 Nginx 以应用更改
    echo "重启 Nginx..."
    sudo systemctl restart nginx || sudo service nginx restart || sudo nginx -s reload
    
    echo "Nginx 前端服务已停止"
else
    echo "未找到 Nginx 配置文件，尝试停止端口 3001..."
    
    # 查找并终止占用 3001 端口的进程
    PORT_PID=$(lsof -t -i:3001 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 3001 被进程 $PORT_PID 占用，正在终止..."
        sudo kill $PORT_PID 2>/dev/null || sudo kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    else
        echo "未发现端口 3001 被占用"
    fi
fi

echo "停止完成！"
