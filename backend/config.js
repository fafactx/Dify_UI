// 配置文件
module.exports = {
  // 服务器配置
  server: {
    // 服务器监听端口，默认为3000
    port: process.env.PORT || 3000,

    // 服务器主机地址，默认为0.0.0.0（监听所有网络接口）
    host: process.env.HOST || '0.0.0.0',

    // 显示的服务器地址（用于日志和客户端配置）
    // 如果未设置，将使用本地IP地址
    publicUrl: process.env.PUBLIC_URL || '10.193.21.115'
  },

  // 身份验证配置（可选）
  auth: {
    // 是否启用身份验证
    enabled: process.env.AUTH_ENABLED === 'true' || false,

    // 身份验证用户名
    username: process.env.AUTH_USERNAME || 'admin',

    // 身份验证密码
    password: process.env.AUTH_PASSWORD || 'admin'
  },

  // 数据存储配置
  storage: {
    // 数据目录路径（相对于后端目录）
    dataDir: process.env.DATA_DIR || 'data',

    // 索引文件名
    indexFile: process.env.INDEX_FILE || 'index.json'
  },

  // 数据备份配置
  backup: {
    // 是否启用自动备份
    enabled: process.env.BACKUP_ENABLED === 'true' || false,

    // 备份目录路径（相对于后端目录）
    backupDir: process.env.BACKUP_DIR || 'backups',

    // 备份频率（毫秒）
    frequency: parseInt(process.env.BACKUP_FREQUENCY) || 24 * 60 * 60 * 1000, // 默认每天

    // 保留的最大备份数量
    maxBackups: parseInt(process.env.MAX_BACKUPS) || 7 // 默认保留7个备份
  },

  // CORS配置
  cors: {
    // 允许的来源，默认为所有
    origin: process.env.CORS_ORIGIN || '*',

    // 允许的HTTP方法
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE'
  },

  // 请求限流配置
  rateLimit: {
    // 是否启用请求限流
    enabled: process.env.RATE_LIMIT_ENABLED === 'true' || true,

    // 时间窗口（毫秒）
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 默认1分钟

    // 每个IP在时间窗口内允许的最大请求数
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // 默认每分钟100个请求
  },

  // 日志配置
  logging: {
    // 日志级别：'error', 'warn', 'info', 'debug'
    level: process.env.LOG_LEVEL || 'debug',  // 设置为debug以获取更多日志信息

    // 是否在控制台输出
    console: process.env.LOG_CONSOLE !== 'false',

    // 是否写入文件
    file: process.env.LOG_FILE === 'true' || false,

    // 日志文件路径（如果启用文件日志）
    filePath: process.env.LOG_FILE_PATH || 'logs/server.log'
  }
};
