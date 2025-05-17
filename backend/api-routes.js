// api-routes.js - API路由模块

const express = require('express');
const router = express.Router();
const EvaluationsDAL = require('./evaluations-dal');
const path = require('path');

// 初始化数据访问层
const dbPath = path.join(__dirname, 'data', 'evaluations.db');
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

// 兼容旧API
// 获取统计数据
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = evaluationsDAL.getStatsOverview();

  // 打印统计数据，用于调试
  console.log('API返回的统计数据:', JSON.stringify(stats, null, 2));

  // 确保返回的数据格式与前端期望的一致
  res.json({
    stats: {
      count: stats.count || 0,
      overall_average: stats.overall_average || 0,
      dimension_averages: stats.dimension_averages || {
        hallucination_control: 0,
        quality: 0,
        professionalism: 0,
        usefulness: 0
      },
      last_updated: stats.last_updated || new Date().toISOString()
    }
  });
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
}));

// 专门用于Dify工作流的评估数据保存接口
router.post('/dify-evaluation', asyncHandler(async (req, res) => {
  const evaluationData = req.body;

  // 验证请求数据
  if (!evaluationData || Object.keys(evaluationData).length === 0) {
    return res.status(400).json({
      success: false,
      message: '请求体不能为空'
    });
  }

  console.log('接收到Dify工作流数据:', JSON.stringify(evaluationData).substring(0, 200) + '...');

  // 处理评估结果
  const results = {};
  let resultCount = 0;

  // 检查是否是Dify工作流格式 (arg1嵌套格式)
  if (evaluationData.arg1 && typeof evaluationData.arg1 === 'object') {
    console.log('处理arg1中的数据');

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
    // 直接处理整个请求体
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
}));

// 导出路由
module.exports = router;
