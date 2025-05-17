@echo off
echo Dify 评估结果可视化框架部署脚本 (现代版)
echo ======================================

:: 检查是否使用 --install 参数
if "%1"=="--install" (
    echo 步骤 1: 安装前端依赖
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo 安装依赖失败，请检查 Node.js 是否正确安装
        exit /b %ERRORLEVEL%
    )
    echo 依赖安装完成
)

echo 步骤 1: 检查并终止占用 3001 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo 发现端口 3001 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a
    timeout /t 1 /nobreak > nul
    echo 进程已终止
)

echo 步骤 2: 启动开发服务器
start cmd /k npm run dev

echo 步骤 3: 打开可视化仪表板
timeout /t 3
start http://10.193.21.115:3001

echo 部署完成！
echo 服务器日志将显示在新打开的命令行窗口中
echo.
echo 提示: 如果需要安装依赖，请使用 deploy.bat --install
