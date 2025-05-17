# RAGLLM 评估系统后端

这是RAGLLM评估系统的后端服务，使用Express.js和SQLite数据库实现。

## 功能特点

- 使用SQLite + JSON1扩展存储评估数据
- RESTful API设计
- 支持分页、排序和过滤
- 统计数据缓存机制
- 自动备份功能

## 安装

1. 确保已安装Node.js (v14+)
2. 克隆仓库
3. 进入后端目录
4. 运行安装脚本

```bash
node install.js
```

## 启动服务器

```bash
npm start
```

开发模式（自动重启）:

```bash
npm run dev
```

## API文档

### 评估数据管理

#### 保存评估数据

```
POST /api/evaluations
POST /api/save-evaluation (兼容旧API)
```

请求体示例:

```json
{
  "result0": {
    "CAS Name": "user@example.com",
    "Product Family": "IVN",
    "MAG": "R16",
    "Part Number": "TJA1145A",
    "Question": "Why can't TJA1145 enter sleep mode？",
    "Answer": "It is recommended to check whether there is a pending wake-up event...",
    "Question Scenario": "Parameter Configuration",
    "Answer Source": "TJA1145A: Chapter 7.1.1.3",
    "Question Complexity": "Low",
    "Question Frequency": "High",
    "Question Category": "Low Complexity Question",
    "Source Category": "Public",
    "hallucination_control": 90,
    "quality": 85,
    "professionalism": 80,
    "usefulness": 75,
    "average_score": 82,
    "summary": "The LLM answer provides a detailed explanation...",
    "LLM_ANSWER": "hello"
  }
}
```

#### 获取评估列表

```
GET /api/evaluations
```

查询参数:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `productFamily`: 按产品系列过滤
- `partNumber`: 按产品号过滤
- `mag`: 按MAG过滤
- `category`: 按问题类别过滤
- `complexity`: 按复杂度过滤
- `sortBy`: 排序字段 (timestamp, average_score, hallucination_control, quality, professionalism, usefulness)
- `sortOrder`: 排序顺序 (asc, desc)

#### 获取单个评估详情

```
GET /api/evaluations/:id
```

### 统计数据

#### 获取总体统计概览

```
GET /api/stats/overview
GET /api/stats (兼容旧API)
```

## 数据库结构

系统使用SQLite数据库，主要表结构如下:

### evaluations 表

存储所有评估数据，使用JSON1扩展创建虚拟列用于索引和查询。

### products 表

缓存产品信息，提高查询效率。

### mags 表

缓存MAG信息。

### stats_cache 表

缓存预计算的统计数据，减少重复计算。

## 文件结构

- `server.js`: 主服务器文件
- `database.js`: 数据库初始化和连接
- `evaluations-dal.js`: 评估数据访问层
- `api-routes.js`: API路由定义
- `middleware/`: 中间件目录
- `utils/`: 工具函数目录
- `data/`: 数据存储目录

## 注意事项

- 首次运行时会自动创建数据库和表结构
- 数据存储在 `data/evaluations.db` 文件中
- 建议定期备份数据库文件
