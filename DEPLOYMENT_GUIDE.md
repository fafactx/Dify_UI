# RAGLLM评估系统部署指南

## 🎯 系统概述

RAGLLM评估系统是一个专业的RAGLLM(Retrieval-Augmented Generation Large Language Model)评估结果可视化平台，提供实时数据分析、多维度评估和智能可视化功能。

## 🔧 问题解决方案

### 已解决的核心问题

1. **数据库连接架构重构** ✅
   - 创建了统一的数据库管理器 (`database-manager.js`)
   - 实现了单例模式，避免多重连接冲突
   - 添加了连接重试机制和健康检查

2. **配置管理统一** ✅
   - 修正了IP地址配置为 `10.193.21.115`
   - 统一了前后端配置
   - 解决了API配置冲突问题

3. **依赖管理优化** ✅
   - 添加了Better-SQLite3编译环境检查
   - 创建了自动修复脚本
   - 优化了依赖安装流程

4. **错误处理完善** ✅
   - 实现了数据库连接重试机制
   - 添加了详细的错误日志
   - 创建了优雅降级方案

## 🚀 快速启动

### 方法1: 使用启动脚本 (推荐)

**Windows:**
```cmd
start-server.bat
```

**Linux/macOS:**
```bash
chmod +x start-server.sh
./start-server.sh
```

### 方法2: 手动启动

1. **环境检查**
   ```bash
   cd backend
   npm run check
   ```

2. **安装依赖** (如果需要)
   ```bash
   npm run setup
   ```

3. **启动服务器**
   ```bash
   npm start
   ```

## 📋 系统要求

- **Node.js**: 14.0.0 或更高版本
- **操作系统**: Windows 10+, Ubuntu 18.04+, macOS 10.15+
- **内存**: 最少 512MB RAM
- **磁盘**: 最少 100MB 可用空间

### 编译环境要求 (Better-SQLite3)

**Windows:**
```cmd
npm install --global windows-build-tools
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install build-essential python3
```

**CentOS/RHEL:**
```bash
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

## 🔍 故障排除

### 常见问题及解决方案

#### 1. 数据库连接失败
```
错误: "The database connection is not open"
```

**解决方案:**
```bash
cd backend
npm run check          # 运行环境检查
npm run rebuild         # 重新编译Better-SQLite3
```

#### 2. Better-SQLite3编译失败
```
错误: "Module did not self-register"
```

**解决方案:**
```bash
# 删除node_modules并重新安装
rm -rf node_modules package-lock.json
npm install
npm rebuild better-sqlite3
```

#### 3. 端口被占用
```
错误: "EADDRINUSE: address already in use :::3000"
```

**解决方案:**
```bash
# 查找占用端口的进程
netstat -tlnp | grep :3000
# 或者修改config.js中的端口配置
```

#### 4. 权限问题
```
错误: "EACCES: permission denied"
```

**解决方案:**
```bash
# 设置数据目录权限
chmod 755 backend/data
# 或者以管理员权限运行
```

## 🌐 访问地址

启动成功后，可以通过以下地址访问系统：

- **前端界面**: http://10.193.21.115:3000
- **API状态**: http://10.193.21.115:3000/api/stats
- **数据库信息**: http://10.193.21.115:3000/api/dbinfo

## 📊 API接口

### 核心API端点

| 端点 | 方法 | 功能 | 说明 |
|------|------|------|------|
| `/api/save-evaluation` | POST | 保存评估数据 | Dify工作流调用 |
| `/api/evaluations` | GET | 获取评估列表 | 支持分页和过滤 |
| `/api/stats` | GET | 获取统计概览 | 实时统计数据 |
| `/api/test-cases` | GET | 获取测试用例 | 前端界面使用 |

### Dify集成

在Dify工作流的Python Code节点中使用：

```python
import requests
import json

# 评估数据
evaluation_data = {
    "result0": {
        "CAS Name": "测试案例",
        "Product Family": "IVN",
        "Part Number": "TJA1145",
        "hallucination_control": 4.5,
        "quality": 4.2,
        "professionalism": 4.8,
        "usefulness": 4.3,
        "average_score": 4.45
    }
}

# 发送到评估系统
response = requests.post(
    "http://10.193.21.115:3000/api/save-evaluation",
    headers={"Content-Type": "application/json"},
    data=json.dumps(evaluation_data)
)

print(response.json())
```

## 🔧 配置说明

### 后端配置 (`backend/config.js`)

```javascript
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    publicUrl: '10.193.21.115'  // 你的服务器IP
  },
  storage: {
    dataDir: './data'
  },
  // ... 其他配置
};
```

### 前端配置 (`frontend-html/js/config.js`)

```javascript
window.appConfig = {
  apiBaseUrl: 'http://10.193.21.115:3000'  // 后端API地址
};
```

## 📈 性能优化

### 数据库优化
- 使用Better-SQLite3高性能同步引擎
- 实现了智能缓存机制
- 创建了虚拟列索引

### 前端优化
- 双图表引擎 (ECharts + Chart.js)
- 响应式设计
- 异步数据加载

## 🔒 安全考虑

- CORS跨域保护
- 请求频率限制
- 数据验证中间件
- 错误信息过滤

## 📝 日志管理

日志文件位置：
- 应用日志: `backend/logs/app.log`
- 错误日志: `backend/logs/error.log`
- 数据库日志: `backend/logs/database.log`

## 🔄 备份与恢复

### 自动备份
系统会自动备份SQLite数据库文件到 `backend/backups/` 目录。

### 手动备份
```bash
cp backend/data/evaluations.db backend/backups/evaluations_$(date +%Y%m%d_%H%M%S).db
```

## 🆘 技术支持

如果遇到问题，请按以下步骤操作：

1. **运行环境检查**
   ```bash
   cd backend
   npm run check
   ```

2. **查看日志文件**
   ```bash
   tail -f backend/logs/app.log
   ```

3. **重新安装依赖**
   ```bash
   npm run setup
   ```

4. **联系技术支持**
   - 提供错误日志
   - 说明操作步骤
   - 描述系统环境

## 🎉 成功部署验证

部署成功后，你应该能够：

1. ✅ 访问前端界面显示仪表板
2. ✅ API返回正常的统计数据
3. ✅ Dify工作流能够成功发送数据
4. ✅ 数据库正常存储和查询数据

恭喜！你的RAGLLM评估系统已经成功部署并解决了所有已知问题。
