# Windows开发环境设置指南

本指南将帮助您在Windows上设置开发环境，并确保它能够顺利过渡到Linux部署。

## 前提条件

- Node.js 14+ (推荐 16+)
- npm 6+ (通常随Node.js一起安装)
- Git (可选，用于版本控制)
- http-server (用于启动前端服务器，可通过 `npm install -g http-server` 安装)
- curl (用于测试API，Windows 10/11通常已预装)

## 安装步骤

1. 克隆或下载代码库
2. 打开命令提示符或PowerShell，进入项目根目录
3. 安装依赖：
   ```
   cd backend
   npm install
   ```
4. 安装http-server（如果尚未安装）：
   ```
   npm install -g http-server
   ```

## 开发环境配置

我们提供了几个脚本，用于自动配置和管理Windows开发环境：

### 配置开发环境

运行 `dev-setup.js` 脚本，它将：
- 检测本地IP地址
- 更新后端配置文件
- 创建前端配置文件
- 修改前端HTML文件，使用动态配置

```
node dev-setup.js
```

### 启动开发环境

运行 `start-dev.bat` 脚本，它将：
- 配置开发环境
- 启动后端服务器
- 启动前端服务器

```
start-dev.bat
```

### 停止开发环境

运行 `stop-dev.bat` 脚本，它将：
- 终止所有Node.js进程

```
stop-dev.bat
```

### 测试修改

运行 `test-changes.bat` 脚本，它将：
- 测试数据库文件自动创建功能
- 测试Dify数据保存功能
- 检查是否有JSON文件生成

```
test-changes.bat
```

## 访问应用程序

配置和启动开发环境后，您可以通过以下URL访问应用程序：

- 前端：http://localhost:3001
- 后端API：http://localhost:3000

## 从Windows到Linux的过渡

当您准备将应用程序部署到Linux环境时，只需：

1. 将代码推送到GitHub
2. 在Linux服务器上克隆代码库
3. 运行 `install.sh` 脚本安装和配置系统
4. 运行 `start.sh` 脚本启动服务器

无需修改任何代码，因为我们已经使用动态配置，确保应用程序在不同环境中正常工作。

## 故障排除

### 端口已被占用

如果端口3000或3001已被占用，您可以修改 `start-dev.bat` 脚本，使用其他端口。

### Node.js进程无法终止

如果 `stop-dev.bat` 脚本无法终止Node.js进程，您可以使用任务管理器手动终止它们。

### 前端无法连接到后端

确保防火墙未阻止端口3000，或者尝试使用 `localhost` 而不是IP地址。
