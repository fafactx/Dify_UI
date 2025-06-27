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
    echo ❌ 环境检查失败，请解决上述问题后重新运行
    pause
    exit /b 1
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
