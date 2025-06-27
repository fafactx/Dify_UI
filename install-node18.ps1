# 下载Node.js 18.x安装程序
$nodeUrl = "https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi"
$nodeInstaller = "$env:TEMP\node-v18.18.0-x64.msi"

Write-Host "正在下载Node.js 18.18.0安装程序..."
Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller

# 运行安装程序
Write-Host "正在安装Node.js 18.18.0..."
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait

# 安装完成后，刷新环境变量
Write-Host "刷新环境变量..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 验证安装
Write-Host "验证安装..."
& "C:\Program Files\nodejs\node.exe" -v
& "C:\Program Files\nodejs\npm.exe" -v

Write-Host "安装完成！请重新启动PowerShell或命令提示符以使用新安装的Node.js。"
