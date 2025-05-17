// evaluations-dal.js - 评估数据访问层

const { getDatabase } = require('./database');
const { getDbLogger } = require('./utils/db-logger');

class EvaluationsDAL {
  constructor(dbPath) {
    this.db = getDatabase(dbPath);
    this.logger = getDbLogger();
  }

  // 保存新的评估数据
  saveEvaluation(resultKey, evaluationData) {
    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString();

    try {
      // 记录原始数据
      console.log(`接收到评估数据 [${resultKey}]`);

      // 验证和预处理评估数据
      const processedData = this._preprocessEvaluationData(evaluationData, resultKey);

      // 记录处理后的数据
      this.logger.logEvaluationSave(resultKey, processedData);

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
        console.log(`评估数据 [${resultKey}] 已保存到数据库，ID: ${result.lastInsertRowid}`);

        // 更新产品信息
        this._updateProductInfo(processedData['Part Number'], processedData['Product Family']);

        // 更新MAG信息
        if (processedData['MAG']) {
          this._updateMagInfo(processedData['MAG']);
        }

        // 清除统计缓存，强制下次请求重新计算
        this._clearStatsCache();

        return result;
      });

      return transaction();
    } catch (error) {
      console.error(`保存评估数据 [${resultKey}] 时出错:`, error);
      this.logger.logError('save_evaluation', error);
      throw error;
    }
  }

  // 预处理评估数据
  _preprocessEvaluationData(data, resultKey) {
    console.log(`预处理评估数据 [${resultKey}]`);

    // 创建数据副本，避免修改原始数据
    const processedData = { ...data };

    // 确保必要字段存在
    if (!processedData['CAS Name']) {
      processedData['CAS Name'] = 'unknown';
      console.log(`警告: 评估数据 [${resultKey}] 缺少 CAS Name 字段`);
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
        console.log(`从Part Number [${partNumber}] 推断Product Family: ${processedData['Product Family']}`);
      } else {
        processedData['Product Family'] = 'Unknown';
        console.log(`警告: 评估数据 [${resultKey}] 缺少 Product Family 字段`);
      }
    }

    // 确保评分字段是数字类型
    const scoreFields = ['hallucination_control', 'quality', 'professionalism', 'usefulness', 'average_score'];
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

      ['hallucination_control', 'quality', 'professionalism', 'usefulness'].forEach(field => {
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
  }

  // 获取总体统计概览
  getStatsOverview() {
    // 尝试从缓存获取
    const cachedStats = this._getStatsFromCache('overview');
    if (cachedStats) {
      return cachedStats;
    }

    // 计算统计数据
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM evaluations');
    const { count } = totalStmt.get();

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
      last_updated
    };

    // 缓存结果
    this._saveStatsToCache('overview', stats);

    return stats;
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
}

module.exports = EvaluationsDAL;
