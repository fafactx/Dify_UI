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

// 辅助函数：更新索引文件
async function updateIndex(filename, fileData) {
  const indexPath = path.join(dataDir, config.storage.indexFile);
  let index = { files: [], total_evaluations: 0, last_updated: Date.now() };

  // 如果索引文件存在，读取它
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }

  // 计算评估结果数量
  const evaluationCount = Object.keys(fileData.data || {}).filter(key => key.startsWith('result')).length;

  // 添加新文件信息
  index.files.push({
    filename,
    timestamp: fileData.timestamp,
    date: fileData.date,
    count: evaluationCount
  });

  // 更新总数和最后更新时间
  index.total_evaluations += evaluationCount;
  index.last_updated = Date.now();

  // 保存更新后的索引
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

// 初始化数据库
const dbPath = path.join(__dirname, 'data', 'evaluations.db');
logger.info(`初始化数据库: ${dbPath}`);
try {
  const db = getDatabase(dbPath);
  logger.info('数据库初始化成功');

  // 检查数据库是否为空，如果为空则插入测试数据
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM evaluations');
  const { count } = countStmt.get();

  if (count === 0) {
    logger.info('数据库为空，插入测试数据');

    // 创建测试数据
    const testData = [
      {
        "CAS Name": "test.user1@example.com",
        "Product Family": "IVN",
        "MAG": "R16",
        "Part Number": "TJA1145A",
        "Question": "Why can't TJA1145 enter sleep mode？",
        "Answer": "It is recommended to check whether there is a pending wake-up event at this time or whether any wake-up source is enabled",
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
        "average_score": 82.5,
        "summary": "The LLM answer provides a detailed explanation of the TJA1145's operating mode and system constraints."
      },
      {
        "CAS Name": "test.user2@example.com",
        "Product Family": "MCU",
        "MAG": "R17",
        "Part Number": "S32K144",
        "Question": "How to configure the S32K144 clock?",
        "Answer": "To configure the S32K144 clock, you need to set up the System Clock Generator (SCG) module.",
        "Question Scenario": "Hardware Configuration",
        "Answer Source": "S32K144 Reference Manual",
        "Question Complexity": "Medium",
        "Question Frequency": "High",
        "Question Category": "Configuration Question",
        "Source Category": "Public",
        "hallucination_control": 95,
        "quality": 90,
        "professionalism": 85,
        "usefulness": 80,
        "average_score": 87.5,
        "summary": "The answer correctly explains the clock configuration process for the S32K144 microcontroller."
      },
      {
        "CAS Name": "test.user3@example.com",
        "Product Family": "IVN",
        "MAG": "R18",
        "Part Number": "TJA1102",
        "Question": "What is the difference between TJA1102 and TJA1100?",
        "Answer": "The TJA1102 is a dual-port PHY while TJA1100 is a single-port PHY. TJA1102 supports two 100BASE-T1 interfaces.",
        "Question Scenario": "Product Comparison",
        "Answer Source": "Product Datasheet",
        "Question Complexity": "Medium",
        "Question Frequency": "Medium",
        "Question Category": "Comparison Question",
        "Source Category": "Public",
        "hallucination_control": 85,
        "quality": 80,
        "professionalism": 90,
        "usefulness": 85,
        "average_score": 85,
        "summary": "The answer correctly identifies the key difference between the two products."
      },
      {
        "CAS Name": "test.user4@example.com",
        "Product Family": "MCU",
        "MAG": "R19",
        "Part Number": "S32G274A",
        "Question": "How to enable the Ethernet interface on S32G274A?",
        "Answer": "To enable the Ethernet interface on S32G274A, you need to configure the NETC module and set up the proper pin muxing.",
        "Question Scenario": "Network Configuration",
        "Answer Source": "S32G274A Reference Manual",
        "Question Complexity": "High",
        "Question Frequency": "Medium",
        "Question Category": "Configuration Question",
        "Source Category": "Public",
        "hallucination_control": 80,
        "quality": 75,
        "professionalism": 85,
        "usefulness": 90,
        "average_score": 82.5,
        "summary": "The answer provides a high-level overview of enabling Ethernet on the S32G274A."
      }
    ];

    // 插入测试数据
    const EvaluationsDAL = require('./evaluations-dal');
    const evaluationsDAL = new EvaluationsDAL(dbPath);

    testData.forEach((data, index) => {
      const resultKey = `result${index}`;
      evaluationsDAL.saveEvaluation(resultKey, data);
    });

    logger.info(`成功插入 ${testData.length} 条测试数据`);
  } else {
    logger.info(`数据库中已有 ${count} 条评估数据`);
  }
} catch (error) {
  logger.error(`数据库初始化失败: ${error.message}`);
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
