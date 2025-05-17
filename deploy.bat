@echo off
echo Dify 评估结果可视化框架部署脚本
echo ======================================

echo 步骤 1: 安装后端依赖
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo 安装依赖失败，请检查 Node.js 是否正确安装
    exit /b %ERRORLEVEL%
)

echo 步骤 2: 创建数据目录
if not exist data mkdir data

echo 步骤 3: 启动后端服务
start cmd /k node server.js

echo 步骤 4: 打开可视化仪表板
timeout /t 3
start http://localhost:3000

echo 部署完成！
echo 请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点
echo 服务器日志将显示在新打开的命令行窗口中

cd ..
