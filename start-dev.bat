@echo off
echo 配置开发环境...
node dev-setup.js

echo 启动后端服务器...
start cmd /k "cd backend && node server.js"

echo 等待后端服务器启动...
timeout /t 5

echo 启动前端服务器...
start cmd /k "cd frontend-html && npx http-server -p 3001"

echo 开发环境已启动！
echo 前端URL: http://localhost:3001
echo 后端URL: http://localhost:3000
