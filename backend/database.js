// database.js - 数据库初始化和连接模块

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 确保数据目录存在
function ensureDbDirectory(dbPath) {
  const dir = path.dirname(dbPath);
  // 只在调试模式下输出详细日志
  if (process.env.NODE_ENV === 'development') {
    console.log(`检查数据目录是否存在: ${dir}`);
  }

  if (!fs.existsSync(dir)) {
    console.log(`数据目录不存在，正在创建: ${dir}`);
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 }); // 设置权限为755
      console.log(`数据目录创建成功: ${dir}`);

      // 检查目录是否真的创建成功
      if (fs.existsSync(dir)) {
        console.log(`确认数据目录已存在: ${dir}`);

        // 在 Linux 环境中设置明确的权限
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(dir, 0o755);
            console.log(`设置数据目录权限为 755: ${dir}`);
          } catch (chmodError) {
            console.error(`设置目录权限失败: ${chmodError.message}`);
          }
        }
      } else {
        console.error(`错误: 数据目录创建失败: ${dir}`);
      }
    } catch (error) {
      console.error(`创建数据目录时出错: ${error.message}`);
      console.error(`错误堆栈: ${error.stack}`);
      throw new Error(`无法创建数据目录 ${dir}: ${error.message}`);
    }
  } else {
    console.log(`数据目录已存在: ${dir}`);

    // 检查目录权限
    try {
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
      console.log(`数据目录权限正常: ${dir}`);
    } catch (error) {
      console.error(`数据目录权限不足: ${dir}`);
      console.error(`错误: ${error.message}`);

      // 尝试修复权限（在 Linux 环境中）
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(dir, 0o755);
          console.log(`尝试修复数据目录权限: ${dir}`);

          // 再次检查权限
          try {
            fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
            console.log(`数据目录权限已修复: ${dir}`);
          } catch (accessError) {
            console.error(`修复权限后仍无法访问数据目录: ${accessError.message}`);
            throw new Error(`数据目录权限不足 ${dir}: ${accessError.message}`);
          }
        } catch (chmodError) {
          console.error(`修复目录权限失败: ${chmodError.message}`);
          throw new Error(`数据目录权限不足 ${dir}: ${error.message}`);
        }
      } else {
        throw new Error(`数据目录权限不足 ${dir}: ${error.message}`);
      }
    }
  }
}

// 初始化数据库
function initializeDatabase(dbPath) {
  try {
    console.log(`开始初始化数据库: ${dbPath}`);

    // 确保数据目录存在
    ensureDbDirectory(dbPath);

    // 检查数据库文件是否已存在
    const dbExists = fs.existsSync(dbPath);
    if (dbExists) {
      console.log(`数据库文件已存在: ${dbPath}`);
      console.log(`文件大小: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);
    } else {
      console.log(`数据库文件不存在，将创建新文件: ${dbPath}`);
    }

    // 连接数据库
    console.log(`正在连接数据库...`);
    const db = sqlite3(dbPath, {
      verbose: console.log,
      fileMustExist: false,
      timeout: 5000
    });

    // 测试数据库连接
    try {
      const testStmt = db.prepare('SELECT 1 as test');
      const testResult = testStmt.get();
      if (testResult && testResult.test === 1) {
        console.log(`数据库连接测试成功`);
      } else {
        throw new Error('数据库连接测试失败');
      }
    } catch (testError) {
      console.error(`数据库连接测试失败: ${testError.message}`);
      throw testError;
    }

    // 只在调试模式下输出详细日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`数据库连接成功`);
    }

    // 启用外键约束
    if (process.env.NODE_ENV === 'development') {
      console.log(`启用外键约束...`);
    }
    db.pragma('foreign_keys = ON');

    // 创建评估表
    if (process.env.NODE_ENV === 'development') {
      console.log(`创建评估表...`);
    }
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
    console.log(`创建索引...`);
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
    console.log(`创建产品表...`);
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
    console.log(`创建MAG表...`);
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
    console.log(`创建统计缓存表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS stats_cache (
        id TEXT PRIMARY KEY,
        data JSON NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);

    // 创建字段标签表 - 用于存储样本字段标签
    console.log(`创建字段标签表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS field_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_key TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        is_visible INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 999,
        last_updated INTEGER NOT NULL
      )
    `);

    // 验证数据库是否正常工作
    console.log(`验证数据库...`);
    const testStmt = db.prepare('SELECT 1 as test');
    const testResult = testStmt.get();
    if (testResult && testResult.test === 1) {
      console.log(`数据库验证成功`);
    } else {
      console.error(`数据库验证失败`);
    }

    console.log(`数据库初始化完成: ${dbPath}`);
    return db;
  } catch (error) {
    console.error(`数据库初始化失败: ${error.message}`);
    console.error(`错误堆栈: ${error.stack}`);

    // 尝试获取更多错误信息
    try {
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.error(`数据库文件信息: 大小=${stats.size}字节, 权限=${stats.mode.toString(8)}, 用户=${stats.uid}, 组=${stats.gid}`);
      }

      // 检查父目录权限
      const dir = path.dirname(dbPath);
      const dirStats = fs.statSync(dir);
      console.error(`数据目录信息: 大小=${dirStats.size}字节, 权限=${dirStats.mode.toString(8)}, 用户=${dirStats.uid}, 组=${dirStats.gid}`);
    } catch (statError) {
      console.error(`获取文件信息失败: ${statError.message}`);
    }

    throw error;
  }
}

// 导出数据库连接
let db = null;
let dbFilePath = null;

function getDatabase(dbPath) {
  try {
    // 只在调试模式下输出连接日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`请求获取数据库连接: ${dbPath}`);
    }

    // 如果数据库已初始化且路径相同，直接返回
    if (db && dbFilePath === dbPath) {
      // 只在调试模式下输出连接日志
      if (process.env.NODE_ENV === 'development') {
        console.log(`返回已存在的数据库连接: ${dbPath}`);
      }
      return db;
    }

    // 如果数据库已初始化但路径不同，关闭旧连接
    if (db && dbFilePath !== dbPath) {
      console.log(`数据库路径已更改，关闭旧连接: ${dbFilePath} -> ${dbPath}`);
      try {
        db.close();
      } catch (closeError) {
        console.error(`关闭旧数据库连接时出错: ${closeError.message}`);
      }
      db = null;
    }

    // 确保数据库目录存在
    ensureDbDirectory(dbPath);

    // 检查数据库文件是否存在
    if (!fs.existsSync(dbPath)) {
      console.log(`数据库文件不存在，将创建新文件: ${dbPath}`);

      // 在 Linux 环境中，尝试创建空文件并设置权限
      if (process.platform !== 'win32') {
        try {
          fs.writeFileSync(dbPath, '', { mode: 0o666 });
          console.log(`创建空数据库文件: ${dbPath}`);
        } catch (createError) {
          console.error(`创建空数据库文件失败: ${createError.message}`);
        }
      }
    } else {
      console.log(`数据库文件已存在: ${dbPath}`);
      console.log(`文件大小: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);

      // 检查文件权限
      try {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`数据库文件权限正常: ${dbPath}`);
      } catch (accessError) {
        console.error(`数据库文件权限不足: ${dbPath}`);

        // 尝试修复权限（在 Linux 环境中）
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(dbPath, 0o666);
            console.log(`已修复数据库文件权限: ${dbPath}`);
          } catch (chmodError) {
            console.error(`修复数据库文件权限失败: ${chmodError.message}`);
          }
        }
      }
    }

    // 初始化新数据库连接
    console.log(`初始化新数据库连接: ${dbPath}`);
    db = initializeDatabase(dbPath);
    dbFilePath = dbPath;

    return db;
  } catch (error) {
    console.error(`获取数据库连接失败: ${error.message}`);
    console.error(`错误堆栈: ${error.stack}`);

    // 获取更多错误信息
    try {
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.error(`数据库文件信息: 大小=${stats.size}字节, 权限=${stats.mode.toString(8)}`);

        // 在 Linux 环境中显示用户和组信息
        if (process.platform !== 'win32') {
          console.error(`用户=${stats.uid}, 组=${stats.gid}`);
        }
      } else {
        console.error(`数据库文件不存在: ${dbPath}`);
      }

      // 检查父目录权限
      const dir = path.dirname(dbPath);
      if (fs.existsSync(dir)) {
        const dirStats = fs.statSync(dir);
        console.error(`数据目录信息: 权限=${dirStats.mode.toString(8)}`);

        // 在 Linux 环境中显示用户和组信息
        if (process.platform !== 'win32') {
          console.error(`用户=${dirStats.uid}, 组=${dirStats.gid}`);
        }

        // 列出目录内容
        const dirContents = fs.readdirSync(dir);
        console.error(`目录内容: ${dirContents.join(', ')}`);
      } else {
        console.error(`数据目录不存在: ${dir}`);
      }
    } catch (statError) {
      console.error(`获取文件信息失败: ${statError.message}`);
    }

    // 不再使用内存数据库作为备用方案，而是抛出错误
    console.error('数据库连接失败，无法继续。请检查数据库文件和目录权限。');
    throw new Error(`无法连接到数据库: ${error.message}`);
  }
}

module.exports = {
  getDatabase
};
