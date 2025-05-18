/**
 * 产品评分API模块 - 已弃用
 *
 * 注意：此模块已弃用，不再使用。
 * 产品评分数据现在直接从SQLite数据库中获取，
 * 相关功能已移至 api-routes.js 中的 /api/product-scores 端点。
 */

/**
 * 注册产品评分API路由 - 已弃用
 * @deprecated 此函数已弃用，不再使用
 */
function registerProductAPI() {
    console.warn('警告: registerProductAPI 函数已弃用，不再使用');
    return null;
}

module.exports = registerProductAPI;
