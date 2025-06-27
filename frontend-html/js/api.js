/**
 * API 交互模块
 * 处理与后端 API 的所有通信
 */

// API 基础 URL
// 优先使用配置文件中的API地址
function getApiBaseUrl() {
    // 优先使用配置文件中的设置
    if (window.appConfig && window.appConfig.apiBaseUrl) {
        return window.appConfig.apiBaseUrl;
    }

    // 如果没有配置文件，使用自动检测
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // 本地开发环境，使用固定端口
        return 'http://localhost:3000';
    } else {
        // 生产环境，假设API在同一主机的3000端口
        return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
}

const API_BASE_URL = getApiBaseUrl();

// API 端点
const API_ENDPOINTS = {
    EVALUATIONS: '/api/evaluations',
    STATS: '/api/stats',
    SAVE_EVALUATION: '/api/save-evaluation'
};

// 注意：身份验证已被移除，因为在 Node.js v22+ 中存在兼容性问题

/**
 * 创建请求头部
 * @returns {Object} 包含请求头的对象
 */
function createAuthHeader() {
    // 返回空对象，不再使用身份验证
    return {};
}

/**
 * 通用 API 请求函数
 * @param {string} endpoint - API 端点
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`[DEBUG] 发起请求: ${url}`);

    // 合并默认选项和传入的选项
    const requestOptions = {
        headers: {
            'Accept': 'application/json',
            ...createAuthHeader(),
            ...(options.headers || {})
        },
        ...options
    };

    console.log(`[DEBUG] 请求选项:`, requestOptions);

    try {
        console.log(`[DEBUG] 开始 fetch 请求...`);
        const response = await fetch(url, requestOptions);
        console.log(`[DEBUG] 收到响应:`, response);

        // 检查响应状态
        if (!response.ok) {
            console.error(`[DEBUG] 响应状态错误: ${response.status} ${response.statusText}`);
            throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }

        // 解析 JSON 响应
        console.log(`[DEBUG] 开始解析 JSON...`);
        const text = await response.text();
        console.log(`[DEBUG] 响应文本:`, text);

        let data;
        try {
            data = JSON.parse(text);
            console.log(`[DEBUG] 解析后的数据:`, data);
        } catch (parseError) {
            console.error(`[DEBUG] JSON 解析错误:`, parseError);
            throw new Error(`JSON 解析错误: ${parseError.message}, 原始文本: ${text}`);
        }

        return data;
    } catch (error) {
        console.error('[DEBUG] API 请求错误:', error);
        alert(`API 请求错误: ${error.message}`);
        throw error;
    }
}

/**
 * 获取所有评估数据
 * @returns {Promise<Array>} 评估数据数组
 */
async function getEvaluations() {
    try {
        const response = await apiRequest(API_ENDPOINTS.EVALUATIONS);
        return response.evaluations || [];
    } catch (error) {
        console.error('获取评估数据失败:', error);
        throw error;
    }
}

/**
 * 获取统计数据
 * @returns {Promise<Object>} 统计数据对象
 */
async function getStats() {
    try {
        const response = await apiRequest(API_ENDPOINTS.STATS);
        return response.stats || {};
    } catch (error) {
        console.error('获取统计数据失败:', error);
        throw error;
    }
}

/**
 * 保存评估数据
 * @param {Object} evaluationData - 评估数据
 * @returns {Promise<Object>} 保存结果
 */
async function saveEvaluation(evaluationData) {
    try {
        const response = await apiRequest(API_ENDPOINTS.SAVE_EVALUATION, {
            method: 'POST',
            body: JSON.stringify(evaluationData)
        });
        return response;
    } catch (error) {
        console.error('保存评估数据失败:', error);
        throw error;
    }
}

/**
 * 导出评估数据为 CSV
 * @param {Array} evaluations - 评估数据数组
 * @returns {string} CSV 字符串
 */
function exportToCSV(evaluations) {
    if (!evaluations || evaluations.length === 0) {
        return '';
    }

    // 获取所有可能的维度
    const dimensions = new Set();
    evaluations.forEach(eval => {
        Object.keys(eval).forEach(key => {
            if (typeof eval[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                !key.includes('_id')) {
                dimensions.add(key);
            }
        });
    });

    // 创建 CSV 头
    const headers = ['ID', '日期', '时间戳', ...Array.from(dimensions)];
    let csv = headers.join(',') + '\n';

    // 添加数据行
    evaluations.forEach(eval => {
        const date = new Date(eval.timestamp);
        const dateStr = date.toISOString().split('T')[0];

        const row = [
            eval.id,
            dateStr,
            eval.timestamp,
            ...Array.from(dimensions).map(dim => eval[dim] || '')
        ];

        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * 下载 CSV 文件
 * @param {string} csv - CSV 内容
 * @param {string} filename - 文件名
 */
function downloadCSV(csv, filename = 'evaluations.csv') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
