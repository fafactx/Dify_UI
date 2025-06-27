@echo off
chcp 65001 >nul

echo 🚀 RAGLLM评估系统启动脚本
echo ================================

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js 14.0.0或更高版本
    pause
    exit /b 1
)

echo ✅ Node.js版本:
node --version

REM 进入后端目录
cd backend

echo.
echo 📋 运行环境检查...
node check-environment.js

REM 检查环境检查是否成功
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  环境检查发现问题，正在自动修复...

    REM 自动修复Better-SQLite3问题
    echo 🔧 修复Better-SQLite3编译问题...

    REM 清理并重新安装
    echo    清理node_modules...
    if exist node_modules rmdir /s /q node_modules
    if exist package-lock.json del /f package-lock.json

    REM 重新安装依赖
    echo    重新安装依赖包...
    npm install

    REM 单独重新编译Better-SQLite3
    echo    重新编译Better-SQLite3...
    npm rebuild better-sqlite3

    REM 如果还有问题，尝试使用预编译版本
    node -e "require('better-sqlite3')" >nul 2>&1
    if %errorlevel% neq 0 (
        echo    尝试使用预编译版本...
        npm uninstall better-sqlite3
        npm install better-sqlite3@8.4.0
    )

    REM 修复npm安全漏洞
    echo 🔒 修复npm安全漏洞...
    npm audit fix --force >nul 2>&1

    REM 再次运行环境检查
    echo 🔍 重新运行环境检查...
    node check-environment.js

    if %errorlevel% neq 0 (
        echo.
        echo ❌ 自动修复失败，请手动解决问题
        pause
        exit /b 1
    )

    echo ✅ 自动修复完成
)

echo.
echo 🔍 检查端口3000占用情况...

REM 检查端口3000是否被占用
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    set PID=%%a
    goto :found
)
goto :notfound

:found
echo ⚠️  发现端口3000被进程 %PID% 占用
echo 🔧 正在终止占用进程...
taskkill /PID %PID% /F >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 成功终止占用进程
    timeout /t 2 /nobreak >nul
) else (
    echo ❌ 无法终止进程，可能需要管理员权限
    echo 💡 请以管理员身份运行此脚本，或手动终止进程ID: %PID%
    pause
    exit /b 1
)

:notfound
echo ✅ 端口3000可用

echo.
echo 🚀 启动服务器...
echo 服务器将在 http://10.193.21.115:3000 上运行
echo 前端界面: http://10.193.21.115:3000
echo API文档: http://10.193.21.115:3000/api/stats
echo.
echo 按 Ctrl+C 停止服务器
echo.

REM 启动服务器
node server.js

pause
