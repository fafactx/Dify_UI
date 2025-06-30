// evaluations-dal.js - 评估数据访问层

const databaseManager = require('./database-manager');
const { getDbLogger } = require('./utils/db-logger');
const fieldLabelsDAL = require('./field-labels-dal');
const fs = require('fs');
const path = require('path');

class EvaluationsDAL {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.logger = this._initializeLogger();
    this.db = null;
    this.isInitialized = false;
  }

  // 安全初始化日志系统
  _initializeLogger() {
    try {
      return getDbLogger();
    } catch (error) {
      console.warn('日志系统初始化失败，使用控制台日志:', error.message);
      return {
        logEvaluationSave: (key, data) => console.log(`[LOG] 保存评估: ${key}`),
        logError: (type, error) => console.error(`[LOG] 错误 ${type}:`, error.message)
      };
    }
  }

  // 异步初始化数据库连接
  async initialize() {
    if (this.isInitialized) {
      return this.db;
    }

    try {
      console.log(`EvaluationsDAL 初始化数据库连接: ${this.dbPath}`);
      await databaseManager.initialize(this.dbPath);
      this.db = databaseManager.getConnection();
      this.isInitialized = true;
      console.log(`EvaluationsDAL 初始化成功`);
      return this.db;
    } catch (error) {
      console.error(`EvaluationsDAL 初始化失败: ${error.message}`);
      throw error;
    }
  }

  // 确保数据库已初始化
  _ensureInitialized() {
    if (!this.isInitialized || !this.db) {
      throw new Error('EvaluationsDAL 未初始化，请先调用 initialize() 方法');
    }

    // 检查连接健康状态
    if (!databaseManager.isConnectionHealthy()) {
      throw new Error('数据库连接不健康，请检查数据库状态');
    }
  }

  // 私有方法：检查数据库文件
  _checkDatabaseFile() {
    try {
      const dbDir = path.dirname(this.dbPath);

      // 确保数据目录存在
      if (!fs.existsSync(dbDir)) {
        console.log(`数据目录不存在，正在创建: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
      }

      // 检查数据库文件是否存在
      if (!fs.existsSync(this.dbPath)) {
        console.log(`数据库文件不存在: ${this.dbPath}`);

        // 创建空数据库文件
        fs.writeFileSync(this.dbPath, '', { mode: 0o666 });
        console.log(`已创建空数据库文件: ${this.dbPath}`);
      } else {
        console.log(`数据库文件已存在: ${this.dbPath}, 大小: ${fs.statSync(this.dbPath).size} 字节`);
      }

      // 检查数据库文件权限
      try {
        fs.accessSync(this.dbPath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`数据库文件权限正常: ${this.dbPath}`);
      } catch (accessError) {
        console.error(`数据库文件权限不足: ${this.dbPath}`);

        // 尝试修复权限
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(this.dbPath, 0o666);
            console.log(`已修复数据库文件权限: ${this.dbPath}`);
          } catch (chmodError) {
            console.error(`修复数据库文件权限失败: ${chmodError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`检查数据库文件时出错: ${error.message}`);
      throw error;
    }
  }

  // 保存新的评估数据
  saveEvaluation(resultKey, evaluationData) {
    // 确保数据库已初始化
    this._ensureInitialized();

    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString();

    try {
      // 验证和预处理评估数据
      const processedData = this._preprocessEvaluationData(evaluationData, resultKey);

      // 只在调试模式下记录详细日志
      if (process.env.NODE_ENV === 'development' && this.logger) {
        this.logger.logEvaluationSave(resultKey, processedData);
      }

      // 开始事务
      const transaction = this.db.transaction(() => {
        // 插入评估数据
        const insertStmt = this.db.prepare(`
          INSERT INTO evaluations (result_key, timestamp, date, data)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(result_key) DO UPDATE SET
          timestamp = excluded.timestamp,
          date = excluded.date,
          data = excluded.data
        `);

        const result = insertStmt.run(resultKey, timestamp, date, JSON.stringify(processedData));

        // 只在调试模式下输出详细日志
        if (process.env.NODE_ENV === 'development') {
          console.log(`评估数据 [${resultKey}] 已保存到数据库，ID: ${result.lastInsertRowid}`);
        }

        // 更新产品信息
        this._updateProductInfo(processedData['Part Number'], processedData['Product Family']);

        // 更新MAG信息
        if (processedData['MAG']) {
          this._updateMagInfo(processedData['MAG']);
        }

        // 初始化字段标签（如果尚未初始化）
        this._initializeFieldLabels(processedData);

        // 清除统计缓存，强制下次请求重新计算
        this._clearStatsCache();

        return result;
      });

      return transaction();
    } catch (error) {
      // 检查是否是维度验证错误
      if (error.message && error.message.includes('评估数据只能包含4个指定维度')) {
        console.error(`维度验证错误 [${resultKey}]:`, error.message);
        if (this.logger) {
          this.logger.logError('dimension_validation', error);
        }
        // 重新抛出错误，但保留原始消息以便API可以返回给客户端
        throw new Error(`维度验证失败: ${error.message}`);
      } else {
        console.error(`保存评估数据 [${resultKey}] 时出错:`, error);
        if (this.logger) {
          this.logger.logError('save_evaluation', error);
        }
        throw error;
      }
    }
  }

  // 预处理评估数据
  _preprocessEvaluationData(data, resultKey) {
    // 只在调试模式下输出预处理日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`预处理评估数据 [${resultKey}]`);
    }

    // 创建数据副本，避免修改原始数据
    const processedData = { ...data };

    // 确保必要字段存在
    if (!processedData['CAS Name']) {
      processedData['CAS Name'] = 'unknown';
      // 只在调试模式下输出警告日志
      if (process.env.NODE_ENV === 'development') {
        console.log(`警告: 评估数据 [${resultKey}] 缺少 CAS Name 字段`);
      }
    }

    if (!processedData['Product Family']) {
      // 尝试从Part Number推断Product Family
      if (processedData['Part Number']) {
        const partNumber = processedData['Part Number'];
        if (partNumber.startsWith('TJA')) {
          processedData['Product Family'] = 'IVN';
        } else if (partNumber.startsWith('S32')) {
          processedData['Product Family'] = 'MCU';
        } else {
          processedData['Product Family'] = 'Unknown';
        }
        // 只在调试模式下输出推断日志
        if (process.env.NODE_ENV === 'development') {
          console.log(`从Part Number [${partNumber}] 推断Product Family: ${processedData['Product Family']}`);
        }
      } else {
        processedData['Product Family'] = 'Unknown';
        // 只在调试模式下输出警告日志
        if (process.env.NODE_ENV === 'development') {
          console.log(`警告: 评估数据 [${resultKey}] 缺少 Product Family 字段`);
        }
      }
    }

    // 定义必需的维度字段
    const requiredDimensions = ['hallucination_control', 'quality', 'professionalism', 'usefulness'];

    // 定义已知的非维度字段（这些字段不会被视为额外维度）
    const knownNonDimensionFields = [
      'CAS Name', 'Product Family', 'MAG', 'Part Number', 'Question', 'Answer',
      'Question Scenario', 'Answer Source', 'Question Complexity', 'Question Frequency',
      'Question Category', 'Source Category', 'average_score', 'summary', 'timestamp',
      'date', 'id', 'result_key'
    ];

    // 检查是否有额外的维度字段
    const extraDimensions = Object.keys(processedData).filter(key => {
      // 如果是必需的维度字段或已知的非维度字段，则不是额外维度
      if (requiredDimensions.includes(key) || knownNonDimensionFields.includes(key)) {
        return false;
      }

      // 检查是否是以dimension_开头的字段
      if (key.startsWith('dimension_')) {
        return true;
      }

      // 检查是否是以score_开头的字段
      if (key.startsWith('score_')) {
        return true;
      }

      // 其他字段不视为维度字段
      return false;
    });

    if (extraDimensions.length > 0) {
      console.error(`错误: 评估数据 [${resultKey}] 包含额外的维度字段: ${extraDimensions.join(', ')}`);
      throw new Error(`评估数据只能包含4个指定维度: hallucination_control, quality, professionalism, usefulness。发现额外维度: ${extraDimensions.join(', ')}`);
    }

    // 确保所有必需的维度字段都存在
    let missingDimensions = [];
    requiredDimensions.forEach(dim => {
      if (processedData[dim] === undefined) {
        missingDimensions.push(dim);
        // 为缺失的维度设置默认值
        processedData[dim] = 0;
      }
    });

    if (missingDimensions.length > 0) {
      console.warn(`警告: 评估数据 [${resultKey}] 缺少维度字段: ${missingDimensions.join(', ')}，已设置为默认值0`);
    }

    // 确保评分字段是数字类型
    const scoreFields = [...requiredDimensions, 'average_score'];
    scoreFields.forEach(field => {
      if (processedData[field] !== undefined) {
        // 转换为数字
        const score = parseFloat(processedData[field]);
        if (isNaN(score)) {
          console.log(`警告: 评估数据 [${resultKey}] 的 ${field} 字段不是有效数字: ${processedData[field]}`);
          processedData[field] = 0;
        } else {
          processedData[field] = score;
        }
      }
    });

    // 如果没有平均分，计算平均分
    if (processedData['average_score'] === undefined) {
      let totalScore = 0;
      let scoreCount = 0;

      requiredDimensions.forEach(field => {
        if (processedData[field] !== undefined) {
          totalScore += processedData[field];
          scoreCount++;
        }
      });

      if (scoreCount > 0) {
        processedData['average_score'] = Math.round(totalScore / scoreCount * 10) / 10;
        console.log(`为评估数据 [${resultKey}] 计算平均分: ${processedData['average_score']}`);
      } else {
        processedData['average_score'] = 0;
        console.log(`警告: 评估数据 [${resultKey}] 没有评分字段，无法计算平均分`);
      }
    }

    // 添加时间戳（如果不存在）
    if (!processedData['timestamp']) {
      processedData['timestamp'] = Date.now();
    }

    return processedData;
  }

  // 获取所有评估数据（支持分页和过滤）
  getEvaluations(options = {}) {
    // 确保数据库已初始化
    this._ensureInitialized();

    const {
      page = 1,
      limit = 20,
      productFamily,
      partNumber,
      mag,
      questionCategory,
      complexity,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = '1=1';
    const params = [];

    if (productFamily) {
      whereClause += ' AND product_family = ?';
      params.push(productFamily);
    }

    if (partNumber) {
      whereClause += ' AND part_number = ?';
      params.push(partNumber);
    }

    if (mag) {
      whereClause += ' AND mag = ?';
      params.push(mag);
    }

    if (questionCategory) {
      whereClause += ' AND question_category = ?';
      params.push(questionCategory);
    }

    if (complexity) {
      whereClause += ' AND question_complexity = ?';
      params.push(complexity);
    }

    // 验证排序字段
    const validSortFields = ['timestamp', 'average_score', 'hallucination_control', 'quality', 'professionalism', 'usefulness'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';

    // 验证排序顺序
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // 查询总记录数
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM evaluations
      WHERE ${whereClause}
    `);

    const { total } = countStmt.get(...params);

    // 查询评估数据
    const query = `
      SELECT id, result_key, timestamp, date, data
      FROM evaluations
      WHERE ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(query);
    const evaluations = stmt.all(...params, limit, offset);

    // 处理结果
    const results = evaluations.map(row => {
      const data = JSON.parse(row.data);
      return {
        id: row.id,
        result_key: row.result_key,
        timestamp: row.timestamp,
        date: row.date,
        ...data
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: results
    };
  }

  // 获取单个评估详情
  getEvaluationById(id) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, result_key, timestamp, date, data
        FROM evaluations
        WHERE id = ?
      `);

      const evaluation = stmt.get(id);

      if (!evaluation) {
        return null;
      }

      return {
        id: evaluation.id,
        result_key: evaluation.result_key,
        timestamp: evaluation.timestamp,
        date: evaluation.date,
        ...JSON.parse(evaluation.data)
      };
    } catch (error) {
      console.error(`Error getting evaluation by ID ${id}:`, error);
      throw error;
    }
  }

  // 删除单个评估数据
  deleteEvaluation(id) {
    try {
      // 开始事务
      const transaction = this.db.transaction(() => {
        // 删除评估数据
        const stmt = this.db.prepare(`
          DELETE FROM evaluations
          WHERE id = ?
        `);

        const result = stmt.run(id);

        // 清除统计缓存
        this._clearStatsCache();

        return {
          success: result.changes > 0,
          deletedCount: result.changes
        };
      });

      return transaction();
    } catch (error) {
      console.error(`Error deleting evaluation ${id}:`, error);
      throw error;
    }
  }

  // 批量删除评估数据
  deleteEvaluations(ids) {
    try {
      // 开始事务
      const transaction = this.db.transaction(() => {
        // 准备删除语句
        const stmt = this.db.prepare(`
          DELETE FROM evaluations
          WHERE id = ?
        `);

        // 执行批量删除
        let deletedCount = 0;
        for (const id of ids) {
          const result = stmt.run(id);
          deletedCount += result.changes;
        }

        // 清除统计缓存
        this._clearStatsCache();

        return {
          success: true,
          deletedCount
        };
      });

      return transaction();
    } catch (error) {
      console.error(`Error deleting evaluations:`, error);
      throw error;
    }
  }

  // 删除ID范围内的评估数据
  deleteEvaluationRange(fromId, toId) {
    try {
      // 开始事务
      const transaction = this.db.transaction(() => {
        // 删除ID范围内的评估数据
        const stmt = this.db.prepare(`
          DELETE FROM evaluations
          WHERE id >= ? AND id <= ?
        `);

        const result = stmt.run(fromId, toId);

        // 清除统计缓存
        this._clearStatsCache();

        return {
          success: true,
          deletedCount: result.changes
        };
      });

      return transaction();
    } catch (error) {
      console.error(`Error deleting evaluation range from ${fromId} to ${toId}:`, error);
      throw error;
    }
  }

  // 获取总体统计概览
  getStatsOverview() {
    try {
      // 尝试从缓存获取
      const cachedStats = this._getStatsFromCache('overview');
      if (cachedStats) {
        return cachedStats;
      }

      // 计算统计数据
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM evaluations');
      const { count } = totalStmt.get();

      // 如果数据库为空，返回特殊值 -1
      if (count === 0) {
        console.log('数据库为空，返回特殊值 -1');
        const emptyStats = {
          count: 0,
          overall_average: -1,
          dimension_averages: {
            hallucination_control: -1,
            quality: -1,
            professionalism: -1,
            usefulness: -1
          },
          product_family_count: 0,
          part_number_count: 0,
          mag_count: 0,
          last_updated: Date.now(),
          is_empty: true
        };

        // 缓存空数据结果
        this._saveStatsToCache('overview', emptyStats);

        return emptyStats;
      }

      // 使用JSON1扩展从JSON数据中提取评分
      const avgStmt = this.db.prepare(`
        SELECT
          AVG(json_extract(data, '$.average_score')) as overall_average,
          AVG(json_extract(data, '$.hallucination_control')) as hallucination_control,
          AVG(json_extract(data, '$.quality')) as quality,
          AVG(json_extract(data, '$.professionalism')) as professionalism,
          AVG(json_extract(data, '$.usefulness')) as usefulness
        FROM evaluations
      `);

      const averages = avgStmt.get();

      // 使用JSON1扩展从JSON数据中提取产品系列
      const productFamilyStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT json_extract(data, '$."Product Family"')) as count
        FROM evaluations
      `);

      const { count: productFamilyCount } = productFamilyStmt.get();

      // 使用JSON1扩展从JSON数据中提取零件编号
      const partNumberStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT json_extract(data, '$."Part Number"')) as count
        FROM evaluations
      `);

      const { count: partNumberCount } = partNumberStmt.get();

      // 使用JSON1扩展从JSON数据中提取MAG
      const magStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT json_extract(data, '$.MAG')) as count
        FROM evaluations
      `);

      const { count: magCount } = magStmt.get();

      const lastUpdatedStmt = this.db.prepare(`
        SELECT MAX(timestamp) as last_updated
        FROM evaluations
      `);

      const { last_updated } = lastUpdatedStmt.get();

      // 构建结果
      const stats = {
        count,
        overall_average: averages.overall_average || 0,
        dimension_averages: {
          hallucination_control: averages.hallucination_control || 0,
          quality: averages.quality || 0,
          professionalism: averages.professionalism || 0,
          usefulness: averages.usefulness || 0
        },
        product_family_count: productFamilyCount,
        part_number_count: partNumberCount,
        mag_count: magCount,
        last_updated,
        is_empty: false
      };

      // 打印调试信息
      console.log('数据库统计结果:', JSON.stringify(stats, null, 2));

      // 缓存结果
      this._saveStatsToCache('overview', stats);

      return stats;
    } catch (error) {
      console.error('获取统计概览出错:', error);
      // 返回错误状态
      return {
        count: 0,
        overall_average: -1,
        dimension_averages: {
          hallucination_control: -1,
          quality: -1,
          professionalism: -1,
          usefulness: -1
        },
        product_family_count: 0,
        part_number_count: 0,
        mag_count: 0,
        last_updated: Date.now(),
        is_empty: true,
        error: error.message
      };
    }
  }

  // 私有方法：更新产品信息
  _updateProductInfo(partNumber, productFamily) {
    if (!partNumber) return;

    const timestamp = Date.now();

    // 计算产品的评估数量和平均分
    const statsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as count,
        AVG(json_extract(data, '$.average_score')) as avg_score
      FROM evaluations
      WHERE json_extract(data, '$."Part Number"') = ?
    `);

    const { count, avg_score } = statsStmt.get(partNumber);

    // 更新或插入产品信息
    const upsertStmt = this.db.prepare(`
      INSERT INTO products (part_number, product_family, last_updated, evaluation_count, avg_score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(part_number) DO UPDATE SET
        product_family = excluded.product_family,
        last_updated = excluded.last_updated,
        evaluation_count = excluded.evaluation_count,
        avg_score = excluded.avg_score
    `);

    upsertStmt.run(partNumber, productFamily, timestamp, count, avg_score || 0);
  }

  // 私有方法：更新MAG信息
  _updateMagInfo(mag) {
    if (!mag) return;

    const timestamp = Date.now();

    // 计算MAG的评估数量和平均分
    const statsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as count,
        AVG(json_extract(data, '$.average_score')) as avg_score
      FROM evaluations
      WHERE json_extract(data, '$.MAG') = ?
    `);

    const { count, avg_score } = statsStmt.get(mag);

    // 更新或插入MAG信息
    const upsertStmt = this.db.prepare(`
      INSERT INTO mags (mag_id, last_updated, evaluation_count, avg_score)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(mag_id) DO UPDATE SET
        last_updated = excluded.last_updated,
        evaluation_count = excluded.evaluation_count,
        avg_score = excluded.avg_score
    `);

    upsertStmt.run(mag, timestamp, count, avg_score || 0);
  }

  // 私有方法：从缓存获取统计数据
  _getStatsFromCache(id) {
    const cacheMaxAge = 5 * 60 * 1000; // 5分钟缓存

    const stmt = this.db.prepare(`
      SELECT data, last_updated
      FROM stats_cache
      WHERE id = ?
    `);

    const cache = stmt.get(id);

    if (cache) {
      // 检查缓存是否过期
      if (Date.now() - cache.last_updated < cacheMaxAge) {
        return JSON.parse(cache.data);
      }
    }

    return null;
  }

  // 私有方法：保存统计数据到缓存
  _saveStatsToCache(id, data) {
    const timestamp = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO stats_cache (id, data, last_updated)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        last_updated = excluded.last_updated
    `);

    stmt.run(id, JSON.stringify(data), timestamp);
  }

  // 私有方法：清除统计缓存
  _clearStatsCache() {
    const stmt = this.db.prepare('DELETE FROM stats_cache');
    stmt.run();
  }

  // 私有方法：初始化字段标签
  _initializeFieldLabels(sampleData) {
    try {
      // 检查字段标签表是否为空
      if (fieldLabelsDAL.isFieldLabelsEmpty()) {
        console.log('字段标签表为空，从样本数据初始化字段标签');
        fieldLabelsDAL.initializeFieldLabelsFromSample(sampleData);
      }
    } catch (error) {
      console.error('初始化字段标签时出错:', error);
      // 不抛出错误，允许保存评估数据继续进行
    }
  }

  // 调试方法：获取数据库信息
  getDebugInfo() {
    try {
      // 获取数据库中的记录总数
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM evaluations');
      const { count } = countStmt.get();

      // 获取表结构信息
      const tablesStmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = tablesStmt.all();

      const tableInfo = {};
      tables.forEach(table => {
        const columnsStmt = this.db.prepare(`PRAGMA table_info(${table.name})`);
        tableInfo[table.name] = columnsStmt.all();
      });

      return {
        total_records: count,
        tables: tables.map(t => t.name),
        table_structure: tableInfo
      };
    } catch (error) {
      console.error('获取数据库调试信息出错:', error);
      return {
        error: error.message,
        stack: error.stack
      };
    }
  }

  // 调试方法：获取最近的评估数据
  getRecentEvaluations(limit = 5) {
    try {
      // 获取最新的记录
      const recentStmt = this.db.prepare(`
        SELECT id, result_key, timestamp, date, data
        FROM evaluations
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const recentData = recentStmt.all(limit).map(row => {
        return {
          id: row.id,
          result_key: row.result_key,
          timestamp: row.timestamp,
          date: row.date,
          data: JSON.parse(row.data)
        };
      });

      return recentData;
    } catch (error) {
      console.error('获取最近评估数据出错:', error);
      return [];
    }
  }

  // 注意：getAllEvaluations 函数已被删除
  // 现在使用 getStatsOverview 函数获取统计数据，它已经实现了缓存和特殊值 -1 的处理
}

module.exports = EvaluationsDAL;
