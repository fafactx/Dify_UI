// db-logger.js - 数据库操作日志记录工具

const fs = require('fs');
const path = require('path');

class DbLogger {
  constructor(config) {
    this.config = config || {};
    this.enabled = this.config.enabled !== false;
    this.logLevel = this.config.logLevel || 'info';
    this.logDir = this.config.logDir || path.join(__dirname, '..', 'logs');
    this.consoleOutput = this.config.consoleOutput !== false;
    this.fileOutput = this.config.fileOutput !== false;
    this.maxLogFiles = this.config.maxLogFiles || 30; // 默认保留30天的日志

    this.ensureLogDirectory();
    this.cleanupOldLogs();
  }

  // 确保日志目录存在
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true, mode: 0o755 });
        console.log(`创建日志目录: ${this.logDir}`);

        // 在 Linux 环境中设置明确的权限
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(this.logDir, 0o755);
            console.log(`设置日志目录权限为 755: ${this.logDir}`);
          } catch (chmodError) {
            console.error(`设置日志目录权限失败: ${chmodError.message}`);
          }
        }
      } catch (error) {
        console.error(`创建日志目录失败: ${error.message}`);
        console.error(`错误堆栈: ${error.stack}`);
      }
    }
  }

  // 清理旧日志文件
  cleanupOldLogs() {
    if (!this.fileOutput || !this.maxLogFiles) return;

    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('db-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          date: file.substring(3, 13), // 提取日期部分 (db-YYYY-MM-DD.log)
          time: fs.statSync(path.join(this.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // 按时间降序排序

      // 如果日志文件数量超过最大值，删除最旧的日志
      if (files.length > this.maxLogFiles) {
        const filesToDelete = files.slice(this.maxLogFiles);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log(`删除旧日志文件: ${file.name}`);
          } catch (unlinkError) {
            console.error(`删除旧日志文件失败: ${unlinkError.message}`);
          }
        });
      }
    } catch (error) {
      console.error(`清理旧日志文件失败: ${error.message}`);
    }
  }

  // 记录数据库操作日志
  logOperation(level, operation, details) {
    if (!this.enabled) return null;

    // 检查日志级别
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    if (levels[level] > levels[this.logLevel]) return null;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      operation,
      details
    };

    // 控制台输出
    if (this.consoleOutput) {
      console.log(`[DB] [${timestamp}] [${level.toUpperCase()}] ${operation}`);
      if (details) {
        if (typeof details === 'string') {
          console.log(details);
        } else {
          console.log(JSON.stringify(details, null, 2));
        }
      }
    }

    // 文件输出
    if (this.fileOutput) {
      try {
        // 创建日志文件名（按日期分割）
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `db-${today}.log`);

        // 写入日志
        fs.appendFileSync(
          logFile,
          JSON.stringify(logEntry) + '\n',
          { encoding: 'utf8' }
        );
      } catch (error) {
        console.error(`写入数据库日志失败: ${error.message}`);
      }
    }

    return logEntry;
  }

  // 记录评估数据保存
  logEvaluationSave(resultKey, data) {
    // 创建简化版数据（不包含大文本字段）
    const simplifiedData = {
      'CAS Name': data['CAS Name'],
      'Product Family': data['Product Family'],
      'MAG': data['MAG'],
      'Part Number': data['Part Number'],
      'Question Complexity': data['Question Complexity'],
      'Question Category': data['Question Category'],
      'hallucination_control': data['hallucination_control'],
      'quality': data['quality'],
      'professionalism': data['professionalism'],
      'usefulness': data['usefulness'],
      'average_score': data['average_score']
    };

    return this.logOperation('info', 'save_evaluation', {
      resultKey,
      data: simplifiedData
    });
  }

  // 记录查询操作
  logQuery(queryType, params) {
    return this.logOperation('info', 'query', {
      type: queryType,
      params
    });
  }

  // 记录错误
  logError(operation, error) {
    return this.logOperation('error', 'error', {
      operation,
      message: error.message,
      stack: error.stack
    });
  }

  // 记录警告
  logWarning(operation, message, details) {
    return this.logOperation('warn', operation, {
      message,
      details
    });
  }

  // 记录信息
  logInfo(operation, message, details) {
    return this.logOperation('info', operation, {
      message,
      details
    });
  }

  // 记录调试信息
  logDebug(operation, message, details) {
    return this.logOperation('debug', operation, {
      message,
      details
    });
  }

  // 记录数据库操作
  logDbOperation(operation, sql, params, result) {
    return this.logOperation('debug', 'db_operation', {
      operation,
      sql,
      params,
      result: result ? (typeof result === 'object' ? JSON.stringify(result) : result) : null
    });
  }

  // 记录 JSON 文件检测
  logJsonFileDetection(files) {
    if (!files || files.length === 0) {
      return this.logOperation('info', 'json_files', '未发现 JSON 文件，系统正确使用 SQLite 数据库');
    }

    return this.logOperation('warn', 'json_files', {
      message: `发现 ${files.length} 个 JSON 文件，这些文件不应该存在`,
      files
    });
  }
}

// 创建单例实例
let instance = null;

function getDbLogger(config) {
  if (!instance) {
    instance = new DbLogger(config);
  }
  return instance;
}

module.exports = {
  getDbLogger,
  DbLogger
};
