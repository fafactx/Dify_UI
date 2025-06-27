// database-manager.js - 统一数据库连接管理器
const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1秒
  }

  // 单例模式
  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // 初始化数据库连接
  async initialize(dbPath) {
    if (this.isConnected && this.dbPath === dbPath) {
      console.log(`数据库已连接: ${dbPath}`);
      return this.db;
    }

    this.dbPath = dbPath;
    return this._connectWithRetry();
  }

  // 带重试的连接方法
  async _connectWithRetry() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`数据库连接尝试 ${attempt}/${this.maxRetries}: ${this.dbPath}`);
        
        // 确保数据目录存在
        this._ensureDbDirectory();
        
        // 连接数据库
        this.db = this._createConnection();
        
        // 测试连接
        await this._testConnection();
        
        // 初始化数据库结构
        this._initializeSchema();
        
        this.isConnected = true;
        this.connectionAttempts = attempt;
        
        console.log(`数据库连接成功 (尝试 ${attempt}/${this.maxRetries}): ${this.dbPath}`);
        return this.db;
        
      } catch (error) {
        console.error(`数据库连接失败 (尝试 ${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (this.db) {
          try {
            this.db.close();
          } catch (closeError) {
            console.error(`关闭失败的数据库连接时出错: ${closeError.message}`);
          }
          this.db = null;
        }
        
        if (attempt === this.maxRetries) {
          throw new Error(`数据库连接失败，已尝试 ${this.maxRetries} 次: ${error.message}`);
        }
        
        // 等待后重试
        await this._sleep(this.retryDelay * attempt);
      }
    }
  }

  // 创建数据库连接
  _createConnection() {
    const options = {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
      fileMustExist: false,
      timeout: 5000
    };

    return sqlite3(this.dbPath, options);
  }

  // 测试数据库连接
  async _testConnection() {
    if (!this.db) {
      throw new Error('数据库连接未建立');
    }

    try {
      const testStmt = this.db.prepare('SELECT 1 as test');
      const result = testStmt.get();
      
      if (!result || result.test !== 1) {
        throw new Error('数据库连接测试失败');
      }
      
      console.log('数据库连接测试成功');
    } catch (error) {
      throw new Error(`数据库连接测试失败: ${error.message}`);
    }
  }

  // 确保数据目录存在
  _ensureDbDirectory() {
    const dir = path.dirname(this.dbPath);
    
    if (!fs.existsSync(dir)) {
      console.log(`创建数据目录: ${dir}`);
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      
      // 设置权限 (非Windows系统)
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(dir, 0o755);
          console.log(`设置数据目录权限: ${dir}`);
        } catch (chmodError) {
          console.warn(`设置目录权限失败: ${chmodError.message}`);
        }
      }
    }

    // 检查目录权限
    try {
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
      console.log(`数据目录权限正常: ${dir}`);
    } catch (accessError) {
      throw new Error(`数据目录权限不足: ${dir} - ${accessError.message}`);
    }
  }

  // 初始化数据库结构
  _initializeSchema() {
    console.log('初始化数据库结构...');
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON');
    
    // 创建评估表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        result_key TEXT UNIQUE,
        timestamp INTEGER NOT NULL,
        date TEXT NOT NULL,
        data JSON NOT NULL,
        
        -- 虚拟列，用于索引和查询
        cas_name TEXT GENERATED ALWAYS AS (json_extract(data, '$."CAS Name"')) VIRTUAL,
        product_family TEXT GENERATED ALWAYS AS (json_extract(data, '$."Product Family"')) VIRTUAL,
        mag TEXT GENERATED ALWAYS AS (json_extract(data, '$."MAG"')) VIRTUAL,
        part_number TEXT GENERATED ALWAYS AS (json_extract(data, '$."Part Number"')) VIRTUAL,
        question_scenario TEXT GENERATED ALWAYS AS (json_extract(data, '$."Question Scenario"')) VIRTUAL,
        question_complexity TEXT GENERATED ALWAYS AS (json_extract(data, '$."Question Complexity"')) VIRTUAL,
        question_frequency TEXT GENERATED ALWAYS AS (json_extract(data, '$."Question Frequency"')) VIRTUAL,
        question_category TEXT GENERATED ALWAYS AS (json_extract(data, '$."Question Category"')) VIRTUAL,
        source_category TEXT GENERATED ALWAYS AS (json_extract(data, '$."Source Category"')) VIRTUAL,
        
        -- 评估维度虚拟列
        average_score REAL GENERATED ALWAYS AS (json_extract(data, '$.average_score')) VIRTUAL,
        hallucination_control REAL GENERATED ALWAYS AS (json_extract(data, '$.hallucination_control')) VIRTUAL,
        quality REAL GENERATED ALWAYS AS (json_extract(data, '$.quality')) VIRTUAL,
        professionalism REAL GENERATED ALWAYS AS (json_extract(data, '$.professionalism')) VIRTUAL,
        usefulness REAL GENERATED ALWAYS AS (json_extract(data, '$.usefulness')) VIRTUAL
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp ON evaluations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_evaluations_product_family ON evaluations(product_family);
      CREATE INDEX IF NOT EXISTS idx_evaluations_part_number ON evaluations(part_number);
      CREATE INDEX IF NOT EXISTS idx_evaluations_mag ON evaluations(mag);
      CREATE INDEX IF NOT EXISTS idx_evaluations_average_score ON evaluations(average_score);
    `);

    // 创建产品表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_number TEXT UNIQUE NOT NULL,
        product_family TEXT NOT NULL,
        last_updated INTEGER NOT NULL,
        evaluation_count INTEGER DEFAULT 0,
        avg_score REAL DEFAULT 0
      )
    `);

    // 创建MAG表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mag_id TEXT UNIQUE NOT NULL,
        last_updated INTEGER NOT NULL,
        evaluation_count INTEGER DEFAULT 0,
        avg_score REAL DEFAULT 0
      )
    `);

    // 创建统计缓存表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stats_cache (
        id TEXT PRIMARY KEY,
        data JSON NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);

    // 创建字段标签表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS field_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_key TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        is_visible INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 999,
        last_updated INTEGER NOT NULL
      )
    `);

    console.log('数据库结构初始化完成');
  }

  // 获取数据库连接
  getConnection() {
    if (!this.isConnected || !this.db) {
      throw new Error('数据库未连接，请先调用 initialize() 方法');
    }
    return this.db;
  }

  // 检查连接状态
  isConnectionHealthy() {
    if (!this.isConnected || !this.db) {
      return false;
    }

    try {
      const testStmt = this.db.prepare('SELECT 1 as test');
      const result = testStmt.get();
      return result && result.test === 1;
    } catch (error) {
      console.error('数据库健康检查失败:', error.message);
      return false;
    }
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      try {
        this.db.close();
        console.log('数据库连接已关闭');
      } catch (error) {
        console.error('关闭数据库连接时出错:', error.message);
      }
      this.db = null;
      this.isConnected = false;
    }
  }

  // 获取连接信息
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      dbPath: this.dbPath,
      connectionAttempts: this.connectionAttempts,
      isHealthy: this.isConnectionHealthy()
    };
  }

  // 辅助方法：睡眠
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例实例
module.exports = DatabaseManager.getInstance();
