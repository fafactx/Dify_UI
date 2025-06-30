/**
 * Test Cases Page JavaScript - 修复版本
 * 基于React最佳实践，解决无限加载循环问题
 */

// Global variables
let testCases = [];
let currentPage = 1;
const pageSize = 10;
let selectedIds = new Set();
let statsData = null;
let searchTerm = '';
let fieldLabels = [];

// 状态管理 - 基于React useState模式
let isLoading = false;
let isInitialized = false;
let loadingController = null;

// DOM elements
let testCasesBody, pagination, selectAllCheckbox, deleteSelectedBtn, deleteRangeBtn, refreshBtn;
let deleteRangeModal, confirmationModal, fromIdInput, toIdInput;
let totalSamplesElement, avgScoreElement, productFamiliesElement, magCountElement;

// 性能监控 - 基于React Profiler模式
const performanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    searchTime: 0,
    apiCalls: 0
};

// 缓存渲染结果 - 基于React useMemo模式
let renderCache = new Map();
let lastRenderKey = '';

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Test Cases页面初始化开始...');
    console.log('📋 配置信息:', window.appConfig);
    console.log('🌐 API基础URL:', getApiBaseUrl());
    console.log('🔧 当前环境:', {
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        pathname: window.location.pathname
    });

    // 初始化DOM元素
    initializeDOMElements();

    // 添加性能监控
    const startTime = performance.now();

    loadData().then(() => {
        performanceMetrics.loadTime = performance.now() - startTime;
        logPerformanceMetrics();
        console.log('✅ 页面初始化成功完成');
    }).catch(error => {
        console.error('❌ 页面初始化失败:', error);
        performanceMetrics.loadTime = performance.now() - startTime;
        logPerformanceMetrics();
    });

    // Event listeners
    if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', handleSelectAll);
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', showDeleteConfirmation);
    if (deleteRangeBtn) deleteRangeBtn.addEventListener('click', showDeleteRangeModal);
    if (refreshBtn) refreshBtn.addEventListener('click', loadData);

    // 搜索功能 - 使用防抖优化，基于React最佳实践
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debouncedSearch);
    }

    // Modal event listeners
    document.getElementById('cancelDeleteRange')?.addEventListener('click', hideDeleteRangeModal);
    document.getElementById('confirmDeleteRange')?.addEventListener('click', handleDeleteRange);
    document.getElementById('cancelDelete')?.addEventListener('click', hideConfirmationModal);
    document.getElementById('confirmDelete')?.addEventListener('click', handleDelete);
});

/**
 * 初始化DOM元素
 */
function initializeDOMElements() {
    testCasesBody = document.getElementById('testCasesBody');
    pagination = document.getElementById('pagination');
    selectAllCheckbox = document.getElementById('selectAll');
    deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    deleteRangeBtn = document.getElementById('deleteRangeBtn');
    refreshBtn = document.getElementById('refreshBtn');
    deleteRangeModal = document.getElementById('deleteRangeModal');
    confirmationModal = document.getElementById('confirmationModal');
    fromIdInput = document.getElementById('fromId');
    toIdInput = document.getElementById('toId');
    totalSamplesElement = document.getElementById('totalSamples');
    avgScoreElement = document.getElementById('avgScore');
    productFamiliesElement = document.getElementById('productFamilies');
    magCountElement = document.getElementById('magCount');
}

function logPerformanceMetrics() {
    console.group('🚀 页面性能指标');
    console.log('数据加载时间:', performanceMetrics.loadTime + 'ms');
    console.log('渲染时间:', performanceMetrics.renderTime + 'ms');
    console.log('搜索时间:', performanceMetrics.searchTime + 'ms');
    console.log('API调用次数:', performanceMetrics.apiCalls);
    console.log('测试用例数量:', testCases.length);
    console.log('缓存命中率:', renderCache.size > 0 ? '有缓存' : '无缓存');
    console.log('当前状态:', {
        isLoading,
        isInitialized,
        searchTerm,
        currentPage
    });
    console.groupEnd();
}

/**
 * Load all data (test cases and stats) - 基于React最佳实践
 */
async function loadData() {
    // 防止重复调用 - 类似React的useEffect依赖检查
    if (isLoading) {
        console.log('数据正在加载中，跳过重复调用');
        return;
    }

    // 取消之前的请求
    if (loadingController) {
        loadingController.abort();
    }

    loadingController = new AbortController();
    isLoading = true;

    try {
        console.log('开始加载数据...');

        // 显示加载状态
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
            refreshBtn.disabled = true;
        }

        // 并行加载所有数据 - 类似React的并发特性
        const loadPromises = [
            loadFieldLabels(loadingController.signal),
            loadStats(loadingController.signal),
        ];

        // 等待基础数据加载完成
        await Promise.allSettled(loadPromises);

        // 初始化表格标题
        initializeTableHeaders();

        // 加载测试用例
        await loadTestCases(loadingController.signal);

        isInitialized = true;
        console.log('数据加载完成');

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('数据加载被取消');
            return;
        }

        console.error('加载数据错误:', error);

        // 确保表头已初始化
        if (!document.querySelector('#testCasesTableHead tr')) {
            initializeTableHeaders();
        }

        // 显示错误信息
        showErrorState(error);

    } finally {
        // 恢复状态
        isLoading = false;
        loadingController = null;

        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh';
            refreshBtn.disabled = false;
        }
    }
}

// Get API base URL - 修复版
function getApiBaseUrl() {
    // 优先使用配置文件中的设置
    if (window.appConfig && window.appConfig.apiBaseUrl) {
        console.log('🔧 使用配置文件中的API URL:', window.appConfig.apiBaseUrl);
        return window.appConfig.apiBaseUrl;
    }

    // 如果没有配置文件，使用自动检测
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    const currentProtocol = window.location.protocol;

    console.log('🔍 自动检测API URL - 当前环境:', {
        hostname: currentHost,
        port: currentPort,
        protocol: currentProtocol
    });

    // 如果当前页面是通过IP地址访问的，使用相同的IP地址
    if (/^\d+\.\d+\.\d+\.\d+$/.test(currentHost)) {
        const apiUrl = `${currentProtocol}//${currentHost}:3000`;
        console.log('🌐 检测到IP地址访问，使用API URL:', apiUrl);
        return apiUrl;
    }

    // 本地开发环境
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        const apiUrl = 'http://localhost:3000';
        console.log('🏠 检测到本地环境，使用API URL:', apiUrl);
        return apiUrl;
    }

    // 服务器环境 - 使用相同的主机和协议，但端口3000
    const apiUrl = `${currentProtocol}//${currentHost}:3000`;
    console.log('🖥️ 服务器环境，使用API URL:', apiUrl);
    return apiUrl;
}

/**
 * 加载字段标签
 */
async function loadFieldLabels(signal) {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/field-labels`;
        console.log(`加载字段标签: ${url}`);

        // 增加API调用计数
        performanceMetrics.apiCalls++;

        const response = await fetch(url, {
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('字段标签响应:', data);

        if (data.success && data.labels && data.labels.length > 0) {
            // 保存字段标签
            fieldLabels = data.labels;
            console.log(`已加载 ${fieldLabels.length} 个字段标签`);
        } else {
            console.warn('未找到字段标签或标签为空');
            // 使用默认标签
            fieldLabels = [
                { field_key: 'CAS Name', display_name: 'CAS Name', display_order: 30 },
                { field_key: 'Product Family', display_name: 'Product Family', display_order: 40 },
                { field_key: 'Part Number', display_name: 'Part Number', display_order: 50 },
                { field_key: 'MAG', display_name: 'MAG', display_order: 60 },
                { field_key: 'average_score', display_name: 'Score', display_order: 70 }
            ];
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('字段标签请求被取消');
            throw error; // 重新抛出以便上层处理
        } else {
            console.error('加载字段标签出错:', error);
        }
        // 使用默认标签
        fieldLabels = [
            { field_key: 'CAS Name', display_name: 'CAS Name', display_order: 30 },
            { field_key: 'Product Family', display_name: 'Product Family', display_order: 40 },
            { field_key: 'Part Number', display_name: 'Part Number', display_order: 50 },
            { field_key: 'MAG', display_name: 'MAG', display_order: 60 },
            { field_key: 'average_score', display_name: 'Score', display_order: 70 }
        ];
    }
}

/**
 * Load statistics from the backend - 优化版本，基于React最佳实践
 */
async function loadStats(signal) {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/stats`;
        console.log('加载统计信息, API URL:', url);

        // 增加API调用计数
        performanceMetrics.apiCalls++;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('统计信息响应:', data);

        // 保存统计数据
        statsData = data.stats;

        // 更新统计UI
        updateStatsUI();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('统计信息请求被取消');
            throw error; // 重新抛出以便上层处理
        } else {
            console.error('加载统计信息错误:', error);
        }
        statsData = null;
        // 显示默认统计信息
        updateStatsUI();
    }
}

/**
 * 更新统计UI
 */
function updateStatsUI() {
    // 如果有统计数据且不为空
    if (statsData && !statsData.is_empty) {
        if (totalSamplesElement) totalSamplesElement.textContent = statsData.count || 0;
        if (avgScoreElement) avgScoreElement.textContent = statsData.overall_average !== -1 ?
            (statsData.overall_average || 0).toFixed(1) : '-';
        if (productFamiliesElement) productFamiliesElement.textContent = statsData.product_family_count || 0;
        if (magCountElement) magCountElement.textContent = statsData.mag_count || 0;
    } else {
        // 显示空状态
        if (totalSamplesElement) totalSamplesElement.textContent = '0';
        if (avgScoreElement) avgScoreElement.textContent = '-';
        if (productFamiliesElement) productFamiliesElement.textContent = '0';
        if (magCountElement) magCountElement.textContent = '0';
    }
}

/**
 * 初始化表格标题 - Bootstrap版本
 */
function initializeTableHeaders() {
    // 获取表头容器
    const tableHead = document.getElementById('testCasesTableHead');
    if (!tableHead) return;

    // 清空现有内容
    tableHead.innerHTML = '';

    // 创建表头行
    const headerRow = document.createElement('tr');

    // 添加复选框列
    let headerHTML = `
        <th style="width: 50px;">
            <div class="form-check">
                <input type="checkbox" id="selectAll" class="form-check-input">
            </div>
        </th>
        <th style="width: 80px;">ID</th>
        <th style="width: 120px;">Date</th>`;

    // 为每个显示字段添加列
    const displayFields = getDisplayFields();
    displayFields.forEach(field => {
        // 查找字段标签
        const fieldLabel = fieldLabels.find(label => label.field_key === field);
        let displayName = field;

        // 如果找到字段标签，使用其显示名称
        if (fieldLabel) {
            displayName = fieldLabel.display_name;
        }
        // 否则使用默认格式化
        else if (field === 'average_score') {
            displayName = 'Score';
        }

        headerHTML += `<th>${displayName}</th>`;
    });

    // 添加操作列
    headerHTML += `<th style="width: 100px;">Actions</th>`;

    headerRow.innerHTML = headerHTML;

    // 将行添加到表头
    tableHead.appendChild(headerRow);

    // 重新获取selectAll复选框引用
    selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSelectAll);
    }

    console.log("已初始化表格标题");
}

/**
 * 获取要显示的字段 - 适配真实数据
 */
function getDisplayFields() {
    // 如果已经从后端加载了字段标签，使用这些标签
    if (fieldLabels && fieldLabels.length > 0) {
        // 按显示顺序排序
        const sortedLabels = [...fieldLabels].sort((a, b) => a.display_order - b.display_order);
        // 返回字段键
        return sortedLabels.map(label => label.field_key);
    }

    // 默认字段 - 基于API返回的真实数据格式
    return [
        'CAS Name',
        'Product Family',
        'Part Number',
        'MAG',
        'Question Complexity',
        'Question Category',
        'average_score'
    ];
}

/**
 * 加载测试用例数据 - 改进版
 */
async function loadTestCases(signal) {
    console.time('loadTestCases'); // 性能测量

    try {
        console.log('正在加载测试用例...');

        // 重置选择
        selectedIds.clear();
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        updateDeleteSelectedButton();

        // 显示优化的加载状态
        showLoadingState();

        // 并行加载策略 - 同时尝试多个端点
        const apiBaseUrl = getApiBaseUrl();
        const testCasesData = await loadTestCasesWithFallback(apiBaseUrl, signal);

        // 检查数据库是否为空
        if (testCasesData.isEmpty) {
            showEmptyState();
            testCases = [];
            return;
        }

        // 缓存和处理数据
        testCases = processTestCasesData(testCasesData.data);

        // 渲染测试用例
        renderTestCases();
        renderPagination();

        console.timeEnd('loadTestCases');
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('测试用例加载被取消');
            return;
        }
        console.error('加载测试用例错误:', error);
        showErrorState(error);
        console.timeEnd('loadTestCases');
    }
}

// 暴露全局变量和函数供HTML调用
window.loadData = loadData;
window.testCases = testCases;
window.performanceMetrics = performanceMetrics;
window.selectedIds = selectedIds;
window.searchTerm = searchTerm;
window.currentPage = currentPage;
window.pageSize = pageSize;
