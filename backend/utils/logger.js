/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */

const fs = require('fs');
const path = require('path');

/**
 * 日志级别枚举
 */
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  
  // 将字符串转换为日志级别
  fromString: (level) => {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }
};

/**
 * 日志记录器类
 */
class Logger {
  /**
   * 创建日志记录器
   * @param {Object} config - 日志配置
   */
  constructor(config) {
    this.config = config || {};
    this.level = LogLevel.fromString(this.config.level || 'info');
    this.console = this.config.console !== false;
    this.file = this.config.file === true;
    this.filePath = this.config.filePath || 'logs/server.log';
    
    // 确保日志目录存在
    if (this.file) {
      const logDir = path.dirname(this.filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }
  
  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @returns {string} 格式化后的日志消息
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }
  
  /**
   * 写入日志
   * @param {number} level - 日志级别
   * @param {string} levelName - 日志级别名称
   * @param {string} message - 日志消息
   */
  log(level, levelName, message) {
    if (level > this.level) return;
    
    const formattedMessage = this.formatMessage(levelName, message);
    
    // 控制台输出
    if (this.console) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    }
    
    // 文件输出
    if (this.file) {
      try {
        fs.appendFileSync(this.filePath, formattedMessage + '\n');
      } catch (error) {
        console.error(`写入日志文件失败: ${error.message}`);
      }
    }
  }
  
  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   */
  error(message) {
    this.log(LogLevel.ERROR, 'error', message);
  }
  
  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   */
  warn(message) {
    this.log(LogLevel.WARN, 'warn', message);
  }
  
  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   */
  info(message) {
    this.log(LogLevel.INFO, 'info', message);
  }
  
  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   */
  debug(message) {
    this.log(LogLevel.DEBUG, 'debug', message);
  }
}

module.exports = {
  Logger,
  LogLevel
};
