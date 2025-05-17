// database.js - 数据库初始化和连接模块

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 确保数据目录存在
function ensureDbDirectory(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 初始化数据库
function initializeDatabase(dbPath) {
  ensureDbDirectory(dbPath);
  
  const db = sqlite3(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');
  
  // 创建评估表
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_key TEXT UNIQUE,  -- 存储 result0, result1 等键名
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      data JSON NOT NULL,
      
      -- 虚拟列，用于索引和查询
      cas_name TEXT GENERATED ALWAYS AS (json_extract(data, '$.CAS Name')) VIRTUAL,
      product_family TEXT GENERATED ALWAYS AS (json_extract(data, '$.Product Family')) VIRTUAL,
      mag TEXT GENERATED ALWAYS AS (json_extract(data, '$.MAG')) VIRTUAL,
      part_number TEXT GENERATED ALWAYS AS (json_extract(data, '$.Part Number')) VIRTUAL,
      question_scenario TEXT GENERATED ALWAYS AS (json_extract(data, '$.Question Scenario')) VIRTUAL,
      question_complexity TEXT GENERATED ALWAYS AS (json_extract(data, '$.Question Complexity')) VIRTUAL,
      question_frequency TEXT GENERATED ALWAYS AS (json_extract(data, '$.Question Frequency')) VIRTUAL,
      question_category TEXT GENERATED ALWAYS AS (json_extract(data, '$.Question Category')) VIRTUAL,
      source_category TEXT GENERATED ALWAYS AS (json_extract(data, '$.Source Category')) VIRTUAL,
      hallucination_control REAL GENERATED ALWAYS AS (json_extract(data, '$.hallucination_control')) VIRTUAL,
      quality REAL GENERATED ALWAYS AS (json_extract(data, '$.quality')) VIRTUAL,
      professionalism REAL GENERATED ALWAYS AS (json_extract(data, '$.professionalism')) VIRTUAL,
      usefulness REAL GENERATED ALWAYS AS (json_extract(data, '$.usefulness')) VIRTUAL,
      average_score REAL GENERATED ALWAYS AS (json_extract(data, '$.average_score')) VIRTUAL
    )
  `);
  
  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp ON evaluations(timestamp);
    CREATE INDEX IF NOT EXISTS idx_evaluations_product_family ON evaluations(product_family);
    CREATE INDEX IF NOT EXISTS idx_evaluations_mag ON evaluations(mag);
    CREATE INDEX IF NOT EXISTS idx_evaluations_part_number ON evaluations(part_number);
    CREATE INDEX IF NOT EXISTS idx_evaluations_question_category ON evaluations(question_category);
    CREATE INDEX IF NOT EXISTS idx_evaluations_question_complexity ON evaluations(question_complexity);
    CREATE INDEX IF NOT EXISTS idx_evaluations_average_score ON evaluations(average_score);
  `);
  
  // 创建产品表 - 用于缓存产品信息，提高查询效率
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT UNIQUE NOT NULL,
      product_family TEXT NOT NULL,
      last_updated INTEGER NOT NULL,
      evaluation_count INTEGER DEFAULT 0,
      avg_score REAL DEFAULT 0
    )
  `);
  
  // 创建MAG表 - 用于缓存MAG信息
  db.exec(`
    CREATE TABLE IF NOT EXISTS mags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mag_id TEXT UNIQUE NOT NULL,
      last_updated INTEGER NOT NULL,
      evaluation_count INTEGER DEFAULT 0,
      avg_score REAL DEFAULT 0
    )
  `);
  
  // 创建统计缓存表 - 用于存储预计算的统计数据
  db.exec(`
    CREATE TABLE IF NOT EXISTS stats_cache (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL,
      last_updated INTEGER NOT NULL
    )
  `);
  
  return db;
}

// 导出数据库连接
let db = null;

function getDatabase(dbPath) {
  if (!db) {
    db = initializeDatabase(dbPath);
  }
  return db;
}

module.exports = {
  getDatabase
};
