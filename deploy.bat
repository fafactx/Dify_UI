@echo off
echo Dify 评估结果可视化框架部署脚本
echo ======================================

:: 检查是否使用 --install 参数
if "%1"=="--install" (
    echo 步骤 1: 安装依赖

    :: 检查根目录 package.json 是否存在
    if exist "package.json" (
        echo 使用根目录 package.json 安装依赖...
        call npm install
        call npm run install:all
        if %ERRORLEVEL% neq 0 (
            echo 安装依赖失败，请检查 Node.js 是否正确安装
            exit /b %ERRORLEVEL%
        )
    ) else (
        echo 安装后端依赖...
        cd backend
        call npm install
        if %ERRORLEVEL% neq 0 (
            echo 安装后端依赖失败，请检查 Node.js 是否正确安装
            exit /b %ERRORLEVEL%
        )
        echo 后端依赖安装完成
        cd ..

        echo 安装前端依赖...
        cd frontend
        call npm install
        if %ERRORLEVEL% neq 0 (
            echo 安装前端依赖失败，请检查 Node.js 是否正确安装
            exit /b %ERRORLEVEL%
        )
        echo 前端依赖安装完成
        cd ..
    )

    :: 运行设置脚本
    if exist "scripts\setup.js" (
        echo 运行设置脚本...
        node scripts\setup.js
    )
)

echo 步骤 1: 准备后端
cd backend
echo 创建数据目录
if not exist data mkdir data

echo 步骤 2: 检查并终止占用 3000 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 发现端口 3000 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a
    timeout /t 1 /nobreak > nul
    echo 进程已终止
)

echo 步骤 3: 启动后端服务
start cmd /k node server.js
cd ..

echo 步骤 4: 准备前端
cd frontend
echo 检查并终止占用 3001 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo 发现端口 3001 被进程 %%a 占用，正在终止...
    taskkill /F /PID %%a
    timeout /t 1 /nobreak > nul
    echo 进程已终止
)

echo 步骤 5: 启动前端服务
start cmd /k npm run dev
cd ..

echo 步骤 6: 打开可视化仪表板
timeout /t 5
start http://10.193.21.115:3001

echo 部署完成！
echo 请按照 README.md 中的说明在 Dify 工作流中集成 Code 节点
echo 服务器日志将显示在新打开的命令行窗口中
echo.
echo 提示: 如果需要安装依赖，请使用 deploy.bat --install
