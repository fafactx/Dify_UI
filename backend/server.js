// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 导入中间件
const { validateSaveEvaluation, errorHandler, notFound } = require('./middleware/validation');
const createRateLimiter = require('./middleware/rate-limiter');

// 导入日志工具
const { Logger } = require('./utils/logger');

// 导入备份工具
const { createBackup } = require('./utils/backup');

// 导入API路由
const apiRoutes = require('./api-routes');

// 导入数据库模块
const { getDatabase } = require('./database');

// 加载配置
let config;
try {
  config = require('./config');
  console.log('已加载配置文件');
} catch (error) {
  console.warn('未找到配置文件 config.js，使用默认配置');
  config = require('./config.example');
}

// 获取本地IP地址（用于日志显示）
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过非IPv4和内部接口
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        continue;
      }
      return iface.address;
    }
  }
  return '127.0.0.1';
}

// 设置公共URL
const localIp = getLocalIpAddress();
const publicUrl = config.server.publicUrl || localIp;

// 初始化日志记录器
const logger = new Logger(config.logging);

// 初始化 Express 应用
const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// 将logger实例添加到app.locals，使其在中间件中可用
app.locals.logger = logger;

// 配置CORS - 允许所有来源访问API
app.use(cors({
  origin: '*',  // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// 添加JSON解析中间件
app.use(express.json({ limit: '50mb' }));

// 请求限流中间件
if (config.rateLimit && config.rateLimit.enabled) {
  logger.info(`启用请求限流: ${config.rateLimit.maxRequests}个请求/${config.rateLimit.windowMs/1000}秒`);
  app.use(createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests
  }));
}

// 其他中间件
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 静态文件服务 - 同时支持 frontend 和 frontend-html 目录
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '..')));

// 添加调试中间件，记录所有请求
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 确保数据目录存在
const dataDir = path.join(__dirname, config.storage.dataDir);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 注意：旧的 /api/save-evaluation 和 /api/evaluations 端点已移除，现在使用 api-routes.js 中的实现

// 注意：旧的 /api/stats 端点已移除，现在使用 api-routes.js 中的实现

// 注意：旧的更新索引文件函数已移除，现在使用SQLite数据库存储所有数据

// 初始化数据库
// 使用配置中的数据目录路径
const dbDir = path.join(__dirname, config.storage.dataDir);
const dbPath = path.join(dbDir, 'evaluations.db');

logger.info(`数据库路径: ${dbPath}`);
logger.info(`操作系统: ${process.platform}`);
logger.info(`Node.js版本: ${process.version}`);
logger.info(`当前工作目录: ${process.cwd()}`);

// 确保数据目录存在
if (!fs.existsSync(dbDir)) {
  logger.info(`数据目录不存在，正在创建: ${dbDir}`);
  try {
    fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
    logger.info(`数据目录创建成功: ${dbDir}`);
  } catch (dirError) {
    logger.error(`创建数据目录失败: ${dirError.message}`);
    logger.error(`错误堆栈: ${dirError.stack}`);
  }
}

// 检查数据目录权限
try {
  fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);
  logger.info(`数据目录权限正常: ${dbDir}`);

  // 列出目录内容
  const dirContents = fs.readdirSync(dbDir);
  logger.info(`数据目录内容: ${dirContents.join(', ') || '(空)'}`);
} catch (accessError) {
  logger.error(`数据目录权限不足: ${accessError.message}`);
}

// 初始化数据库
logger.info(`初始化数据库: ${dbPath}`);
try {
  // 获取数据库连接
  const db = getDatabase(dbPath);
  logger.info('数据库初始化成功');

  // 检查数据库记录数
  try {
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM evaluations');
    const { count } = countStmt.get();
    logger.info(`数据库中有 ${count} 条评估数据`);

    // 不再自动插入测试数据，只有 Dify 节点触发的数据才会被保存
    logger.info('数据库初始化完成，等待 Dify 节点触发数据保存');
  } catch (countError) {
    logger.error(`查询数据库记录数失败: ${countError.message}`);
    logger.error(`错误堆栈: ${countError.stack}`);
  }
} catch (error) {
  logger.error(`数据库初始化失败: ${error.message}`);
  logger.error(`错误堆栈: ${error.stack}`);

  // 尝试使用绝对路径
  try {
    logger.info(`尝试使用绝对路径初始化数据库...`);
    const absoluteDbPath = path.resolve(__dirname, config.storage.dataDir, 'evaluations.db');
    logger.info(`绝对路径: ${absoluteDbPath}`);

    const db = getDatabase(absoluteDbPath);
    logger.info(`使用绝对路径初始化数据库成功`);
  } catch (absPathError) {
    logger.error(`使用绝对路径初始化数据库失败: ${absPathError.message}`);
  }
}

// 注册API路由
app.use('/api', apiRoutes);

// 添加404处理中间件
app.use(notFound);

// 添加错误处理中间件
app.use(errorHandler);

// 设置自动备份
let backupInterval = null;

if (config.backup && config.backup.enabled) {
  const backupDir = path.join(__dirname, config.backup.backupDir);

  // 确保备份目录存在
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 清理旧备份
  function cleanupOldBackups() {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.tar.gz'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // 按时间降序排序

      // 如果备份数量超过最大值，删除最旧的备份
      if (files.length > config.backup.maxBackups) {
        const filesToDelete = files.slice(config.backup.maxBackups);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
          logger.info(`删除旧备份: ${file.name}`);
        });
      }
    } catch (error) {
      logger.error(`清理旧备份失败: ${error.message}`);
    }
  }

  // 执行备份
  async function performBackup() {
    try {
      logger.info('开始执行自动备份...');
      await createBackup(dataDir, backupDir, logger);
      cleanupOldBackups();
    } catch (error) {
      logger.error(`自动备份失败: ${error.message}`);
    }
  }

  // 设置定时备份
  backupInterval = setInterval(performBackup, config.backup.frequency);
  logger.info(`已启用自动备份: 每 ${config.backup.frequency / (60 * 60 * 1000)} 小时`);

  // 立即执行一次备份
  performBackup();
}

// 启动服务器
const server = app.listen(PORT, HOST, () => {
  logger.info(`服务器运行在 http://${publicUrl}:${PORT}`);
  logger.info(`服务器绑定到 ${HOST}:${PORT}`);

  // 输出配置信息
  logger.info('服务器配置:');
  logger.info(`- 数据目录: ${config.storage.dataDir}`);
  logger.info(`- CORS: ${config.cors.origin}`);
  logger.info(`- 身份验证: ${config.auth.enabled ? '启用' : '禁用'}`);
  logger.info(`- 日志级别: ${config.logging.level}`);

  if (config.logging.file) {
    logger.info(`- 日志文件: ${config.logging.filePath}`);
  }

  if (config.backup && config.backup.enabled) {
    logger.info(`- 自动备份: 启用 (每 ${config.backup.frequency / (60 * 60 * 1000)} 小时)`);
    logger.info(`- 备份目录: ${config.backup.backupDir}`);
    logger.info(`- 最大备份数: ${config.backup.maxBackups}`);
  } else {
    logger.info(`- 自动备份: 禁用`);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');

  // 清除备份定时器
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});
