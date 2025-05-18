#!/bin/bash
#
# Dify 评估结果可视化框架综合服务脚本
# 此脚本用于启动或停止 Dify 评估结果可视化框架的前端和后端服务
#

# 默认配置
DEFAULT_FRONTEND_PORT=3001
DEFAULT_BACKEND_PORT=3000
DEFAULT_HOST="10.193.21.115"
DEFAULT_ACTION="start"
DEFAULT_FRONTEND_TYPE="python"  # 默认使用 Python HTTP 服务器
INSTALL=false

# 清理 Node.js 版本，只保留 v18
clean_node_versions() {
    echo "清理 Node.js 版本，只保留 v18..."

    # 检查是否安装了 nvm
    if [ -d "$HOME/.nvm" ] || command -v nvm &> /dev/null; then
        # 确保 nvm 命令可用
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        # 安装 Node.js v18（如果尚未安装）
        if ! nvm ls | grep -q "v18"; then
            echo "安装 Node.js v18..."
            nvm install 18
        fi

        # 设置 v18 为默认版本
        nvm alias default 18

        # 获取所有已安装的 Node.js 版本并删除非 v18 版本
        echo "删除非 v18 的 Node.js 版本..."
        for version in $(nvm ls --no-colors | grep -o "v[0-9.]*" | grep -v "v18"); do
            echo "删除 $version..."
            nvm uninstall ${version/v/}
        done

        # 确认当前使用的是 v18
        nvm use 18
        NODE_VERSION=$(node -v)
        echo "当前 Node.js 版本: $NODE_VERSION"

        echo "Node.js 版本清理完成，现在只保留 v18"
    else
        echo "未检测到 NVM，无法清理 Node.js 版本"
        echo "请先安装 NVM: https://github.com/nvm-sh/nvm#installing-and-updating"
    fi
}

# 显示帮助信息
show_help() {
    echo "Dify 评估结果可视化框架服务脚本"
    echo "======================================"
    echo "描述: 此脚本用于启动或停止 Dify 评估结果可视化框架的前端和后端服务"
    echo "      支持使用 Python HTTP 服务器或 Nginx 部署前端"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --action=start|stop     指定操作类型，启动或停止服务 (默认: start)"
    echo "  --frontend-port=PORT    指定前端服务端口 (默认: 3001)"
    echo "  --backend-port=PORT     指定后端服务端口 (默认: 3000)"
    echo "  --host=HOST             指定主机地址 (默认: 10.193.21.115)"
    echo "  --frontend-type=TYPE    指定前端服务类型，python 或 nginx (默认: python)"
    echo "  --install               安装依赖 (仅在 start 操作时有效)"
    echo "  --clean-node            清理 Node.js 版本，只保留 v18 (需要 NVM)"
    echo "  --help, -h              显示此帮助信息"
    echo ""
    echo "前端类型说明:"
    echo "  python - 使用 Python 内置的 HTTP 服务器部署前端，简单易用，适合开发环境"
    echo "  nginx  - 使用 Nginx 部署前端，性能更好，适合生产环境"
    echo ""
    echo "示例:"
    echo "  $0 --action=start                              # 启动服务"
    echo "  $0 --action=start --install                    # 安装依赖并启动服务"
    echo "  $0 --action=stop                               # 停止服务"
    echo "  $0 --frontend-port=8080 --backend-port=8000    # 使用自定义端口"
    echo "  $0 --action=start --frontend-type=nginx        # 使用 Nginx 部署前端"
    echo "  $0 --action=start --frontend-type=python       # 使用 Python HTTP 服务器部署前端"
    echo "  $0 --clean-node                                # 清理 Node.js 版本，只保留 v18"
    echo "  $0 -h                                          # 显示帮助信息"
    echo ""
    echo "注意:"
    echo "  1. 如果使用 Nginx 部署前端，请确保已安装 Nginx"
    echo "  2. 如果使用 Python HTTP 服务器部署前端，请确保已安装 Python"
    echo "  3. 启动服务后，可以通过浏览器访问 http://HOST:FRONTEND_PORT 使用可视化仪表板"
    echo "  4. 停止服务时，会终止所有相关进程"
    echo "  5. better-sqlite3 模块与 Node.js v22+ 不兼容，建议使用 Node.js v18"
}

# 解析命令行参数
CLEAN_NODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --action=*)
            ACTION="${1#*=}"
            shift
            ;;
        --frontend-port=*)
            FRONTEND_PORT="${1#*=}"
            shift
            ;;
        --backend-port=*)
            BACKEND_PORT="${1#*=}"
            shift
            ;;
        --host=*)
            HOST="${1#*=}"
            shift
            ;;
        --frontend-type=*)
            FRONTEND_TYPE="${1#*=}"
            shift
            ;;
        --install)
            INSTALL=true
            shift
            ;;
        --clean-node)
            CLEAN_NODE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            # 未知参数
            echo "错误: 未知参数 $1"
            echo "使用 --help 或 -h 查看帮助信息"
            exit 1
            ;;
    esac
done

# 使用默认值（如果未指定）
ACTION=${ACTION:-$DEFAULT_ACTION}
FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
HOST=${HOST:-$DEFAULT_HOST}
FRONTEND_TYPE=${FRONTEND_TYPE:-$DEFAULT_FRONTEND_TYPE}

# 验证 ACTION 参数
if [[ "$ACTION" != "start" && "$ACTION" != "stop" ]]; then
    echo "错误: --action 参数必须是 start 或 stop"
    echo "使用 --help 或 -h 查看帮助信息"
    exit 1
fi

# 验证 FRONTEND_TYPE 参数
if [[ "$FRONTEND_TYPE" != "python" && "$FRONTEND_TYPE" != "nginx" ]]; then
    echo "错误: --frontend-type 参数必须是 python 或 nginx"
    echo "使用 --help 或 -h 查看帮助信息"
    exit 1
fi

# 启动服务
start_services() {
    echo "Dify 评估结果可视化框架服务启动"
    echo "======================================"
    echo "前端端口: $FRONTEND_PORT"
    echo "后端端口: $BACKEND_PORT"
    echo "主机地址: $HOST"

    # 检查是否安装依赖
    if [ "$INSTALL" = true ]; then
        echo "步骤 1: 安装依赖"

        # 检查操作系统类型
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS_TYPE=$ID
            echo "检测到操作系统: $OS_TYPE"
        else
            OS_TYPE="unknown"
            echo "无法检测操作系统类型，将尝试通用安装方法"
        fi

        # 检查 Node.js 版本
        echo "检查 Node.js 版本..."
        if command -v node &> /dev/null; then
            NODE_VERSION=$(node -v)
            echo "当前 Node.js 版本: $NODE_VERSION"

            # 提取主版本号
            NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | tr -d 'v')

            # 检查是否安装了 nvm
            if [ -d "$HOME/.nvm" ] || command -v nvm &> /dev/null; then
                echo "检测到 NVM 已安装"

                # 确保 nvm 命令可用
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

                # 如果 Node.js 版本不是 v18，则切换到 v18
                if [ "$NODE_MAJOR_VERSION" != "18" ]; then
                    echo "当前 Node.js 版本 ($NODE_VERSION) 不是 v18，正在切换..."

                    # 检查是否已安装 v18
                    if nvm ls | grep -q "v18"; then
                        echo "使用已安装的 Node.js v18"
                    else
                        echo "安装 Node.js v18..."
                        nvm install 18
                    fi

                    # 切换到 v18
                    nvm use 18
                    nvm alias default 18

                    # 验证版本
                    NODE_VERSION=$(node -v)
                    echo "已切换到 Node.js 版本: $NODE_VERSION"
                else
                    echo "当前 Node.js 版本 ($NODE_VERSION) 已经是 v18，无需切换"
                fi
            else
                echo "未检测到 NVM，无法自动切换 Node.js 版本"
                if [ "$NODE_MAJOR_VERSION" -gt "20" ]; then
                    echo "警告: 当前 Node.js 版本 ($NODE_VERSION) 可能与 better-sqlite3 不兼容"
                    echo "建议安装 NVM 并使用 Node.js v18 LTS 版本"
                    echo "可以参考: https://github.com/nvm-sh/nvm#installing-and-updating"

                    # 询问是否继续
                    read -p "是否继续安装？(y/n) " -n 1 -r
                    echo
                    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                        echo "安装已取消"
                        exit 1
                    fi
                fi
            fi
        else
            echo "未检测到 Node.js，请先安装 Node.js"
            exit 1
        fi

        # 在 Linux 环境中安装系统依赖
        if [ "$OS_TYPE" = "ubuntu" ] || [ "$OS_TYPE" = "debian" ]; then
            echo "安装 Linux 系统依赖..."
            sudo apt-get update
            sudo apt-get install -y build-essential python3 python3-pip
            if [ $? -ne 0 ]; then
                echo "警告: 系统依赖安装失败，某些功能可能无法正常工作"
            else
                echo "系统依赖安装成功"
            fi
        elif [ "$OS_TYPE" = "centos" ] || [ "$OS_TYPE" = "rhel" ] || [ "$OS_TYPE" = "fedora" ]; then
            echo "安装 Linux 系统依赖..."
            sudo yum -y update
            sudo yum -y groupinstall "Development Tools"
            sudo yum -y install python3 python3-pip
            if [ $? -ne 0 ]; then
                echo "警告: 系统依赖安装失败，某些功能可能无法正常工作"
            else
                echo "系统依赖安装成功"
            fi
        fi

        # 检查根目录 package.json 是否存在
        if [ -f "package.json" ]; then
            echo "使用根目录 package.json 安装依赖..."
            npm install
            npm run install:all
            if [ $? -ne 0 ]; then
                echo "安装依赖失败，请检查 Node.js 是否正确安装"
                exit 1
            fi
        else
            echo "安装后端依赖..."
            cd backend
            npm install
            if [ $? -ne 0 ]; then
                echo "安装后端依赖失败，请检查 Node.js 是否正确安装"
                exit 1
            fi

            # 检查是否安装了 better-sqlite3
            if ! npm list | grep -q "better-sqlite3"; then
                echo "安装 SQLite 数据库依赖..."

                # 清理 node_modules 目录，确保干净安装
                if [ -d "node_modules" ]; then
                    echo "清理现有 node_modules 目录..."
                    rm -rf node_modules
                fi

                # 在 Node.js v18 环境下安装兼容版本
                echo "在 Node.js v18 环境下安装 better-sqlite3..."

                # 首先尝试安装 better-sqlite3 v7.6.2（与 Node.js v18 兼容性良好）
                echo "尝试安装 better-sqlite3 v7.6.2..."
                npm install better-sqlite3@7.6.2 --build-from-source

                if [ $? -ne 0 ]; then
                    echo "安装 better-sqlite3 v7.6.2 失败，尝试其他版本..."

                    # 尝试安装 better-sqlite3 v7.4.5
                    echo "尝试安装 better-sqlite3 v7.4.5..."
                    npm install better-sqlite3@7.4.5 --build-from-source

                    if [ $? -ne 0 ]; then
                        echo "安装 better-sqlite3 v7.4.5 失败，尝试最后一种方法..."

                        # 最后尝试安装 sqlite3 作为替代
                        echo "尝试安装 sqlite3 作为替代..."
                        npm install sqlite3

                        if [ $? -ne 0 ]; then
                            echo "警告: 所有 SQLite 数据库依赖安装尝试均失败，系统将使用文件存储模式"
                            echo "您可能需要手动安装数据库依赖"
                        else
                            echo "sqlite3 安装成功，但需要修改代码以适配 sqlite3 API"
                            echo "请参考文档进行代码修改"
                        fi
                    else
                        echo "better-sqlite3 v7.4.5 安装成功"
                    fi
                else
                    echo "better-sqlite3 v7.6.2 安装成功"
                fi
            else
                echo "SQLite 数据库依赖已安装"

                # 验证已安装的 better-sqlite3 是否可用
                echo "验证 better-sqlite3 是否可用..."
                node -e "try { require('better-sqlite3'); console.log('better-sqlite3 可用'); } catch(e) { console.error('better-sqlite3 不可用:', e.message); process.exit(1); }"

                if [ $? -ne 0 ]; then
                    echo "警告: 已安装的 better-sqlite3 不可用，尝试重新安装..."

                    # 卸载并重新安装
                    npm uninstall better-sqlite3
                    rm -rf node_modules/better-sqlite3

                    # 安装兼容版本
                    echo "尝试安装 better-sqlite3 v7.6.2..."
                    npm install better-sqlite3@7.6.2 --build-from-source

                    if [ $? -ne 0 ]; then
                        echo "重新安装 better-sqlite3 失败，请手动解决此问题"
                    else
                        echo "better-sqlite3 重新安装成功"
                    fi
                fi
            fi

            echo "后端依赖安装完成"
            cd ..

            echo "前端使用 HTML5，无需安装依赖"
        fi

        # 运行设置脚本
        if [ -f "scripts/setup.js" ]; then
            echo "运行设置脚本..."
            node scripts/setup.js
        fi
    fi

    echo "步骤 1: 准备后端"
    cd backend
    echo "创建数据目录"
    mkdir -p data

    # 确保数据库目录存在
    mkdir -p data/db

    # 检查是否需要初始化数据库
    if [ ! -f "data/evaluations.db" ]; then
        echo "初始化 SQLite 数据库..."
        # 如果数据库文件不存在，将在首次运行时自动创建
        echo "数据库将在首次运行时自动创建"
    else
        echo "SQLite 数据库已存在"
    fi

    echo "步骤 2: 检查并终止占用 $BACKEND_PORT 端口的进程"
    PORT_PID=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 $BACKEND_PORT 被进程 $PORT_PID 占用，正在终止..."
        kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    fi

    echo "步骤 3: 启动后端服务"
    nohup node server.js > backend.log 2>&1 &
    echo "后端服务已在后台启动，日志保存在 backend/backend.log"
    cd ..

    echo "步骤 4: 准备前端"
    echo "检查并终止占用 $FRONTEND_PORT 端口的进程"
    PORT_PID=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 $FRONTEND_PORT 被进程 $PORT_PID 占用，正在终止..."
        kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    fi

    echo "步骤 5: 启动前端服务 (类型: $FRONTEND_TYPE)"
    cd frontend-html

    if [ "$FRONTEND_TYPE" = "python" ]; then
        # 使用 Python HTTP 服务器部署前端
        # 检查是否安装了 Python
        if command -v python3 &>/dev/null; then
            PYTHON_CMD="python3"
        elif command -v python &>/dev/null; then
            PYTHON_CMD="python"
        else
            echo "错误: 未找到 Python。请安装 Python 3 或 Python 2。"
            exit 1
        fi

        # 检查 Python 版本
        PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
        echo "使用 $PYTHON_VERSION 作为静态文件服务器"

        # 启动 Python 简易 HTTP 服务器
        echo "启动 HTML5 前端服务 (Python HTTP 服务器)..."
        if [[ "$PYTHON_VERSION" == *"Python 3"* ]]; then
            # Python 3
            nohup $PYTHON_CMD -m http.server $FRONTEND_PORT > frontend.log 2>&1 &
        else
            # Python 2
            nohup $PYTHON_CMD -m SimpleHTTPServer $FRONTEND_PORT > frontend.log 2>&1 &
        fi

        SERVER_PID=$!
        echo "HTML5 前端服务已启动，PID: $SERVER_PID"
    elif [ "$FRONTEND_TYPE" = "nginx" ]; then
        # 使用 Nginx 部署前端
        echo "启动 HTML5 前端服务 (Nginx)..."

        # 检查是否安装了 Nginx
        if ! command -v nginx &> /dev/null; then
            echo "错误: 未找到 Nginx。请先安装 Nginx。"
            echo "可以使用以下命令安装: sudo apt-get install nginx"
            exit 1
        fi

        # 检查 Nginx 配置文件是否存在
        if [ ! -f "nginx.conf" ]; then
            echo "错误: 未找到 Nginx 配置文件 (nginx.conf)。"
            exit 1
        fi

        # 创建临时配置文件
        TEMP_CONF=$(mktemp)

        # 替换配置文件中的路径和端口
        cat "nginx.conf" | \
            sed "s|FRONTEND_ROOT_PATH|$(pwd)|g" | \
            sed "s|PORT_NUMBER|$FRONTEND_PORT|g" > "$TEMP_CONF"

        # 尝试使用 Nginx 启动前端服务
        echo "配置 Nginx 服务..."

        # 检查是否有权限操作 Nginx 配置
        if [ -d "/etc/nginx/conf.d" ]; then
            echo "尝试配置 Nginx..."
            sudo cp "$TEMP_CONF" "/etc/nginx/conf.d/dify-frontend.conf"
            sudo nginx -t && sudo systemctl restart nginx

            if [ $? -ne 0 ]; then
                echo "Nginx 配置失败，尝试使用独立配置..."
                sudo nginx -c "$TEMP_CONF" -g "daemon on;"
            fi
        else
            echo "使用独立配置启动 Nginx..."
            sudo nginx -c "$TEMP_CONF" -g "daemon on;"
        fi

        # 检查 Nginx 是否成功启动
        if ! pgrep -x "nginx" > /dev/null; then
            echo "警告: Nginx 可能未成功启动，请检查 Nginx 错误日志。"
            echo "尝试使用 Python HTTP 服务器作为备选方案..."

            # 使用 Python 作为备选方案
            if command -v python3 &>/dev/null; then
                PYTHON_CMD="python3"
            elif command -v python &>/dev/null; then
                PYTHON_CMD="python"
            else
                echo "错误: 未找到 Python。无法启动前端服务。"
                exit 1
            fi

            # 启动 Python 简易 HTTP 服务器
            if [[ "$($PYTHON_CMD --version 2>&1)" == *"Python 3"* ]]; then
                nohup $PYTHON_CMD -m http.server $FRONTEND_PORT > frontend.log 2>&1 &
            else
                nohup $PYTHON_CMD -m SimpleHTTPServer $FRONTEND_PORT > frontend.log 2>&1 &
            fi

            echo "已使用 Python HTTP 服务器作为备选方案启动前端服务"
        else
            echo "Nginx 已成功启动"
        fi

        # 删除临时文件
        rm -f "$TEMP_CONF"
    fi

    cd ..

    echo "步骤 6: 服务访问信息"
    echo "前端地址: http://$HOST:$FRONTEND_PORT"
    echo "后端地址: http://$HOST:$BACKEND_PORT"
    echo "请在局域网中的浏览器访问上述地址"

    echo "启动完成！"
    echo "请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点"
    echo "服务已在后台运行，您可以关闭此终端"
    echo ""
    echo "如需查看日志，请运行:"
    echo "  tail -f backend/backend.log  # 查看后端日志"
    echo "  tail -f frontend-html/frontend.log  # 查看前端日志"
    echo ""
    echo "如需停止服务，请运行:"
    echo "  $0 --action=stop"
}

# 停止服务
stop_services() {
    echo "Dify 评估结果可视化框架服务停止"
    echo "======================================"
    echo "前端端口: $FRONTEND_PORT"

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

    echo "步骤 2: 停止前端服务 (类型: $FRONTEND_TYPE)"

    if [ "$FRONTEND_TYPE" = "python" ]; then
        # 停止 Python HTTP 服务器
        echo "停止 Python HTTP 服务器..."
        FRONTEND_PID=$(pgrep -f "SimpleHTTPServer $FRONTEND_PORT\|http.server $FRONTEND_PORT")
        if [ ! -z "$FRONTEND_PID" ]; then
            echo "发现 Python HTTP 服务进程 $FRONTEND_PID，正在终止..."
            kill $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
            sleep 1
            echo "Python HTTP 服务已终止"
        else
            echo "未发现运行中的 Python HTTP 服务"
        fi
    elif [ "$FRONTEND_TYPE" = "nginx" ]; then
        # 停止 Nginx 服务
        echo "停止 Nginx 服务..."

        # 尝试移除 Nginx 配置文件
        if [ -f "/etc/nginx/conf.d/dify-frontend.conf" ]; then
            echo "移除 Nginx 配置文件..."
            sudo rm -f "/etc/nginx/conf.d/dify-frontend.conf"

            # 重启 Nginx 以应用更改
            echo "重启 Nginx..."
            sudo systemctl restart nginx 2>/dev/null || sudo service nginx restart 2>/dev/null || sudo nginx -s reload 2>/dev/null

            echo "Nginx 配置已移除"
        else
            echo "未找到 Nginx 配置文件"
        fi
    fi

    # 无论使用哪种前端类型，都尝试停止占用前端端口的任何进程
    echo "检查并终止占用前端端口的任何进程..."
    PORT_PID=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "发现端口 $FRONTEND_PORT 被进程 $PORT_PID 占用，正在终止..."
        kill $PORT_PID 2>/dev/null || kill -9 $PORT_PID 2>/dev/null
        sleep 1
        echo "进程已终止"
    else
        echo "未发现端口 $FRONTEND_PORT 被占用"
    fi

    echo "所有服务已停止"
    echo "如需重新启动服务，请运行 $0 --action=start"
}

# 如果指定了 --clean-node 参数，则执行清理 Node.js 版本的操作
if [ "$CLEAN_NODE" = true ]; then
    clean_node_versions
    # 如果没有指定其他操作，则退出
    if [ "$ACTION" = "start" ] || [ "$ACTION" = "stop" ]; then
        echo "Node.js 版本清理完成，继续执行 $ACTION 操作..."
    else
        exit 0
    fi
fi

# 根据 ACTION 参数执行相应操作
if [ "$ACTION" = "start" ]; then
    start_services
elif [ "$ACTION" = "stop" ]; then
    stop_services
fi

# 设置脚本执行权限
chmod +x "$0"
