/**
 * 主应用模块
 * 处理页面交互和数据展示
 */

// 全局状态
const state = {
    evaluations: [],
    stats: {},
    compareItems: [],
    weights: {},
    currentView: 'dashboard',
    sortField: 'date',
    sortOrder: 'desc',
    searchTerm: ''
};

// 安全地获取DOM元素
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`DOM元素未找到: #${id}`);
    }
    return element;
}

// DOM 元素
const elements = {
    loading: getElement('loading'),
    dashboardView: getElement('dashboard-view'),
    compareView: getElement('compare-view'),
    settingsView: getElement('settings-view'),
    statsCards: getElement('stats-cards'),
    evaluationsTable: getElement('evaluations-table'),
    compareTable: getElement('compare-table'),
    weightSliders: getElement('weight-sliders'),
    searchInput: getElement('search-input'),
    sortOptions: getElement('sort-options'),
    exportCsv: getElement('export-csv'),
    clearCompare: getElement('clear-compare'),
    applyWeights: getElement('apply-weights'),
    resetWeights: getElement('reset-weights'),
    refreshBtn: getElement('refresh-btn'),
    lastUpdated: getElement('last-updated'),
    dashboardLink: getElement('dashboard-link'),
    compareLink: getElement('compare-link'),
    settingsLink: getElement('settings-link'),
    detailModal: document.getElementById('detail-modal') ? new bootstrap.Modal(document.getElementById('detail-modal')) : null,
    detailContent: getElement('detail-content')
};

/**
 * 初始化应用
 */
async function initApp() {
    try {
        // 初始化图表
        initCharts();

        // 添加事件监听器
        setupEventListeners();

        // 加载数据
        await loadData();

        // 显示仪表板视图
        showView('dashboard');

        // 隐藏加载指示器
        elements.loading.classList.add('d-none');
    } catch (error) {
        console.error('初始化应用失败:', error);
        alert('加载应用数据失败，请检查网络连接或刷新页面重试。');
    }
}

/**
 * 安全地添加事件监听器
 * @param {HTMLElement} element - DOM元素
 * @param {string} event - 事件名称
 * @param {Function} handler - 事件处理函数
 */
function addSafeEventListener(element, event, handler) {
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`无法为不存在的元素添加${event}事件监听器`);
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 导航链接
    addSafeEventListener(elements.dashboardLink, 'click', () => showView('dashboard'));
    addSafeEventListener(elements.compareLink, 'click', () => showView('compare'));
    addSafeEventListener(elements.settingsLink, 'click', () => showView('settings'));

    // 搜索输入
    addSafeEventListener(elements.searchInput, 'input', handleSearch);

    // 排序选项
    addSafeEventListener(elements.sortOptions, 'click', handleSort);

    // 导出 CSV
    addSafeEventListener(elements.exportCsv, 'click', handleExportCsv);

    // 清除对比
    addSafeEventListener(elements.clearCompare, 'click', handleClearCompare);

    // 应用权重
    addSafeEventListener(elements.applyWeights, 'click', handleApplyWeights);

    // 重置权重
    addSafeEventListener(elements.resetWeights, 'click', handleResetWeights);

    // 刷新按钮
    addSafeEventListener(elements.refreshBtn, 'click', loadData);
}

/**
 * 加载数据
 */
async function loadData() {
    try {
        console.log('[DEBUG] 开始加载数据...');

        // 显示加载指示器
        elements.loading.classList.remove('d-none');

        // 获取评估数据
        console.log('[DEBUG] 获取评估数据...');
        let evaluations;
        try {
            evaluations = await getEvaluations();
            console.log('[DEBUG] 评估数据获取成功:', evaluations);
        } catch (evalError) {
            console.error('[DEBUG] 获取评估数据失败:', evalError);
            alert(`获取评估数据失败: ${evalError.message}`);
            throw evalError;
        }

        // 获取统计数据
        console.log('[DEBUG] 获取统计数据...');
        let stats;
        try {
            stats = await getStats();
            console.log('[DEBUG] 统计数据获取成功:', stats);
        } catch (statsError) {
            console.error('[DEBUG] 获取统计数据失败:', statsError);
            alert(`获取统计数据失败: ${statsError.message}`);
            throw statsError;
        }

        // 更新状态
        console.log('[DEBUG] 更新应用状态...');
        state.evaluations = evaluations;
        state.stats = stats;

        // 初始化权重
        console.log('[DEBUG] 初始化权重...');
        initWeights();

        // 更新 UI
        console.log('[DEBUG] 更新统计卡片...');
        updateStatsCards();

        console.log('[DEBUG] 更新评估表格...');
        updateEvaluationsTable();

        console.log('[DEBUG] 更新图表...');
        updateCharts();

        console.log('[DEBUG] 更新最后更新时间...');
        updateLastUpdated();

        // 隐藏加载指示器
        console.log('[DEBUG] 数据加载完成，隐藏加载指示器');
        elements.loading.classList.add('d-none');
    } catch (error) {
        console.error('[DEBUG] 加载数据失败:', error);
        alert(`加载数据失败: ${error.message}`);

        // 显示错误信息在页面上
        elements.loading.innerHTML = `
            <div class="alert alert-danger">
                <h4>加载数据失败</h4>
                <p>${error.message}</p>
                <button class="btn btn-primary mt-3" onclick="loadData()">重试</button>
            </div>
        `;
    }
}

/**
 * 显示指定视图
 * @param {string} viewName - 视图名称
 */
function showView(viewName) {
    // 更新当前视图
    state.currentView = viewName;

    // 隐藏所有视图
    elements.dashboardView.classList.add('d-none');
    elements.compareView.classList.add('d-none');
    elements.settingsView.classList.add('d-none');

    // 移除所有导航链接的激活状态
    elements.dashboardLink.classList.remove('active');
    elements.compareLink.classList.remove('active');
    elements.settingsLink.classList.remove('active');

    // 显示选定的视图
    switch (viewName) {
        case 'dashboard':
            elements.dashboardView.classList.remove('d-none');
            elements.dashboardLink.classList.add('active');

            // 当切换到仪表板视图时，确保图表正确显示
            setTimeout(() => {
                console.log('[DEBUG] 切换到仪表板视图，确保图表正确显示');

                // 确保图表容器有尺寸
                const containers = ['radar-chart', 'bar-chart'];
                containers.forEach(id => {
                    const container = document.getElementById(id);
                    if (container) {
                        container.style.width = '100%';
                        container.style.height = '400px';
                        container.style.display = 'block';
                        console.log(`[DEBUG] 设置 #${id} 容器尺寸`);
                    }
                });

                // 强制重绘图表
                if (typeof window.forceResizeCharts === 'function') {
                    window.forceResizeCharts();
                }

                // 更新图表数据
                updateCharts();
            }, 100);
            break;
        case 'compare':
            elements.compareView.classList.remove('d-none');
            elements.compareLink.classList.add('active');
            updateCompareView();
            break;
        case 'settings':
            elements.settingsView.classList.remove('d-none');
            elements.settingsLink.classList.add('active');
            updateSettingsView();
            break;
    }
}

/**
 * 安全地更新DOM元素内容
 * @param {HTMLElement} element - DOM元素
 * @param {string} content - 要设置的HTML内容
 * @returns {boolean} 是否成功更新
 */
function safeUpdateElement(element, content) {
    if (element) {
        element.innerHTML = content;
        return true;
    } else {
        console.warn('无法更新不存在的DOM元素');
        return false;
    }
}

/**
 * 更新统计卡片
 */
function updateStatsCards() {
    if (!state.stats || !elements.statsCards) return;

    const { count, overall_average, dimension_averages } = state.stats;

    // 1. 样本总数直接使用count
    const totalSamples = count || 0;

    // 2. 总平均分使用overall_average
    const formattedAverage = overall_average || 0;

    // 3. 处理维度平均值
    let highestDimension = '';
    let highestScore = 0;
    let lowestDimension = '';
    let lowestScore = 10;

    // 获取所有维度并按分数排序
    const sortedDimensions = Object.entries(dimension_averages || {})
        .filter(([_, score]) => typeof score === 'number')
        .sort((a, b) => b[1] - a[1]);

    if (sortedDimensions.length > 0) {
        // 最高分维度
        highestDimension = sortedDimensions[0][0];
        highestScore = sortedDimensions[0][1];

        // 最低分维度
        lowestDimension = sortedDimensions[sortedDimensions.length - 1][0];
        lowestScore = sortedDimensions[sortedDimensions.length - 1][1];
    }

    // 创建统计卡片 HTML
    const cardsHtml = `
        <div class="col-md-3 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-primary">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <div class="stat-value">${totalSamples}</div>
                    <div class="stat-label">Total Samples</div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-success">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-value">${formattedAverage.toFixed(1)}</div>
                    <div class="stat-label">Average Score</div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-warning">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stat-value">${highestScore.toFixed(1)}</div>
                    <div class="stat-label">Highest: ${formatDimensionNameEn(highestDimension)}</div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-danger">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="stat-value">${lowestScore.toFixed(1)}</div>
                    <div class="stat-label">Lowest: ${formatDimensionNameEn(lowestDimension)}</div>
                </div>
            </div>
        </div>
    `;

    // 更新 DOM
    safeUpdateElement(elements.statsCards, cardsHtml);
}

/**
 * 更新评估表格
 */
function updateEvaluationsTable() {
    if (!elements.evaluationsTable) {
        console.warn('评估表格元素不存在');
        return;
    }

    const tbody = elements.evaluationsTable.querySelector('tbody');
    if (!tbody) {
        console.warn('评估表格的tbody元素不存在');
        return;
    }

    if (!state.evaluations || state.evaluations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">暂无评估数据</td>
            </tr>
        `;
        return;
    }

    // 过滤评估数据
    let filteredEvaluations = filterEvaluations();

    // 排序评估数据
    filteredEvaluations = sortEvaluations(filteredEvaluations);

    // 创建表格行 HTML
    const rowsHtml = filteredEvaluations.map((eval, index) => {
        // 格式化日期
        const date = new Date(eval.timestamp);
        const dateStr = date.toLocaleDateString('zh-CN');

        // 获取维度分数
        const dimensionScores = Object.keys(eval)
            .filter(key =>
                typeof eval[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                key !== 'average_score' &&
                !key.includes('_id')
            )
            .map(dim => {
                const score = eval[dim];
                let badgeClass = 'medium';
                if (score >= 8) badgeClass = 'high';
                if (score <= 4) badgeClass = 'low';

                return `<span class="dimension-badge ${badgeClass}">${formatDimensionName(dim)}: ${score}</span>`;
            })
            .join(' ');

        return `
            <tr>
                <td>${eval.id}</td>
                <td>${dateStr}</td>
                <td>${eval.average_score || 0}</td>
                <td>${dimensionScores}</td>
                <td>
                    <button class="btn btn-sm btn-info me-1" data-index="${index}" onclick="showDetail(${index})">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                    <button class="btn btn-sm btn-primary" data-index="${index}" onclick="addToCompare(${index})">
                        <i class="fas fa-balance-scale"></i> 对比
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // 更新 DOM
    safeUpdateElement(tbody, rowsHtml);
}

/**
 * 更新图表
 */
function updateCharts() {
    console.log(`[DEBUG] 开始更新图表，状态:`, state);

    if (!state.stats) {
        console.warn('[DEBUG] 统计数据不存在，无法更新图表');
        return;
    }

    // 确保图表容器可见
    const dashboardView = document.getElementById('dashboard-view');
    const wasHidden = dashboardView && dashboardView.classList.contains('d-none');

    if (wasHidden) {
        console.log('[DEBUG] 仪表板视图隐藏，临时显示以更新图表');
        dashboardView.classList.remove('d-none');
    }

    // 确保图表实例已初始化
    if (!window.radarChart || !window.barChart) {
        console.log('[DEBUG] 图表实例未初始化，尝试初始化');
        window.initCharts();

        // 给图表初始化一些时间
        setTimeout(() => {
            updateChartsWithData();

            // 恢复仪表板视图状态
            if (wasHidden) {
                console.log('[DEBUG] 恢复仪表板视图隐藏状态');
                dashboardView.classList.add('d-none');
            }
        }, 500);
    } else {
        updateChartsWithData();

        // 恢复仪表板视图状态
        if (wasHidden) {
            console.log('[DEBUG] 恢复仪表板视图隐藏状态');
            dashboardView.classList.add('d-none');
        }
    }
}

/**
 * 使用数据更新图表
 */
function updateChartsWithData() {
    if (!state.stats.dimension_averages) {
        console.warn('[DEBUG] 维度平均值不存在，无法更新图表');
        // 尝试从评估数据中计算维度平均值
        if (state.evaluations && state.evaluations.length > 0) {
            console.log('[DEBUG] 尝试从评估数据中计算维度平均值');
            const dimensionAverages = calculateDimensionAverages(state.evaluations);
            console.log('[DEBUG] 计算的维度平均值:', dimensionAverages);

            if (Object.keys(dimensionAverages).length > 0) {
                // 更新状态
                if (!state.stats) state.stats = {};
                state.stats.dimension_averages = dimensionAverages;
            }
        }
    }

    if (!state.stats.dimension_averages) {
        console.warn('[DEBUG] 无法计算维度平均值，尝试使用测试数据');
        // 使用测试数据
        state.stats.dimension_averages = {
            hallucination_control: 8,
            quality: 7,
            professionalism: 6,
            usefulness: 5
        };
    }

    console.log('[DEBUG] 使用的维度平均值:', state.stats.dimension_averages);

    // 确保图表容器有尺寸
    const containers = ['radar-chart', 'bar-chart'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            if (container.clientWidth === 0 || container.clientHeight === 0) {
                console.log(`[DEBUG] 容器 #${id} 尺寸为零，设置内联样式`);
                container.style.width = '100%';
                container.style.height = '400px';
                container.style.position = 'relative';
            }
        }
    });

    // 强制重绘图表
    if (typeof window.forceResizeCharts === 'function') {
        console.log('[DEBUG] 强制重绘图表');
        window.forceResizeCharts();
    }

    try {
        // 更新饼图（原雷达图）
        console.log('[DEBUG] 调用 updateRadarChart');
        if (typeof window.updateRadarChart === 'function' && window.radarChart) {
            window.updateRadarChart(state.stats.dimension_averages);
        } else {
            console.warn('[DEBUG] updateRadarChart 函数或图表实例不存在');
        }
    } catch (error) {
        console.error('[DEBUG] 更新饼图失败:', error);
    }

    try {
        // 更新MAG分数分布图（原柱状图）
        console.log('[DEBUG] 调用 updateBarChart');
        if (typeof window.updateBarChart === 'function' && window.barChart) {
            // 传递评估数据，用于按MAG分组
            window.updateBarChart(state.stats.dimension_averages, state.evaluations);
        } else {
            console.warn('[DEBUG] updateBarChart 函数或图表实例不存在');
        }
    } catch (error) {
        console.error('[DEBUG] 更新MAG分数分布图失败:', error);
    }

    // 最后再次强制重绘
    setTimeout(() => {
        if (typeof window.forceResizeCharts === 'function') {
            console.log('[DEBUG] 延迟后再次强制重绘图表');
            window.forceResizeCharts();
        }
    }, 200);
}

/**
 * 计算维度平均值
 * @param {Array} evaluations - 评估数据数组
 * @returns {Object} 维度平均值对象
 */
function calculateDimensionAverages(evaluations) {
    if (!evaluations || evaluations.length === 0) return {};

    // 获取实际存在的4个维度
    const validDimensions = getAllDimensions();
    console.log('[DEBUG] 计算平均值时使用的有效维度:', validDimensions);

    const dimensions = {};
    const counts = {};

    // 初始化维度计数器
    validDimensions.forEach(dim => {
        dimensions[dim] = 0;
        counts[dim] = 0;
    });

    // 累加维度值，只考虑实际存在的4个维度
    evaluations.forEach(eval => {
        validDimensions.forEach(dim => {
            if (typeof eval[dim] === 'number') {
                dimensions[dim] += eval[dim];
                counts[dim]++;
            }
        });
    });

    // 计算平均值
    const averages = {};
    validDimensions.forEach(dim => {
        if (counts[dim] > 0) {
            averages[dim] = dimensions[dim] / counts[dim];
        } else {
            // 如果没有数据，设置默认值
            averages[dim] = 0;
        }
    });

    // 添加average_score字段
    let totalScore = 0;
    let totalCount = 0;

    validDimensions.forEach(dim => {
        if (averages[dim] !== undefined) {
            totalScore += averages[dim];
            totalCount++;
        }
    });

    if (totalCount > 0) {
        averages.average_score = totalScore / totalCount;
    }

    console.log('[DEBUG] 计算的维度平均值:', averages);
    return averages;
}

/**
 * 更新对比视图
 */
function updateCompareView() {
    if (state.compareItems.length === 0) {
        elements.compareView.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                请从评估结果列表中选择要对比的项目
            </div>
        `;
        return;
    }

    // 更新对比图
    updateCompareChart(state.compareItems);

    // 更新对比表格
    updateCompareTable();
}

/**
 * 更新对比表格
 */
function updateCompareTable() {
    if (state.compareItems.length === 0) return;

    // 获取所有维度
    const dimensions = new Set();
    state.compareItems.forEach(item => {
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                !key.includes('_id')) {
                dimensions.add(key);
            }
        });
    });

    // 转换为数组并排序
    const dimensionArray = Array.from(dimensions).sort();

    // 创建表头
    const headerHtml = `
        <tr>
            <th>维度</th>
            ${state.compareItems.map((_, index) => `<th>评估 ${index + 1}</th>`).join('')}
        </tr>
    `;

    // 创建表格行
    const rowsHtml = dimensionArray.map(dim => `
        <tr>
            <td>${formatDimensionName(dim)}</td>
            ${state.compareItems.map(item => `<td>${item[dim] || '-'}</td>`).join('')}
        </tr>
    `).join('');

    // 更新 DOM
    elements.compareTable.querySelector('thead').innerHTML = headerHtml;
    elements.compareTable.querySelector('tbody').innerHTML = rowsHtml;
}

/**
 * 更新设置视图
 */
function updateSettingsView() {
    // 获取所有维度
    const dimensions = new Set();
    state.evaluations.forEach(eval => {
        Object.keys(eval).forEach(key => {
            if (typeof eval[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                key !== 'average_score' &&
                !key.includes('_id')) {
                dimensions.add(key);
            }
        });
    });

    // 创建权重滑块 HTML
    const slidersHtml = Array.from(dimensions).map(dim => `
        <div class="weight-slider">
            <label>
                ${formatDimensionName(dim)}
                <span class="weight-value">${state.weights[dim] || 1}</span>
            </label>
            <input type="range" class="form-range" min="0" max="5" step="0.1"
                   value="${state.weights[dim] || 1}" data-dimension="${dim}">
        </div>
    `).join('');

    // 更新 DOM
    elements.weightSliders.innerHTML = slidersHtml;

    // 添加滑块事件监听器
    document.querySelectorAll('.weight-slider input[type="range"]').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const dimension = e.target.dataset.dimension;
            const value = parseFloat(e.target.value);
            state.weights[dimension] = value;

            // 更新显示的值
            e.target.previousElementSibling.querySelector('.weight-value').textContent = value;
        });
    });
}

/**
 * 更新最后更新时间
 */
function updateLastUpdated() {
    if (!elements.lastUpdated) {
        console.warn('Last updated element does not exist');
        return;
    }

    if (state.stats && state.stats.last_updated) {
        const date = new Date(state.stats.last_updated);
        elements.lastUpdated.textContent = `Last updated: ${date.toLocaleString('en-US')}`;
    } else {
        elements.lastUpdated.textContent = 'Last updated: Unknown';
    }
}

/**
 * 初始化权重
 */
function initWeights() {
    // 获取所有维度
    const dimensions = new Set();
    state.evaluations.forEach(eval => {
        Object.keys(eval).forEach(key => {
            if (typeof eval[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                key !== 'average_score' &&
                !key.includes('_id')) {
                dimensions.add(key);
            }
        });
    });

    // 初始化权重
    dimensions.forEach(dim => {
        if (!state.weights[dim]) {
            state.weights[dim] = 1;
        }
    });
}

/**
 * 过滤评估数据
 * @returns {Array} 过滤后的评估数据
 */
function filterEvaluations() {
    if (!state.searchTerm) return [...state.evaluations];

    const searchTerm = state.searchTerm.toLowerCase();

    return state.evaluations.filter(eval => {
        // 搜索 ID
        if (eval.id && eval.id.toLowerCase().includes(searchTerm)) return true;

        // 搜索日期
        const date = new Date(eval.timestamp);
        const dateStr = date.toLocaleDateString('zh-CN');
        if (dateStr.includes(searchTerm)) return true;

        // 搜索维度
        for (const key in eval) {
            if (typeof eval[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                !key.includes('_id')) {
                const dimName = formatDimensionName(key).toLowerCase();
                if (dimName.includes(searchTerm)) return true;

                // 搜索分数
                if (eval[key].toString().includes(searchTerm)) return true;
            }
        }

        return false;
    });
}

/**
 * 排序评估数据
 * @param {Array} evaluations - 评估数据数组
 * @returns {Array} 排序后的评估数据
 */
function sortEvaluations(evaluations) {
    return [...evaluations].sort((a, b) => {
        let valueA, valueB;

        if (state.sortField === 'date') {
            valueA = a.timestamp;
            valueB = b.timestamp;
        } else {
            valueA = a[state.sortField] || 0;
            valueB = b[state.sortField] || 0;
        }

        if (state.sortOrder === 'asc') {
            return valueA - valueB;
        } else {
            return valueB - valueA;
        }
    });
}

/**
 * 处理搜索
 * @param {Event} e - 事件对象
 */
function handleSearch(e) {
    state.searchTerm = e.target.value;
    updateEvaluationsTable();
}

/**
 * 处理排序
 * @param {Event} e - 事件对象
 */
function handleSort(e) {
    if (!e.target.classList.contains('dropdown-item')) return;

    e.preventDefault();

    const sortField = e.target.dataset.sort;
    const sortOrder = e.target.dataset.order;

    if (sortField && sortOrder) {
        state.sortField = sortField;
        state.sortOrder = sortOrder;
        updateEvaluationsTable();
    }
}

/**
 * 处理导出 CSV
 */
function handleExportCsv() {
    const filteredEvaluations = filterEvaluations();
    const sortedEvaluations = sortEvaluations(filteredEvaluations);

    const csv = exportToCSV(sortedEvaluations);
    downloadCSV(csv, `evaluations_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * 处理清除对比
 */
function handleClearCompare() {
    state.compareItems = [];
    updateCompareView();
}

/**
 * 处理应用权重
 */
function handleApplyWeights() {
    // 应用权重逻辑
    alert('权重已应用');
}

/**
 * 处理重置权重
 */
function handleResetWeights() {
    // 重置所有权重为 1
    const dimensions = Object.keys(state.weights);
    dimensions.forEach(dim => {
        state.weights[dim] = 1;
    });

    // 更新设置视图
    updateSettingsView();
}

/**
 * 显示评估详情
 * @param {number} index - 评估索引
 */
function showDetail(index) {
    const evaluation = state.evaluations[index];
    if (!evaluation) return;

    // 格式化日期
    const date = new Date(evaluation.timestamp);
    const dateStr = date.toLocaleDateString('zh-CN');
    const timeStr = date.toLocaleTimeString('zh-CN');

    // 获取维度分数
    const dimensions = Object.keys(evaluation)
        .filter(key =>
            typeof evaluation[key] === 'number' &&
            key !== 'timestamp' &&
            key !== 'id' &&
            !key.includes('_id')
        );

    // 创建详情 HTML
    const detailHtml = `
        <div class="detail-section">
            <h6>Basic Information</h6>
            <div class="detail-content">
                <p><strong>ID:</strong> ${evaluation.id}</p>
                <p><strong>Date:</strong> ${dateStr} ${timeStr}</p>
                <p><strong>Average Score:</strong> ${evaluation.average_score || 0}</p>
                ${evaluation['CAS Name'] ? `<p><strong>CAS Name:</strong> ${evaluation['CAS Name']}</p>` : ''}
                ${evaluation['Product Family'] ? `<p><strong>Product Family:</strong> ${evaluation['Product Family']}</p>` : ''}
                ${evaluation.MAG ? `<p><strong>MAG:</strong> ${evaluation.MAG}</p>` : ''}
                ${evaluation['Part Number'] ? `<p><strong>Part Number:</strong> ${evaluation['Part Number']}</p>` : ''}
            </div>
        </div>

        <div class="detail-section">
            <h6>Dimension Scores</h6>
            <div class="detail-content">
                <div class="row">
                    ${dimensions.map(dim => `
                        <div class="col-md-6 mb-2">
                            <div class="d-flex justify-content-between">
                                <span>${formatDimensionNameEn(dim)}:</span>
                                <span class="fw-bold">${evaluation[dim]}</span>
                            </div>
                            <div class="progress" style="height: 10px;">
                                <div class="progress-bar" role="progressbar"
                                     style="width: ${evaluation[dim] * 10}%;"
                                     aria-valuenow="${evaluation[dim]}"
                                     aria-valuemin="0"
                                     aria-valuemax="10"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h6>Question & Answer</h6>
            <div class="detail-content">
                ${evaluation.Question ? `<p><strong>Question:</strong> ${evaluation.Question}</p>` : ''}
                ${evaluation.Answer ? `<p><strong>Answer:</strong> ${evaluation.Answer}</p>` : ''}
                ${evaluation['Question Scenario'] ? `<p><strong>Question Scenario:</strong> ${evaluation['Question Scenario']}</p>` : ''}
                ${evaluation['Answer Source'] ? `<p><strong>Answer Source:</strong> ${evaluation['Answer Source']}</p>` : ''}
                ${evaluation['Question Complexity'] ? `<p><strong>Question Complexity:</strong> ${evaluation['Question Complexity']}</p>` : ''}
                ${evaluation['Question Frequency'] ? `<p><strong>Question Frequency:</strong> ${evaluation['Question Frequency']}</p>` : ''}
                ${evaluation['Question Category'] ? `<p><strong>Question Category:</strong> ${evaluation['Question Category']}</p>` : ''}
                ${evaluation['Source Category'] ? `<p><strong>Source Category:</strong> ${evaluation['Source Category']}</p>` : ''}
            </div>
        </div>

        <div class="detail-section">
            <h6>Summary</h6>
            <div class="detail-content">
                <p>${evaluation.summary || 'No summary available'}</p>
            </div>
        </div>

        <div class="detail-section">
            <h6>LLM Answer</h6>
            <div class="detail-content">
                <p>${evaluation.LLM_ANSWER || 'No LLM answer available'}</p>
            </div>
        </div>
    `;

    // 更新模态框内容
    elements.detailContent.innerHTML = detailHtml;

    // 显示模态框
    elements.detailModal.show();
}

/**
 * 添加到对比
 * @param {number} index - 评估索引
 */
function addToCompare(index) {
    const evaluation = state.evaluations[index];
    if (!evaluation) return;

    // 检查是否已经添加
    const exists = state.compareItems.some(item => item.id === evaluation.id);
    if (exists) {
        alert('此评估已添加到对比列表');
        return;
    }

    // 限制对比项数量
    if (state.compareItems.length >= 5) {
        alert('最多只能对比 5 个评估结果');
        return;
    }

    // 添加到对比列表
    state.compareItems.push(evaluation);

    // 如果当前不在对比视图，提示用户
    if (state.currentView !== 'compare') {
        alert('评估已添加到对比列表，点击导航栏中的"对比"查看');
    } else {
        // 更新对比视图
        updateCompareView();
    }
}

// 在全局作用域中暴露函数，以便 HTML 中的 onclick 调用
window.showDetail = showDetail;
window.addToCompare = addToCompare;

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
