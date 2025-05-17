@echo off
echo Dify 评估结果可视化框架部署脚本
echo ======================================

cd backend

:: 检查是否使用 --install 参数
if "%1"=="--install" (
    echo 步骤 1: 安装后端依赖
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo 安装依赖失败，请检查 Node.js 是否正确安装
        exit /b %ERRORLEVEL%
    )
    echo 依赖安装完成
)

echo 步骤 1: 创建数据目录
if not exist data mkdir data

echo 步骤 2: 启动后端服务
start cmd /k node server.js

echo 步骤 3: 打开可视化仪表板
timeout /t 3
start http://10.193.21.115:3000

echo 部署完成！
echo 请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点
echo 服务器日志将显示在新打开的命令行窗口中
echo.
echo 提示: 如果需要安装依赖，请使用 deploy.bat --install

cd ..
