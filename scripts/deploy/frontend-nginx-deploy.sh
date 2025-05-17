#!/bin/bash
#
# Nginx前端部署脚本
# 此脚本已移动到scripts/deploy目录，为了保持兼容性而更新
#

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# 获取项目根目录（假设脚本位于scripts/deploy目录下）
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
# 获取前端目录
FRONTEND_DIR="$PROJECT_ROOT/frontend-html"

# 默认配置
DEFAULT_PORT=3001
DEFAULT_HOST="10.193.21.115"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --port=*)
            PORT="${1#*=}"
            shift
            ;;
        --host=*)
            HOST="${1#*=}"
            shift
            ;;
        *)
            # 未知参数
            echo "未知参数: $1"
            shift
            ;;
    esac
done

# 使用默认值（如果未指定）
PORT=${PORT:-$DEFAULT_PORT}
HOST=${HOST:-$DEFAULT_HOST}

echo "Nginx 前端部署脚本"
echo "======================================"
echo "使用端口: $PORT"
echo "使用主机: $HOST"

# 检查是否安装了 Nginx
if ! command -v nginx &> /dev/null; then
    echo "错误: 未找到 Nginx。请先安装 Nginx。"
    echo "可以使用以下命令安装: sudo apt-get install nginx"
    exit 1
fi

# 这里不需要重新定义FRONTEND_DIR，因为已经在脚本开头定义了

# 检查并终止占用指定端口的进程
PORT_PID=$(lsof -t -i:$PORT 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "发现端口 $PORT 被进程 $PORT_PID 占用，正在终止..."
    sudo kill $PORT_PID 2>/dev/null || sudo kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "进程已终止"
fi

# 更新 Nginx 配置文件中的路径和端口
TEMP_CONF=$(mktemp)
TEMP_INCLUDE=$(mktemp)
TEMP_STANDALONE=$(mktemp)

# 准备三种配置文件，替换路径和端口
cat "$FRONTEND_DIR/nginx.conf" | \
    sed "s|FRONTEND_ROOT_PATH|$FRONTEND_DIR|g" | \
    sed "s|PORT_NUMBER|$PORT|g" > "$TEMP_CONF"

cat "$FRONTEND_DIR/nginx-include.conf" | \
    sed "s|FRONTEND_ROOT_PATH|$FRONTEND_DIR|g" | \
    sed "s|PORT_NUMBER|$PORT|g" > "$TEMP_INCLUDE"

# 准备独立配置文件（完整的 nginx.conf）
cat "$FRONTEND_DIR/nginx-standalone.conf" | \
    sed "s|FRONTEND_ROOT_PATH|$FRONTEND_DIR|g" | \
    sed "s|PORT_NUMBER|$PORT|g" > "$TEMP_STANDALONE"

# 检测 Nginx 配置目录和方法
NGINX_MAIN_CONF="/etc/nginx/nginx.conf"
NGINX_CONF_PATH=""
NGINX_INCLUDE_PATH="/etc/nginx/conf.d/dify-frontend-include.conf"

# 尝试多种配置方法
if [ -d "/etc/nginx/conf.d" ]; then
    NGINX_CONF_PATH="/etc/nginx/conf.d/dify-frontend.conf"
    echo "使用 conf.d 目录配置 Nginx: $NGINX_CONF_PATH"
    echo "包含文件路径: $NGINX_INCLUDE_PATH"
elif [ -d "/etc/nginx/sites-available" ]; then
    NGINX_CONF_PATH="/etc/nginx/sites-available/dify-frontend"
    NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/dify-frontend"
    echo "使用 sites-available 目录配置 Nginx: $NGINX_CONF_PATH"
    echo "包含文件路径: $NGINX_INCLUDE_PATH"
else
    # 如果找不到标准目录，尝试直接使用 nginx.conf
    NGINX_CONF_PATH="/etc/nginx/nginx.conf.dify"
    echo "使用自定义配置: $NGINX_CONF_PATH"
    echo "包含文件路径: $NGINX_INCLUDE_PATH"
fi

# 复制配置文件 - 尝试两种方法
echo "复制独立配置文件到 $NGINX_CONF_PATH"
sudo cp "$TEMP_CONF" "$NGINX_CONF_PATH"
sudo chmod 644 "$NGINX_CONF_PATH"

echo "复制包含配置文件到 $NGINX_INCLUDE_PATH"
sudo cp "$TEMP_INCLUDE" "$NGINX_INCLUDE_PATH"
sudo chmod 644 "$NGINX_INCLUDE_PATH"

# 检查主配置文件是否存在
if [ -f "$NGINX_MAIN_CONF" ]; then
    # 检查主配置文件是否已包含我们的配置
    if ! grep -q "include.*dify-frontend-include.conf" "$NGINX_MAIN_CONF"; then
        echo "尝试在主配置文件中添加包含指令..."
        # 创建备份
        sudo cp "$NGINX_MAIN_CONF" "${NGINX_MAIN_CONF}.bak"

        # 尝试在 http 块中添加 include 指令
        if grep -q "http {" "$NGINX_MAIN_CONF"; then
            sudo sed -i '/http {/a \    include /etc/nginx/conf.d/dify-frontend-include.conf;' "$NGINX_MAIN_CONF"
            echo "已在主配置文件的 http 块中添加包含指令"
        fi
    else
        echo "主配置文件已包含我们的配置"
    fi
fi

# 如果使用 sites-available/sites-enabled 模式，创建符号链接
if [ -d "/etc/nginx/sites-available" ] && [ -d "/etc/nginx/sites-enabled" ] && [ ! -z "$NGINX_ENABLED_PATH" ] && [ ! -z "$NGINX_CONF_PATH" ]; then
    echo "创建符号链接: $NGINX_ENABLED_PATH -> $NGINX_CONF_PATH"
    # 确保目标目录存在
    sudo mkdir -p "$(dirname "$NGINX_ENABLED_PATH")"
    sudo ln -sf "$NGINX_CONF_PATH" "$NGINX_ENABLED_PATH"

    if [ $? -ne 0 ]; then
        echo "警告: 创建符号链接失败，但这可能不影响 Nginx 运行"
    fi
else
    echo "跳过符号链接创建（不使用 sites-available/sites-enabled 模式或路径未定义）"
fi

# 删除临时文件
rm "$TEMP_CONF" "$TEMP_INCLUDE" "$TEMP_STANDALONE"

# 测试 Nginx 配置
echo "测试 Nginx 配置..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "Nginx 配置测试失败，请检查配置文件。"
    echo "请修复 Nginx 配置问题后重试。"
    exit 1
else
    # 尝试多种方式启动/重启 Nginx
    echo "重启 Nginx..."

    # 方法 1: systemctl
    sudo systemctl restart nginx

    # 如果方法 1 失败，尝试方法 2: service
    if [ $? -ne 0 ]; then
        echo "使用 systemctl 重启失败，尝试使用 service..."
        sudo service nginx restart
    fi

    # 如果方法 2 失败，尝试方法 3: nginx -s reload
    if [ $? -ne 0 ]; then
        echo "使用 service 重启失败，尝试使用 nginx -s reload..."
        sudo nginx -s reload
    fi

    # 如果方法 3 失败，尝试方法 4: 使用独立配置文件
    if [ $? -ne 0 ]; then
        echo "使用 nginx -s reload 失败，尝试使用独立配置文件..."

        # 检查是否有其他 Nginx 进程
        if pgrep -x "nginx" > /dev/null; then
            echo "发现 Nginx 进程已在运行，但我们将使用独立配置"
        fi

        # 创建独立配置目录
        STANDALONE_DIR="/tmp/nginx-dify"
        sudo mkdir -p "$STANDALONE_DIR"

        # 复制独立配置文件
        STANDALONE_CONF="$STANDALONE_DIR/nginx.conf"
        sudo cp "$TEMP_STANDALONE" "$STANDALONE_CONF"

        # 使用 -c 参数指定配置文件，避免使用默认配置
        echo "使用独立配置文件启动 Nginx: $STANDALONE_CONF"
        sudo nginx -c "$STANDALONE_CONF" -g "daemon on; pid $STANDALONE_DIR/nginx.pid;"
    fi

    # 检查 Nginx 是否成功启动
    if ! pgrep -x "nginx" > /dev/null; then
        echo "Nginx 启动失败，请检查 Nginx 错误日志。"
        echo "错误日志位置: /var/log/nginx/error.log"
        exit 1
    else
        echo "Nginx 已成功启动"
    fi
fi

echo "前端地址: http://$HOST:$PORT"
echo "部署完成！"
