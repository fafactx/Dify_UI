#!/bin/bash

echo "Nginx 前端部署脚本"
echo "======================================"

# 检查是否安装了 Nginx
if ! command -v nginx &> /dev/null; then
    echo "错误: 未找到 Nginx。请先安装 Nginx。"
    echo "可以使用以下命令安装: sudo apt-get install nginx"
    exit 1
fi

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
FRONTEND_DIR="$SCRIPT_DIR"

# 创建 Nginx 日志目录（如果不存在）
sudo mkdir -p /var/log/nginx

# 检查并终止占用 3001 端口的进程
PORT_PID=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 3001 被进程 $PORT_PID 占用，正在终止..."
    sudo kill $PORT_PID 2>/dev/null || sudo kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "进程已终止"
fi

# 更新 Nginx 配置文件中的路径
TEMP_CONF=$(mktemp)
cat "$FRONTEND_DIR/nginx.conf" | sed "s|/home/ken/dify-evaluation-dashboard/frontend-html|$FRONTEND_DIR|g" > "$TEMP_CONF"

# 创建 Nginx 配置软链接
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_SITES_DIR="/etc/nginx/sites-enabled"

if [ -d "$NGINX_CONF_DIR" ]; then
    echo "使用 conf.d 目录配置 Nginx..."
    sudo cp "$TEMP_CONF" "$NGINX_CONF_DIR/dify-frontend.conf"
elif [ -d "$NGINX_SITES_DIR" ]; then
    echo "使用 sites-enabled 目录配置 Nginx..."
    sudo cp "$TEMP_CONF" "$NGINX_SITES_DIR/dify-frontend"
else
    echo "未找到标准 Nginx 配置目录，使用自定义配置..."
    sudo cp "$TEMP_CONF" "/etc/nginx/nginx.conf"
fi

# 删除临时文件
rm "$TEMP_CONF"

# 测试 Nginx 配置
echo "测试 Nginx 配置..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "Nginx 配置测试失败，请检查配置文件。"
    exit 1
fi

# 重启 Nginx
echo "重启 Nginx..."
sudo systemctl restart nginx || sudo service nginx restart

if [ $? -ne 0 ]; then
    echo "Nginx 重启失败，尝试使用 nginx -s reload..."
    sudo nginx -s reload
fi

echo "前端地址: http://10.193.21.115:3001"
echo "部署完成！"
