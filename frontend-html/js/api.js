/**
 * API 交互模块
 * 处理与后端 API 的所有通信
 */

// API 基础 URL
const API_BASE_URL = 'http://10.193.21.115:3000';

// API 端点
const API_ENDPOINTS = {
    EVALUATIONS: '/api/evaluations',
    STATS: '/api/stats',
    SAVE_EVALUATION: '/api/save-evaluation'
};

// 基本身份验证凭据
const AUTH_CREDENTIALS = {
    username: 'admin',
    password: 'ken@1234'
};

/**
 * 创建基本身份验证头部
 * @returns {Object} 包含 Authorization 头的对象
 */
function createAuthHeader() {
    const credentials = `${AUTH_CREDENTIALS.username}:${AUTH_CREDENTIALS.password}`;
    const encodedCredentials = btoa(credentials);
    return {
        'Authorization': `Basic ${encodedCredentials}`
    };
}

/**
 * 通用 API 请求函数
 * @param {string} endpoint - API 端点
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // 合并默认选项和传入的选项
    const requestOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...createAuthHeader(),
            ...(options.headers || {})
        },
        ...options
    };
    
    try {
        const response = await fetch(url, requestOptions);
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }
        
        // 解析 JSON 响应
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API 请求错误:', error);
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
