/**
 * 请求限流中间件
 * 用于限制API请求频率，防止滥用
 */

/**
 * 简单的内存存储限流器
 * 注意：这种实现方式仅适用于单实例部署，不适用于多实例部署
 */
class MemoryRateLimiter {
  /**
   * 创建内存限流器
   * @param {Object} options - 限流选项
   * @param {number} options.windowMs - 时间窗口（毫秒）
   * @param {number} options.maxRequests - 时间窗口内允许的最大请求数
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 默认1分钟
    this.maxRequests = options.maxRequests || 100; // 默认每分钟100个请求
    this.store = new Map(); // IP -> {count, resetTime}
  }

  /**
   * 清理过期的记录
   * @private
   */
  _cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(ip);
      }
    }
  }

  /**
   * 检查请求是否超过限制
   * @param {string} ip - 客户端IP地址
   * @returns {Object} 限流状态
   */
  check(ip) {
    this._cleanup();
    
    const now = Date.now();
    
    if (!this.store.has(ip)) {
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        limited: false,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }
    
    const data = this.store.get(ip);
    
    // 如果已经过了重置时间，重置计数
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + this.windowMs;
      return {
        limited: false,
        remaining: this.maxRequests - 1,
        resetTime: data.resetTime
      };
    }
    
    // 增加计数
    data.count += 1;
    
    // 检查是否超过限制
    const limited = data.count > this.maxRequests;
    
    return {
      limited,
      remaining: Math.max(0, this.maxRequests - data.count),
      resetTime: data.resetTime
    };
  }
}

/**
 * 创建限流中间件
 * @param {Object} options - 限流选项
 * @returns {Function} Express中间件函数
 */
function createRateLimiter(options = {}) {
  const limiter = new MemoryRateLimiter(options);
  
  return function rateLimiterMiddleware(req, res, next) {
    // 获取客户端IP
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               req.connection.socket.remoteAddress || 
               '0.0.0.0';
    
    // 检查限流状态
    const result = limiter.check(ip);
    
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    
    // 如果超过限制，返回429状态码
    if (result.limited) {
      // 尝试获取logger实例
      const logger = req.app.locals.logger || console;
      logger.warn(`请求限流: IP=${ip}, 路径=${req.originalUrl}`);
      
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }
    
    next();
  };
}

module.exports = createRateLimiter;
