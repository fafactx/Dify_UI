@echo off
echo 测试修改...

echo 1. 检查后端服务器是否正在运行...
netstat -ano | findstr :3000
if %errorlevel% neq 0 (
  echo 后端服务器未运行，请先启动开发环境！
  exit /b 1
)

echo 2. 测试数据库文件自动创建功能...
if exist backend\data\evaluations.db (
  echo 删除现有数据库文件...
  del backend\data\evaluations.db
)

echo 重启后端服务器...
taskkill /f /im node.exe
timeout /t 2
start cmd /k "cd backend && node server.js"
timeout /t 5

echo 检查数据库文件是否已创建...
if exist backend\data\evaluations.db (
  echo 数据库文件已自动创建，测试通过！
) else (
  echo 数据库文件未创建，测试失败！
  exit /b 1
)

echo 3. 测试Dify数据保存功能...
echo 发送测试数据...
curl -X POST -H "Content-Type: application/json" -d "{\"result0\": {\"CAS Name\": \"Test CAS\", \"Product Family\": \"Test Family\", \"Part Number\": \"PN-1001\", \"MAG\": \"MAG-001\", \"hallucination_control\": 80, \"quality\": 75, \"professionalism\": 70, \"usefulness\": 65}}" http://localhost:3000/api/save-evaluation

echo 4. 检查数据目录，确认没有生成JSON文件...
dir backend\data\*.json
if %errorlevel% equ 0 (
  echo 发现JSON文件，测试失败！
  exit /b 1
) else (
  echo 未发现JSON文件，测试通过！
)

echo 所有测试已完成！
