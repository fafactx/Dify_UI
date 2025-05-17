// db-logger.js - 数据库操作日志记录工具

const fs = require('fs');
const path = require('path');

class DbLogger {
  constructor(logDir) {
    this.logDir = logDir || path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
  }
  
  // 确保日志目录存在
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  // 记录数据库操作日志
  logOperation(operation, details) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      operation,
      details
    };
    
    // 创建日志文件名（按日期分割）
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `db-${today}.log`);
    
    // 写入日志
    fs.appendFileSync(
      logFile,
      JSON.stringify(logEntry) + '\n',
      { encoding: 'utf8' }
    );
    
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
    
    return this.logOperation('save_evaluation', {
      resultKey,
      data: simplifiedData
    });
  }
  
  // 记录查询操作
  logQuery(queryType, params) {
    return this.logOperation('query', {
      type: queryType,
      params
    });
  }
  
  // 记录错误
  logError(operation, error) {
    return this.logOperation('error', {
      operation,
      message: error.message,
      stack: error.stack
    });
  }
}

// 创建单例实例
let instance = null;

function getDbLogger(logDir) {
  if (!instance) {
    instance = new DbLogger(logDir);
  }
  return instance;
}

module.exports = {
  getDbLogger
};
