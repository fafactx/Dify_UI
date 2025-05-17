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

  res.json({ stats });
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
