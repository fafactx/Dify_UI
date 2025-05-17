/**
 * 产品评分API模块
 * 提供产品评分相关的API端点
 */

const fs = require('fs');
const path = require('path');

/**
 * 注册产品评分API路由
 * @param {Object} app - Express应用实例
 * @param {Object} config - 应用配置
 * @param {Object} logger - 日志记录器
 */
function registerProductAPI(app, config, logger) {
    const dataDir = path.join(__dirname, config.storage.dataDir);

    // API 路由：获取产品评分数据
    app.get('/api/product-scores', async (req, res) => {
        try {
            const indexPath = path.join(dataDir, config.storage.indexFile);

            // 如果索引文件不存在，返回空数组
            if (!fs.existsSync(indexPath)) {
                logger.info('索引文件不存在，返回空产品评分数组');
                return res.json({ products: [] });
            }

            logger.debug('读取索引文件以获取产品评分数据');
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            const allEvaluations = [];

            // 读取每个文件中的评估数据
            for (const fileInfo of index.files) {
                const filePath = path.join(dataDir, fileInfo.filename);
                if (fs.existsSync(filePath)) {
                    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                    // 处理评估结果对象
                    const evaluations = {};
                    Object.keys(fileData.data || {}).forEach(key => {
                        if (key.startsWith('result')) {
                            evaluations[key] = fileData.data[key];
                        }
                    });

                    // 将每个评估结果添加到数组
                    Object.values(evaluations).forEach(evaluation => {
                        allEvaluations.push(evaluation);
                    });
                }
            }

            // 按产品ID分组
            const productGroups = {};
            
            // 遍历所有评估数据
            allEvaluations.forEach(evaluation => {
                // 提取产品ID (假设存储在product_id字段中)
                // 如果不存在，尝试从其他字段提取
                let productId = evaluation.product_id;
                
                // 如果没有product_id字段，尝试从其他字段提取
                if (!productId) {
                    // 尝试从question字段提取产品ID
                    if (evaluation.question) {
                        const match = evaluation.question.match(/PN-\d+/i);
                        if (match) {
                            productId = match[0];
                        }
                    }
                    
                    // 如果仍然没有找到，尝试从answer字段提取
                    if (!productId && evaluation.answer) {
                        const match = evaluation.answer.match(/PN-\d+/i);
                        if (match) {
                            productId = match[0];
                        }
                    }
                    
                    // 如果仍然没有找到，使用默认值
                    if (!productId) {
                        productId = 'unknown';
                    }
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

            logger.info(`返回 ${productScores.length} 个产品的评分数据`);
            res.json({ products: productScores });
        } catch (error) {
            logger.error(`获取产品评分数据出错: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

module.exports = registerProductAPI;
