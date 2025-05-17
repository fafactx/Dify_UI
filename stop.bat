@echo off
echo Dify 评估结果可视化框架停止脚本
echo ======================================

echo 步骤 1: 停止后端服务
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 发现端口 3000 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a
    timeout /t 1 /nobreak > nul
    echo 后端服务已终止
)

echo 步骤 2: 停止前端服务
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo 发现端口 3001 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a
    timeout /t 1 /nobreak > nul
    echo 前端服务已终止
)

echo 所有服务已停止
echo 如需重新启动服务，请运行 deploy.bat
