/**
 * 请求验证中间件
 * 用于验证API请求的数据格式
 */

/**
 * 验证保存评估数据的请求
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function validateSaveEvaluation(req, res, next) {
  try {
    const data = req.body;

    // 检查请求体是否为空
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: '请求体不能为空'
      });
    }

    // 检查是否包含至少一个评估结果
    const hasResults = Object.keys(data).some(key => key.startsWith('result'));
    if (!hasResults) {
      return res.status(400).json({
        success: false,
        message: '请求必须包含至少一个评估结果（以"result"开头的键）'
      });
    }

    // 验证通过，继续处理请求
    next();
  } catch (error) {
    console.error('验证请求失败:', error);
    res.status(400).json({
      success: false,
      message: `请求验证失败: ${error.message}`
    });
  }
}

/**
 * 通用错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function errorHandler(err, req, res, next) {
  // 获取请求信息
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  // 尝试获取logger实例
  const logger = req.app.locals.logger || console;

  // 记录错误
  logger.error(`服务器错误: ${err.message}`);
  logger.error(`请求信息: ${JSON.stringify(requestInfo)}`);
  if (err.stack) {
    logger.error(`错误堆栈: ${err.stack}`);
  }

  // 设置状态码（默认为500）
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}

/**
 * 404错误处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function notFound(req, res) {
  // 获取请求信息
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  // 尝试获取logger实例
  const logger = req.app.locals.logger || console;

  // 记录404错误
  logger.warn(`404 未找到路径: ${req.originalUrl}`);
  logger.debug(`404 请求信息: ${JSON.stringify(requestInfo)}`);

  res.status(404).json({
    success: false,
    message: `未找到路径: ${req.originalUrl}`
  });
}

module.exports = {
  validateSaveEvaluation,
  errorHandler,
  notFound
};
