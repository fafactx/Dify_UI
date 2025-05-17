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

// 配置CORS
app.use(cors({
  origin: config.cors.origin,
  methods: config.cors.methods
}));

// 请求限流中间件
if (config.rateLimit && config.rateLimit.enabled) {
  logger.info(`启用请求限流: ${config.rateLimit.maxRequests}个请求/${config.rateLimit.windowMs/1000}秒`);
  app.use(createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests
  }));
}

// 其他中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 确保数据目录存在
const dataDir = path.join(__dirname, config.storage.dataDir);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// API 路由：保存评估数据
app.post('/api/save-evaluation', validateSaveEvaluation, async (req, res) => {
  try {
    const evaluationData = req.body;
    const timestamp = Date.now();
    const filename = `evaluation_${timestamp}.json`;
    const filePath = path.join(dataDir, filename);

    // 添加时间戳
    const dataToSave = {
      timestamp,
      date: new Date(timestamp).toISOString(),
      data: evaluationData
    };

    // 保存到文件
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    logger.info(`评估数据已保存到文件: ${filename}`);

    // 更新索引文件
    await updateIndex(filename, dataToSave);
    logger.info(`索引文件已更新，添加了文件: ${filename}`);

    res.json({ success: true, message: '评估数据已保存', filename });
  } catch (error) {
    logger.error(`保存评估数据出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API 路由：获取所有评估数据
app.get('/api/evaluations', async (req, res) => {
  try {
    const indexPath = path.join(dataDir, config.storage.indexFile);

    // 如果索引文件不存在，返回空数组
    if (!fs.existsSync(indexPath)) {
      logger.info('索引文件不存在，返回空评估数组');
      return res.json({ evaluations: [] });
    }

    logger.debug('读取索引文件');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const allEvaluations = [];

    // 读取每个文件中的评估数据
    for (const fileInfo of index.files) {
      const filePath = path.join(dataDir, fileInfo.filename);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 处理评估结果对象
        const evaluations = {};
        Object.keys(fileData.data || {}).forEach(key => {
          if (key.startsWith('result')) {
            evaluations[key] = fileData.data[key];
          }
        });

        // 将每个评估结果转换为数组项
        Object.entries(evaluations).forEach(([key, evaluation]) => {
          allEvaluations.push({
            id: key,
            timestamp: fileData.timestamp,
            date: fileData.date,
            ...evaluation
          });
        });
      }
    }

    logger.info(`返回 ${allEvaluations.length} 条评估数据`);
    res.json({ evaluations: allEvaluations });
  } catch (error) {
    logger.error(`获取评估数据出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API 路由：获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const indexPath = path.join(dataDir, config.storage.indexFile);

    // 如果索引文件不存在，返回空统计
    if (!fs.existsSync(indexPath)) {
      logger.info('索引文件不存在，返回空统计数据');
      return res.json({ stats: { count: 0 } });
    }

    logger.debug('读取索引文件以生成统计数据');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const allEvaluations = [];

    // 读取每个文件中的评估数据
    for (const fileInfo of index.files) {
      const filePath = path.join(dataDir, fileInfo.filename);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 处理评估结果对象
        const evaluations = {};
        Object.keys(fileData.data || {}).forEach(key => {
          if (key.startsWith('result')) {
            evaluations[key] = fileData.data[key];
          }
        });

        // 将每个评估结果添加到数组
        Object.values(evaluations).forEach(evaluation => {
          allEvaluations.push(evaluation);
        });
      }
    }

    // 计算各维度的平均分
    // 只使用实际存在的4个维度
    const dimensions = [
      'hallucination_control',
      'quality',
      'professionalism',
      'usefulness'
    ];

    logger.debug(`收集到 ${allEvaluations.length} 条评估数据`);
    logger.debug(`要计算的维度: ${dimensions.join(', ')}`);

    const averages = {};
    dimensions.forEach(dim => {
      const values = allEvaluations.map(e => e[dim]).filter(v => v !== undefined);
      logger.debug(`维度 ${dim} 的有效值数量: ${values.length}`);
      averages[dim] = values.length ?
        Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0;
      logger.debug(`维度 ${dim} 的平均分: ${averages[dim]}`);
    });

    // 计算总平均分
    const overallAverage = allEvaluations.length ?
      Math.round(
        allEvaluations.map(e => e.average_score).reduce((sum, val) => sum + val, 0) /
        allEvaluations.length
      ) : 0;

    // 返回统计数据
    const stats = {
      count: allEvaluations.length,
      overall_average: overallAverage,
      dimension_averages: {
        ...averages,
        average_score: overallAverage  // 添加 average_score 到 dimension_averages
      },
      last_updated: index.last_updated ? new Date(index.last_updated).toISOString() : null
    };

    logger.info(`返回统计数据: 评估总数=${stats.count}, 总平均分=${stats.overall_average}`);
    res.json({ stats });
  } catch (error) {
    logger.error(`获取统计数据出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
