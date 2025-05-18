// api-routes.js - API路由模块

const express = require('express');
const router = express.Router();
const EvaluationsDAL = require('./evaluations-dal');
const fieldLabelsDAL = require('./field-labels-dal');
const path = require('path');
const fs = require('fs');

// 初始化数据访问层
// 使用与 server.js 相同的路径构建方式
const config = require('./config');
const dbDir = path.join(__dirname, config.storage.dataDir);
const dbPath = path.join(dbDir, 'evaluations.db');
console.log(`API路由使用数据库路径: ${dbPath}`);

// 确保数据目录存在
if (!fs.existsSync(dbDir)) {
  console.log(`数据目录不存在，正在创建: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

const evaluationsDAL = new EvaluationsDAL(dbPath);

// 中间件：错误处理
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 评估数据管理 API
// 添加新评估
router.post('/evaluations', asyncHandler(async (req, res) => {
  const evaluationData = req.body;

  // 验证请求数据
  if (!evaluationData || Object.keys(evaluationData).length === 0) {
    return res.status(400).json({
      success: false,
      message: '请求体不能为空'
    });
  }

  try {
    // 处理评估结果
    const results = {};
    let resultCount = 0;

    // 如果数据包含result0, result1等键，分别处理每个评估
    for (const key in evaluationData) {
      if (key.startsWith('result')) {
        const result = evaluationData[key];
        const saveResult = evaluationsDAL.saveEvaluation(key, result);
        results[key] = { success: true, id: saveResult.lastInsertRowid };
        resultCount++;
      }
    }

    // 如果没有找到result开头的键，将整个请求体视为单个评估
    if (resultCount === 0) {
      const resultKey = `result${Date.now()}`;
      const saveResult = evaluationsDAL.saveEvaluation(resultKey, evaluationData);
      results[resultKey] = { success: true, id: saveResult.lastInsertRowid };
      resultCount = 1;
    }

    res.json({
      success: true,
      message: `成功保存 ${resultCount} 条评估数据`,
      results
    });
  } catch (error) {
    // 检查是否是维度验证错误
    if (error.message && error.message.includes('维度验证失败')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    // 其他错误
    console.error('保存评估数据时出错:', error);
    return res.status(500).json({
      success: false,
      message: `保存评估数据时出错: ${error.message}`
    });
  }
}));

// 获取评估列表
router.get('/evaluations', asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    productFamily: req.query.productFamily,
    partNumber: req.query.partNumber,
    mag: req.query.mag,
    questionCategory: req.query.category,
    complexity: req.query.complexity,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder
  };

  const evaluations = evaluationsDAL.getEvaluations(options);

  res.json({
    success: true,
    ...evaluations
  });
}));

// 获取单个评估详情
router.get('/evaluations/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const evaluation = evaluationsDAL.getEvaluationById(id);

  if (!evaluation) {
    return res.status(404).json({
      success: false,
      message: `未找到ID为 ${id} 的评估数据`
    });
  }

  res.json({
    success: true,
    evaluation
  });
}));

// 获取总体统计概览
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const stats = evaluationsDAL.getStatsOverview();

  res.json({
    success: true,
    stats
  });
}));

// 获取统计数据 - 主要API端点
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // 从数据库获取统计概览（使用缓存）
    const stats = evaluationsDAL.getStatsOverview();

    // 打印统计数据，用于调试
    console.log('API返回的统计数据:', JSON.stringify(stats, null, 2));

    // 确保返回的数据格式与前端期望的一致，只包含4个指定维度
    const filteredDimensions = {
      hallucination_control: stats.dimension_averages?.hallucination_control || 0,
      quality: stats.dimension_averages?.quality || 0,
      professionalism: stats.dimension_averages?.professionalism || 0,
      usefulness: stats.dimension_averages?.usefulness || 0
    };

    // 如果数据库为空（特殊值-1），保留特殊值
    if (stats.is_empty || stats.overall_average === -1) {
      res.json({
        stats: {
          count: 0,
          overall_average: -1,
          dimension_averages: {
            hallucination_control: -1,
            quality: -1,
            professionalism: -1,
            usefulness: -1
          },
          last_updated: stats.last_updated || Date.now(),
          is_empty: true
        }
      });
    } else {
      // 返回正常统计数据
      res.json({
        stats: {
          count: stats.count || 0,
          overall_average: stats.overall_average || 0,
          dimension_averages: filteredDimensions,
          last_updated: stats.last_updated || Date.now(),
          is_empty: false
        }
      });
    }
  } catch (error) {
    console.error('获取统计数据出错:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stats: {
        count: 0,
        overall_average: -1,
        dimension_averages: {
          hallucination_control: -1,
          quality: -1,
          professionalism: -1,
          usefulness: -1
        },
        is_empty: true,
        error: error.message
      }
    });
  }
}));

// 获取产品评分数据
router.get('/product-scores', asyncHandler(async (req, res) => {
  try {
    // 从数据库获取所有评估数据
    const evaluations = evaluationsDAL.getEvaluations({
      limit: 1000, // 获取足够多的评估数据
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });

    // 按产品ID分组
    const productGroups = {};

    // 遍历所有评估数据
    evaluations.data.forEach(evaluation => {
      // 提取产品ID
      let productId = evaluation['Part Number'];

      // 如果没有Part Number字段，使用默认值
      if (!productId) {
        productId = 'unknown';
      }

      // 初始化产品组
      if (!productGroups[productId]) {
        productGroups[productId] = {
          id: productId,
          samples: [],
          dimensions: {}
        };
      }

      // 添加样本
      productGroups[productId].samples.push(evaluation);

      // 更新维度得分
      const dimensions = [
        'hallucination_control',
        'quality',
        'professionalism',
        'usefulness'
      ];

      dimensions.forEach(dim => {
        if (evaluation[dim] !== undefined) {
          if (!productGroups[productId].dimensions[dim]) {
            productGroups[productId].dimensions[dim] = {
              total: 0,
              count: 0
            };
          }

          productGroups[productId].dimensions[dim].total += evaluation[dim];
          productGroups[productId].dimensions[dim].count++;
        }
      });
    });

    // 计算每个产品的平均得分
    const productScores = Object.values(productGroups).map(group => {
      // 计算各维度平均分
      const dimensionScores = {};
      Object.entries(group.dimensions).forEach(([dim, data]) => {
        dimensionScores[dim] = data.count > 0 ? Math.round(data.total / data.count) : 0;
      });

      // 计算总平均分
      const totalScore = Object.values(dimensionScores).reduce((sum, score) => sum + score, 0);
      const averageScore = Object.keys(dimensionScores).length > 0 ?
                          Math.round(totalScore / Object.keys(dimensionScores).length) : 0;

      return {
        product_id: group.id,
        sample_count: group.samples.length,
        dimension_scores: dimensionScores,
        average_score: averageScore
      };
    });

    console.log(`返回 ${productScores.length} 个产品的评分数据`);
    res.json({ products: productScores });
  } catch (error) {
    console.error(`获取产品评分数据出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// 获取所有测试用例
router.get('/test-cases', asyncHandler(async (req, res) => {
  try {
    // 获取查询参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder || 'desc';

    // 首先检查数据库是否为空
    const stats = evaluationsDAL.getStatsOverview();
    if (stats.is_empty || stats.overall_average === -1) {
      console.log('数据库为空，返回空测试用例列表');
      return res.json({
        success: false,
        message: '数据库为空，请等待数据从 Dify 同步',
        testCases: [],
        pagination: {
          total: 0,
          page: 1,
          limit,
          totalPages: 0
        },
        is_empty: true
      });
    }

    // 从数据库获取评估数据
    const result = evaluationsDAL.getEvaluations({
      page,
      limit,
      sortBy,
      sortOrder
    });

    // 确保result.data存在
    if (!result || !result.data) {
      console.error('获取测试用例失败: 数据库返回无效结果');
      return res.status(500).json({
        success: false,
        message: '获取测试用例失败: 数据库返回无效结果'
      });
    }

    // 返回测试用例数据 - 完整数据结构，包含所有字段
    const simplifiedData = result.data.map(item => {
      // 直接返回扁平化的数据结构，不使用嵌套的data字段
      return {
        id: item.id,
        result_key: item.result_key,
        timestamp: item.timestamp,
        date: item.date,
        'CAS Name': item['CAS Name'] || 'N/A',
        'Product Family': item['Product Family'] || 'N/A',
        'Part Number': item['Part Number'] || 'N/A',
        MAG: item.MAG || 'N/A',
        Question: item.Question || '',
        Answer: item.Answer || '',
        'Question Scenario': item['Question Scenario'] || '',
        'Answer Source': item['Answer Source'] || '',
        'Question Complexity': item['Question Complexity'] || '',
        'Question Frequency': item['Question Frequency'] || '',
        'Question Category': item['Question Category'] || '',
        'Source Category': item['Source Category'] || '',
        hallucination_control: item.hallucination_control || 0,
        quality: item.quality || 0,
        professionalism: item.professionalism || 0,
        usefulness: item.usefulness || 0,
        average_score: item.average_score || 0,
        summary: item.summary || '',
        LLM_ANSWER: item.LLM_ANSWER || ''
      };
    });

    // 打印调试信息
    console.log(`返回 ${simplifiedData.length} 条测试用例数据`);

    // 返回简化的数据结构
    res.json({
      success: true,
      testCases: simplifiedData,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      },
      is_empty: false
    });
  } catch (error) {
    console.error(`获取测试用例出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// 批量删除测试用例
router.delete('/test-cases/batch', asyncHandler(async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请提供有效的ID数组' });
    }

    // 从数据库批量删除评估数据
    const result = evaluationsDAL.deleteEvaluations(ids);

    // 返回成功消息
    res.json({
      success: true,
      message: `已成功删除 ${result.deletedCount} 个测试用例`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error(`批量删除测试用例出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// 删除ID范围内的测试用例
router.delete('/test-cases/range', asyncHandler(async (req, res) => {
  try {
    const { fromId, toId } = req.body;

    if (!fromId || !toId || fromId > toId || fromId < 1) {
      return res.status(400).json({ success: false, message: '请提供有效的ID范围' });
    }

    // 从数据库删除ID范围内的评估数据
    const result = evaluationsDAL.deleteEvaluationRange(fromId, toId);

    // 返回成功消息
    res.json({
      success: true,
      message: `已成功删除ID范围 ${fromId} 到 ${toId} 内的 ${result.deletedCount} 个测试用例`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error(`删除ID范围内的测试用例出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// 获取单个测试用例
router.get('/test-cases/:id', asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 从数据库获取评估数据
    const testCase = evaluationsDAL.getEvaluationById(id);

    if (!testCase) {
      return res.status(404).json({ success: false, message: '测试用例不存在' });
    }

    // 返回测试用例数据 - 使用与列表API相同的完整结构
    const simplifiedTestCase = {
      id: testCase.id,
      result_key: testCase.result_key,
      timestamp: testCase.timestamp,
      date: testCase.date,
      'CAS Name': testCase['CAS Name'] || 'N/A',
      'Product Family': testCase['Product Family'] || 'N/A',
      'Part Number': testCase['Part Number'] || 'N/A',
      MAG: testCase.MAG || 'N/A',
      Question: testCase.Question || '',
      Answer: testCase.Answer || '',
      'Question Scenario': testCase['Question Scenario'] || '',
      'Answer Source': testCase['Answer Source'] || '',
      'Question Complexity': testCase['Question Complexity'] || '',
      'Question Frequency': testCase['Question Frequency'] || '',
      'Question Category': testCase['Question Category'] || '',
      'Source Category': testCase['Source Category'] || '',
      hallucination_control: testCase.hallucination_control || 0,
      quality: testCase.quality || 0,
      professionalism: testCase.professionalism || 0,
      usefulness: testCase.usefulness || 0,
      average_score: testCase.average_score || 0,
      summary: testCase.summary || '',
      LLM_ANSWER: testCase.LLM_ANSWER || ''
    };

    // 返回简化的数据结构
    res.json({
      success: true,
      testCase: simplifiedTestCase
    });
  } catch (error) {
    console.error(`获取测试用例出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// 删除单个测试用例
router.delete('/test-cases/:id', asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 从数据库删除评估数据
    const result = evaluationsDAL.deleteEvaluation(id);

    if (!result.success) {
      return res.status(404).json({ success: false, message: '测试用例不存在' });
    }

    // 返回成功消息
    res.json({
      success: true,
      message: `测试用例 #${id} 已成功删除`
    });
  } catch (error) {
    console.error(`删除测试用例出错: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// 获取字段标签
router.get('/field-labels', asyncHandler(async (req, res) => {
  try {
    // 获取可见的字段标签
    const labels = fieldLabelsDAL.getVisibleFieldLabels();

    res.json({
      success: true,
      labels
    });
  } catch (error) {
    console.error(`获取字段标签出错: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
      labels: []
    });
  }
}));

// 删除ID范围内的测试用例 - 已在上面定义，此处删除重复代码

// 保存评估数据 (兼容旧API)
router.post('/save-evaluation', asyncHandler(async (req, res) => {
  const evaluationData = req.body;

  // 验证请求数据
  if (!evaluationData || Object.keys(evaluationData).length === 0) {
    return res.status(400).json({
      success: false,
      message: '请求体不能为空'
    });
  }

  try {
    // 处理评估结果
    const results = {};
    let resultCount = 0;

    // 检查是否是Dify工作流格式 (arg1嵌套格式)
    if (evaluationData.arg1 && typeof evaluationData.arg1 === 'object') {
      console.log('检测到Dify工作流格式数据');

      // 处理arg1中的数据
      const difyData = evaluationData.arg1;

      // 如果arg1中包含result0, result1等键，分别处理每个评估
      for (const key in difyData) {
        if (key.startsWith('result')) {
          const result = difyData[key];
          const saveResult = evaluationsDAL.saveEvaluation(key, result);
          results[key] = { success: true, id: saveResult.lastInsertRowid };
          resultCount++;
        }
      }

      // 如果arg1不包含result开头的键，将整个arg1视为单个评估
      if (resultCount === 0) {
        const resultKey = `result${Date.now()}`;
        const saveResult = evaluationsDAL.saveEvaluation(resultKey, difyData);
        results[resultKey] = { success: true, id: saveResult.lastInsertRowid };
        resultCount = 1;
      }
    } else {
      // 标准格式处理

      // 如果数据包含result0, result1等键，分别处理每个评估
      for (const key in evaluationData) {
        if (key.startsWith('result')) {
          const result = evaluationData[key];
          const saveResult = evaluationsDAL.saveEvaluation(key, result);
          results[key] = { success: true, id: saveResult.lastInsertRowid };
          resultCount++;
        }
      }

      // 如果没有找到result开头的键，将整个请求体视为单个评估
      if (resultCount === 0) {
        const resultKey = `result${Date.now()}`;
        const saveResult = evaluationsDAL.saveEvaluation(resultKey, evaluationData);
        results[resultKey] = { success: true, id: saveResult.lastInsertRowid };
        resultCount = 1;
      }
    }

    res.json({
      success: true,
      message: `成功保存 ${resultCount} 条评估数据`,
      results
    });
  } catch (error) {
    // 检查是否是维度验证错误
    if (error.message && error.message.includes('维度验证失败')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    // 其他错误
    console.error('保存评估数据时出错:', error);
    return res.status(500).json({
      success: false,
      message: `保存评估数据时出错: ${error.message}`
    });
  }
}));

// 专门用于Dify工作流的评估数据保存接口
router.post('/dify-evaluation', asyncHandler(async (req, res) => {
  console.log('收到 /dify-evaluation 请求');

  // 检查数据库连接
  try {
    // 检查数据库目录是否存在
    if (!fs.existsSync(dbDir)) {
      console.log(`数据目录不存在，正在创建: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 检查数据库文件是否存在
    if (!fs.existsSync(dbPath)) {
      console.log(`数据库文件不存在: ${dbPath}`);
    } else {
      console.log(`数据库文件存在: ${dbPath}, 大小: ${fs.statSync(dbPath).size} 字节`);
    }
  } catch (fsError) {
    console.error('检查数据库文件时出错:', fsError);
  }

  const evaluationData = req.body;

  // 验证请求数据
  if (!evaluationData || Object.keys(evaluationData).length === 0) {
    console.error('请求体为空');
    return res.status(400).json({
      success: false,
      message: '请求体不能为空'
    });
  }

  console.log('接收到Dify工作流数据:', JSON.stringify(evaluationData).substring(0, 200) + '...');
  console.log('数据类型:', typeof evaluationData);
  console.log('数据键:', Object.keys(evaluationData));

  try {
    // 处理评估结果
    const results = {};
    let resultCount = 0;

    // 检查是否是Dify工作流格式 (arg1嵌套格式)
    if (evaluationData.arg1 && typeof evaluationData.arg1 === 'object') {
      console.log('处理arg1中的数据');
      console.log('arg1类型:', typeof evaluationData.arg1);
      console.log('arg1键:', Object.keys(evaluationData.arg1));

      // 处理arg1中的数据
      const difyData = evaluationData.arg1;

      // 如果arg1中包含result0, result1等键，分别处理每个评估
      for (const key in difyData) {
        if (key.startsWith('result')) {
          console.log(`处理结果键: ${key}`);
          const result = difyData[key];
          console.log(`结果数据类型: ${typeof result}`);
          console.log(`结果数据键: ${Object.keys(result)}`);

          try {
            console.log(`保存评估数据: ${key}`);
            const saveResult = evaluationsDAL.saveEvaluation(key, result);
            console.log(`保存成功, ID: ${saveResult.lastInsertRowid}`);
            results[key] = { success: true, id: saveResult.lastInsertRowid };
            resultCount++;
          } catch (saveError) {
            console.error(`保存评估数据 ${key} 时出错:`, saveError);
            results[key] = { success: false, error: saveError.message };
          }
        }
      }

      // 如果arg1不包含result开头的键，将整个arg1视为单个评估
      if (resultCount === 0) {
        console.log('未找到result开头的键，将整个arg1视为单个评估');
        const resultKey = `result${Date.now()}`;
        try {
          console.log(`保存评估数据: ${resultKey}`);
          const saveResult = evaluationsDAL.saveEvaluation(resultKey, difyData);
          console.log(`保存成功, ID: ${saveResult.lastInsertRowid}`);
          results[resultKey] = { success: true, id: saveResult.lastInsertRowid };
          resultCount = 1;
        } catch (saveError) {
          console.error(`保存评估数据 ${resultKey} 时出错:`, saveError);
          results[resultKey] = { success: false, error: saveError.message };
        }
      }
    } else {
      // 直接处理整个请求体
      console.log('直接处理整个请求体');
      const resultKey = `result${Date.now()}`;
      try {
        console.log(`保存评估数据: ${resultKey}`);
        const saveResult = evaluationsDAL.saveEvaluation(resultKey, evaluationData);
        console.log(`保存成功, ID: ${saveResult.lastInsertRowid}`);
        results[resultKey] = { success: true, id: saveResult.lastInsertRowid };
        resultCount = 1;
      } catch (saveError) {
        console.error(`保存评估数据 ${resultKey} 时出错:`, saveError);
        results[resultKey] = { success: false, error: saveError.message };
      }
    }

    // 检查数据库文件是否存在
    try {
      if (!fs.existsSync(dbPath)) {
        console.log(`保存后数据库文件仍不存在: ${dbPath}`);
      } else {
        console.log(`保存后数据库文件存在: ${dbPath}, 大小: ${fs.statSync(dbPath).size} 字节`);
      }
    } catch (fsError) {
      console.error('检查数据库文件时出错:', fsError);
    }

    console.log(`处理完成，成功保存 ${resultCount} 条评估数据`);
    res.json({
      success: true,
      message: `成功保存 ${resultCount} 条评估数据`,
      results
    });
  } catch (error) {
    // 检查是否是维度验证错误
    if (error.message && error.message.includes('维度验证失败')) {
      console.error('维度验证失败:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    // 其他错误
    console.error('保存Dify评估数据时出错:', error);
    return res.status(500).json({
      success: false,
      message: `保存评估数据时出错: ${error.message}`
    });
  }
}));

// 数据库检查 API - 仅用于调试
router.get('/dbinfo', asyncHandler(async (req, res) => {
  try {
    // 获取数据库信息
    const dbInfo = evaluationsDAL.getDebugInfo();

    // 获取最新的5条记录
    const recentData = evaluationsDAL.getRecentEvaluations(5);

    // 返回数据库信息
    res.json({
      success: true,
      database_info: {
        ...dbInfo,
        recent_records: recentData
      }
    });
  } catch (error) {
    console.error('获取数据库信息出错:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
}));

// 注意：此处原有的重复 /stats 端点已被删除
// 现在只使用上面定义的 /stats 端点，它使用 getStatsOverview() 函数
// 该函数已经实现了缓存和特殊值 -1 的处理

// 导出路由
module.exports = router;
