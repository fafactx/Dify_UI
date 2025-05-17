# Dify 评估结果可视化仪表板

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-green)

这是一个用于可视化 Dify 工作流评估结果的框架，包括后端 API 和现代化前端实现。该框架允许你将 Dify 工作流中的评估结果保存并可视化，支持多种图表、排序、搜索和对比功能。

## 技术栈

基于 React 18、TypeScript、Chakra UI 和 ECharts 5 构建的现代化实现，提供丰富的视觉效果和交互体验。

## 功能特点

- 📊 实时显示评估结果统计数据
- 📈 多种图表展示评估维度分布
- 🔍 可排序和搜索的评估结果表格
- 📋 详细的评估结果查看
- 🔄 多结果对比功能
- 📉 时间趋势分析
- ⚖️ 维度权重配置
- 📤 数据导出功能
- 🌙 现代暗色主题 - 专为数据可视化优化的深色界面
- ✨ 流畅的动画效果 - 使用 Framer Motion 实现平滑过渡
- 📱 完全响应式设计 - 完美适配各种屏幕尺寸
- 🎨 高级图表效果 - 3D 雷达图、渐变填充、动态效果
- 💎 精美 UI 组件 - 使用 Chakra UI 构建的现代界面

## 部署步骤

### 前提条件

- Node.js 14+
- 运行中的 Dify 工作流

### 步骤 1：克隆或下载代码

确保你已经下载了完整的代码库，包含以下目录结构：

```
DIFY_UI/
├── backend/                # 后端服务
│   ├── data/               # 存储评估数据的文件夹
│   ├── dify_code.py        # Dify Code 节点脚本
│   ├── server.js           # Express 服务器
│   └── package.json        # 后端依赖
├── frontend/               # 现代化前端
│   ├── src/                # 源代码
│   │   ├── components/     # 组件
│   │   │   ├── charts/     # 图表组件
│   │   │   ├── dashboard/  # 仪表板组件
│   │   │   ├── modals/     # 模态框组件
│   │   │   └── table/      # 表格组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── store/          # 状态管理
│   │   ├── theme/          # 主题配置
│   │   └── utils/          # 工具函数
│   ├── package.json        # 前端依赖
│   ├── deploy.bat          # Windows 前端部署脚本
│   └── deploy.sh           # Linux 前端部署脚本
├── deploy.bat              # Windows 完整部署脚本
├── deploy.sh               # Linux 完整部署脚本
└── README.md               # 项目说明
```

### 步骤 2：安装依赖

**方法 1：使用根目录 package.json（推荐）**

打开命令行终端，在项目根目录中运行：

```bash
# 安装根目录依赖
npm install

# 安装所有子项目依赖
npm run install:all

# 运行设置脚本（配置身份验证等）
npm run setup
```

**方法 2：手动安装各个部分**

或者，您可以分别安装后端和前端依赖：

```bash
# 安装后端依赖
cd DIFY_UI/backend
npm install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..
```

这将安装 Express、CORS 和其他必要的依赖项。

### 步骤 3：启动后端服务

在后端目录中，启动 Express 服务器：

```bash
node server.js
```

你应该会看到以下输出：

```
服务器运行在 http://10.193.21.115:3000
```

### 步骤 4：在 Dify 工作流中集成

1. 登录到你的 Dify 账户
2. 打开包含评估结果的工作流
3. 在最后一个输出评估结果的节点后添加一个 Code 节点
4. 将 `backend/dify_code.py` 中的代码复制到 Code 节点中
5. 配置 Code 节点的输入参数，确保它接收前一个节点的评估结果输出
6. 保存工作流

### 步骤 5：测试集成

1. 运行 Dify 工作流，生成一些评估结果
2. 检查后端服务器的控制台输出，确认数据已成功接收
3. 检查 `backend/data` 目录，确认评估数据文件已创建

### 步骤 6：部署前端

**在 Linux 上:**

```bash
cd DIFY_UI/frontend
chmod +x deploy.sh
./deploy.sh --install  # 首次运行时安装依赖
```

**在 Windows 上:**

```bash
cd DIFY_UI\frontend
deploy.bat --install  # 首次运行时安装依赖
```

部署完成后，在浏览器中打开 http://10.193.21.115:3001 即可访问可视化仪表板。

### 步骤 7：配置身份验证

为了保护您的仪表板，系统使用基本身份验证。请按照以下步骤配置：

1. 复制配置文件模板：
   ```bash
   cd backend
   cp config.example.js config.js
   ```

2. 编辑 `config.js` 文件，设置您的用户名和密码：
   ```javascript
   module.exports = {
     auth: {
       username: 'your_username',
       password: 'your_secure_password'
     }
   };
   ```

> **安全提示**：`config.js` 文件包含敏感信息，已被添加到 `.gitignore` 中，不会被提交到版本控制系统。

### 步骤 8：一键部署（后端+前端）

如果您想一次性部署后端和前端，可以使用根目录下的部署脚本：

**在 Linux 上:**

```bash
cd DIFY_UI
chmod +x deploy.sh
./deploy.sh --install  # 首次运行时安装依赖
```

**在 Windows 上:**

```bash
cd DIFY_UI
deploy.bat --install  # 首次运行时安装依赖
```

部署完成后，浏览器会自动打开 http://10.193.21.115:3001 访问可视化仪表板。

## 使用指南

### 查看统计数据

仪表板顶部显示评估总数、总平均分和最高评分维度等统计数据，提供精美的卡片设计和微型趋势图。

### 查看图表

- **评分维度分布**：雷达图展示各维度的平均分布，提供 3D 效果和渐变填充
- **评分维度对比**：柱状图对比各维度的平均分，提供动画效果和丰富的颜色
- **评分随时间变化趋势**：折线图展示评分随时间的变化，提供平滑曲线和区域填充

### 查看评估结果列表

表格展示所有评估结果，支持：
- 按任意列排序（点击列标题或使用排序下拉菜单）
- 搜索过滤（使用搜索框）
- 查看详情（点击"详情"按钮）
- 添加到对比（点击"对比"按钮）

### 配置维度权重

1. 点击导航栏中的天平图标
2. 调整各维度的权重滑块
3. 点击"应用"按钮保存设置
4. 查看加权平均分列，了解权重调整后的结果

### 对比评估结果

1. 在表格中点击"对比"按钮，将评估结果添加到对比列表
2. 点击导航栏中的"对比"按钮，查看所选评估结果的对比视图
3. 在对比视图中，可以看到雷达图和表格形式的对比

### 导出数据

点击表格上方的"导出 CSV"按钮，可以将当前筛选的评估结果导出为 CSV 文件。

## Docker 部署（可选）

如果你希望使用 Docker 部署，可以按照以下步骤操作：

### 步骤 1：安装 Docker 和 Docker Compose

确保你的系统已安装 Docker 和 Docker Compose。

### 步骤 2：构建和启动容器

在项目根目录中运行：

```bash
docker-compose up -d
```

这将构建 Docker 镜像并在后台启动容器。

### 步骤 3：访问仪表板

在浏览器中打开 http://10.193.21.115:3001 访问可视化仪表板

## 故障排除

### 无法连接到服务器

- 确保后端服务器正在运行
- 检查端口 3000 是否被其他应用占用
- 如果使用 Docker，确保容器正在运行

### 无法显示数据

- 检查 Dify Code 节点是否正确配置
- 检查网络连接是否正常
- 查看后端服务器的控制台输出，检查是否有错误

### 图表不显示

- 检查浏览器控制台是否有错误信息
- 确保你的浏览器支持 ECharts 5
- 确保 React 和 Chakra UI 正确加载

## 维护与更新

### 数据备份

评估数据存储在 `backend/data` 目录中，建议定期备份该目录。

### 清理旧数据

如果数据量变得很大，可以手动删除 `backend/data` 目录中的旧文件，但请确保保留 `index.json` 文件或在删除后重新创建它。

### 更新框架

1. 拉取最新代码
   ```bash
   git pull
   ```

2. 使用根目录 package.json（推荐）
   ```bash
   npm install  # 更新根目录依赖
   npm run install:all  # 更新所有子项目依赖
   ```

3. 或者手动更新各部分
   ```bash
   # 更新后端
   cd backend
   npm install  # 如有新依赖
   cd ..

   # 更新前端
   cd frontend
   npm install  # 如有新依赖
   cd ..
   ```

4. 启动服务
   ```bash
   # 使用根目录脚本启动所有服务
   npm run start

   # 或者分别启动
   cd backend
   node server.js
   cd ..

   cd frontend
   npm run dev
   cd ..
   ```

5. 如使用 Docker，重新构建容器
   ```bash
   docker-compose up -d --build
   ```

## 技术栈详情

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 应用框架
- **文件系统存储** - 使用 JSON 文件存储评估数据

### 传统版前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Bootstrap 5** - 响应式 CSS 框架
- **Chart.js** - 简单易用的图表库

### 现代版前端
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速的构建工具
- **Chakra UI** - 美观且高度可定制的组件库
- **ECharts 5** - 强大的数据可视化库
- **Framer Motion** - 流畅的动画效果
- **React Query** - 数据获取和缓存
- **Zustand** - 轻量级状态管理

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤:

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。
