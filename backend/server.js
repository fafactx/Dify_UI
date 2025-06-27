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

// 导入数据库管理器
const databaseManager = require('./database-manager');

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

// 静态文件服务 - 使用 frontend-html 目录
app.use(express.static(path.join(__dirname, '../frontend-html')));
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
logger.info('验证数据库连接和结构...');

// 异步初始化数据库
async function initializeDatabase() {
  try {
    // 使用数据库管理器初始化
    await databaseManager.initialize(dbPath);
    logger.info('数据库初始化成功');

    // 获取连接信息
    const connectionInfo = databaseManager.getConnectionInfo();
    logger.info('数据库连接信息:', connectionInfo);

    // 验证数据库表结构
    const db = databaseManager.getConnection();
    const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = tablesStmt.all().map(t => t.name);

    // 检查必要的表是否存在
    const requiredTables = ['evaluations', 'products', 'mags', 'stats_cache', 'field_labels'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));

    if (missingTables.length > 0) {
      logger.warn(`数据库缺少以下表: ${missingTables.join(', ')}`);
      logger.warn('数据库管理器应该已经创建了这些表，这可能表示初始化问题');
    } else {
      logger.info('数据库表结构验证成功，所有必要的表都存在');
    }

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

  // 检查是否有 JSON 文件
  const jsonFiles = fs.readdirSync(dbDir).filter(file =>
    file.endsWith('.json') && (file.startsWith('evaluation_') || file === 'index.json')
  );

  if (jsonFiles.length > 0) {
    logger.warn(`发现 ${jsonFiles.length} 个 JSON 文件，这些文件不应该存在:`);
    jsonFiles.forEach(file => {
      logger.warn(`- ${file}`);
    });

    logger.info('这些 JSON 文件可能会导致系统行为异常，建议删除它们');
    logger.info('您可以手动删除这些文件，或者在启动后使用 API 删除它们');
  } else {
    logger.info('未发现 JSON 文件，系统正确使用 SQLite 数据库');
  }

  // 验证数据库是否可写
  try {
    const testStmt = db.prepare('CREATE TABLE IF NOT EXISTS db_test (id INTEGER PRIMARY KEY, test TEXT)');
    testStmt.run();

    const insertStmt = db.prepare('INSERT INTO db_test (test) VALUES (?)');
    const result = insertStmt.run('test_' + Date.now());

    const deleteStmt = db.prepare('DELETE FROM db_test WHERE id = ?');
    deleteStmt.run(result.lastInsertRowid);

    logger.info('数据库写入测试成功，数据库可正常工作');
  } catch (writeError) {
    logger.error(`数据库写入测试失败: ${writeError.message}`);
    logger.error('数据库可能是只读的，请检查文件权限');
  }
  } catch (error) {
    logger.error(`数据库初始化失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
    logger.error('服务器将继续启动，但可能无法正常工作');
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

// 自动删除JSON文件的功能
function deleteJsonFiles() {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(dbDir)) {
      logger.warn(`数据目录不存在，无法删除JSON文件: ${dbDir}`);
      return;
    }

    // 列出目录内容
    const dirContents = fs.readdirSync(dbDir);
    logger.info(`数据目录内容: ${dirContents.join(', ') || '(空)'}`);

    // 过滤出JSON文件
    const jsonFiles = dirContents.filter(file =>
      file.endsWith('.json') && (file.startsWith('evaluation_') || file === 'index.json')
    );

    if (jsonFiles.length > 0) {
      logger.warn(`发现 ${jsonFiles.length} 个 JSON 文件，正在删除...`);
      jsonFiles.forEach(file => {
        try {
          const filePath = path.join(dbDir, file);
          // 检查文件大小
          const stats = fs.statSync(filePath);
          logger.info(`准备删除 JSON 文件: ${file}, 大小: ${stats.size} 字节`);

          // 删除文件
          fs.unlinkSync(filePath);
          logger.info(`已删除 JSON 文件: ${file}`);
        } catch (unlinkError) {
          logger.error(`删除 JSON 文件 ${file} 失败: ${unlinkError.message}`);
        }
      });
      logger.info('所有 JSON 文件已删除');
    } else {
      logger.info('未发现 JSON 文件');
    }

    // 再次检查目录内容，确认JSON文件已被删除
    const afterDirContents = fs.readdirSync(dbDir);
    const afterJsonFiles = afterDirContents.filter(file =>
      file.endsWith('.json') && (file.startsWith('evaluation_') || file === 'index.json')
    );

    if (afterJsonFiles.length > 0) {
      logger.warn(`删除后仍有 ${afterJsonFiles.length} 个 JSON 文件: ${afterJsonFiles.join(', ')}`);
    } else {
      logger.info('确认: 数据目录中没有JSON文件');
    }
  } catch (error) {
    logger.error(`删除 JSON 文件时出错: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
  }
}

// 在服务器启动时删除JSON文件
deleteJsonFiles();

// 添加定时任务，每小时检查并删除JSON文件
const jsonCleanupInterval = setInterval(deleteJsonFiles, 60 * 60 * 1000); // 每小时执行一次
logger.info('已启用自动删除JSON文件功能: 每小时检查一次');

// 启动服务器 - 异步初始化数据库后启动
async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();

    // 启动HTTP服务器
    const server = app.listen(PORT, HOST, () => {
      logger.info(`服务器运行在 http://${publicUrl}:${PORT}`);
      logger.info(`服务器绑定到 ${HOST}:${PORT}`);

  // 输出配置信息
  logger.info('服务器配置:');
  logger.info(`- 数据目录: ${config.storage.dataDir}`);
  logger.info(`- CORS: ${config.cors.origin}`);
  logger.info(`- 身份验证: ${config.auth.enabled ? '启用' : '禁用'}`);
  logger.info(`- 日志级别: ${config.logging.level}`);
  logger.info(`- 自动删除JSON文件: 启用 (每小时)`);

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

    return server;
    });
  } catch (error) {
    logger.error('服务器启动失败:', error.message);
    logger.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 启动服务器
startServer().then(server => {
  // 优雅关闭处理
  process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');

  // 清除备份定时器
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  // 清除JSON文件清理定时器
  if (jsonCleanupInterval) {
    clearInterval(jsonCleanupInterval);
  }

    server.close(() => {
      // 关闭数据库连接
      databaseManager.close();
      logger.info('服务器已关闭');
      process.exit(0);
    });
  });
}).catch(error => {
  logger.error('服务器启动失败:', error.message);
  process.exit(1);
});
