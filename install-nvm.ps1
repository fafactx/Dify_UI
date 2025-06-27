# 下载nvm-windows安装程序
$nvmUrl = "https://github.com/coreybutler/nvm-windows/releases/download/1.1.11/nvm-setup.exe"
$nvmInstaller = "$env:TEMP\nvm-setup.exe"

Write-Host "正在下载nvm-windows安装程序..."
Invoke-WebRequest -Uri $nvmUrl -OutFile $nvmInstaller

# 运行安装程序
Write-Host "正在安装nvm-windows..."
Start-Process -FilePath $nvmInstaller -Wait

# 安装完成后，刷新环境变量
Write-Host "刷新环境变量..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 安装Node.js 18.x
Write-Host "安装Node.js 18.x..."
nvm install 18.18.0
nvm use 18.18.0

# 验证安装
Write-Host "验证安装..."
node -v
npm -v

Write-Host "安装完成！"
