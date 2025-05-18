@echo off
echo 停止开发服务器...

echo 查找并终止Node.js进程...
taskkill /f /im node.exe

echo 开发服务器已停止！
