#!/bin/bash

echo "Node.js 升级脚本"
echo "======================================"

# 检查当前 Node.js 版本
current_node_version=$(node -v 2>/dev/null)
echo "当前 Node.js 版本: ${current_node_version:-未安装}"

# 检查是否已安装 NVM
if [ -d "$HOME/.nvm" ]; then
    echo "NVM 已安装，正在更新..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # 加载 NVM
    nvm --version
else
    echo "正在安装 NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
    
    # 设置 NVM 环境变量
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # 加载 NVM
    
    # 验证安装
    if [ -d "$HOME/.nvm" ]; then
        echo "NVM 安装成功!"
    else
        echo "NVM 安装失败，请手动安装。"
        exit 1
    fi
fi

# 安装 Node.js LTS 版本
echo "正在安装 Node.js LTS 版本..."
nvm install --lts

# 设置为默认版本
nvm alias default node

# 验证安装
new_node_version=$(node -v)
echo "Node.js 已升级到: $new_node_version"
echo "npm 版本: $(npm -v)"

# 更新项目依赖
echo "是否要重新安装项目依赖? (y/n)"
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
    if [ -d "frontend" ]; then
        echo "正在重新安装前端依赖..."
        cd frontend
        rm -rf node_modules package-lock.json
        npm install
        cd ..
    fi
    
    if [ -d "backend" ]; then
        echo "正在重新安装后端依赖..."
        cd backend
        rm -rf node_modules package-lock.json
        npm install
        cd ..
    fi
    
    echo "依赖安装完成!"
fi

echo "======================================"
echo "Node.js 升级完成!"
echo "请运行以下命令使 NVM 设置在当前终端生效:"
echo "  source ~/.bashrc"
echo "或关闭终端并重新打开"
echo "然后运行 './deploy.sh --install' 重新部署应用"
