// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// 初始化 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 确保数据目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// API 路由：保存评估数据
app.post('/api/save-evaluation', async (req, res) => {
  try {
    const evaluationData = req.body;
    const timestamp = Date.now();
    const filename = `evaluation_${timestamp}.json`;
    const filePath = path.join(__dirname, 'data', filename);

    // 添加时间戳
    const dataToSave = {
      timestamp,
      date: new Date(timestamp).toISOString(),
      data: evaluationData
    };

    // 保存到文件
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

    // 更新索引文件
    await updateIndex(filename, dataToSave);

    res.json({ success: true, message: '评估数据已保存', filename });
  } catch (error) {
    console.error('保存评估数据出错:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API 路由：获取所有评估数据
app.get('/api/evaluations', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'data', 'index.json');

    // 如果索引文件不存在，返回空数组
    if (!fs.existsSync(indexPath)) {
      return res.json({ evaluations: [] });
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const allEvaluations = [];

    // 读取每个文件中的评估数据
    for (const fileInfo of index.files) {
      const filePath = path.join(__dirname, 'data', fileInfo.filename);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 处理评估结果对象
        const evaluations = fileData.data.result || {};

        // 将每个评估结果转换为数组项
        Object.entries(evaluations).forEach(([key, evaluation]) => {
          allEvaluations.push({
            id: key,
            timestamp: fileData.timestamp,
            date: fileData.date,
            ...evaluation
          });
        });
      }
    }

    res.json({ evaluations: allEvaluations });
  } catch (error) {
    console.error('获取评估数据出错:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API 路由：获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, 'data', 'index.json');

    // 如果索引文件不存在，返回空统计
    if (!fs.existsSync(indexPath)) {
      return res.json({ stats: { count: 0 } });
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const allEvaluations = [];

    // 读取每个文件中的评估数据
    for (const fileInfo of index.files) {
      const filePath = path.join(__dirname, 'data', fileInfo.filename);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 处理评估结果对象
        const evaluations = fileData.data.result || {};

        // 将每个评估结果添加到数组
        Object.values(evaluations).forEach(evaluation => {
          allEvaluations.push(evaluation);
        });
      }
    }

    // 计算各维度的平均分
    const dimensions = [
      'factual_accuracy', 'hallucination_control', 'professionalism',
      'practicality', 'technical_depth', 'context_relevance',
      'solution_completeness', 'actionability', 'clarity_structure'
    ];

    const averages = {};
    dimensions.forEach(dim => {
      const values = allEvaluations.map(e => e[dim]).filter(v => v !== undefined);
      averages[dim] = values.length ?
        Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0;
    });

    // 计算总平均分
    const overallAverage = allEvaluations.length ?
      Math.round(
        allEvaluations.map(e => e.average_score).reduce((sum, val) => sum + val, 0) /
        allEvaluations.length
      ) : 0;

    // 返回统计数据
    const stats = {
      count: allEvaluations.length,
      overall_average: overallAverage,
      dimension_averages: averages,
      last_updated: index.last_updated ? new Date(index.last_updated).toISOString() : null
    };

    res.json({ stats });
  } catch (error) {
    console.error('获取统计数据出错:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 辅助函数：更新索引文件
async function updateIndex(filename, fileData) {
  const indexPath = path.join(__dirname, 'data', 'index.json');
  let index = { files: [], total_evaluations: 0, last_updated: Date.now() };

  // 如果索引文件存在，读取它
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }

  // 计算评估结果数量
  const evaluationCount = Object.keys(fileData.data.result || {}).length;

  // 添加新文件信息
  index.files.push({
    filename,
    timestamp: fileData.timestamp,
    date: fileData.date,
    count: evaluationCount
  });

  // 更新总数和最后更新时间
  index.total_evaluations += evaluationCount;
  index.last_updated = Date.now();

  // 保存更新后的索引
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://10.193.21.115:${PORT}`);
});
