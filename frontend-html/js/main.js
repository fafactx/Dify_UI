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

// DOM 元素
const elements = {
    loading: document.getElementById('loading'),
    dashboardView: document.getElementById('dashboard-view'),
    compareView: document.getElementById('compare-view'),
    settingsView: document.getElementById('settings-view'),
    statsCards: document.getElementById('stats-cards'),
    evaluationsTable: document.getElementById('evaluations-table'),
    compareTable: document.getElementById('compare-table'),
    weightSliders: document.getElementById('weight-sliders'),
    searchInput: document.getElementById('search-input'),
    sortOptions: document.getElementById('sort-options'),
    exportCsv: document.getElementById('export-csv'),
    clearCompare: document.getElementById('clear-compare'),
    applyWeights: document.getElementById('apply-weights'),
    resetWeights: document.getElementById('reset-weights'),
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdated: document.getElementById('last-updated'),
    dashboardLink: document.getElementById('dashboard-link'),
    compareLink: document.getElementById('compare-link'),
    settingsLink: document.getElementById('settings-link'),
    detailModal: new bootstrap.Modal(document.getElementById('detail-modal')),
    detailContent: document.getElementById('detail-content')
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
 * 设置事件监听器
 */
function setupEventListeners() {
    // 导航链接
    elements.dashboardLink.addEventListener('click', () => showView('dashboard'));
    elements.compareLink.addEventListener('click', () => showView('compare'));
    elements.settingsLink.addEventListener('click', () => showView('settings'));

    // 搜索输入
    elements.searchInput.addEventListener('input', handleSearch);

    // 排序选项
    elements.sortOptions.addEventListener('click', handleSort);

    // 导出 CSV
    elements.exportCsv.addEventListener('click', handleExportCsv);

    // 清除对比
    elements.clearCompare.addEventListener('click', handleClearCompare);

    // 应用权重
    elements.applyWeights.addEventListener('click', handleApplyWeights);

    // 重置权重
    elements.resetWeights.addEventListener('click', handleResetWeights);

    // 刷新按钮
    elements.refreshBtn.addEventListener('click', loadData);
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
 * 更新统计卡片
 */
function updateStatsCards() {
    if (!state.stats) return;

    const { count, overall_average, dimension_averages } = state.stats;

    // 找出最高评分维度
    let highestDimension = '';
    let highestScore = 0;

    if (dimension_averages) {
        Object.keys(dimension_averages).forEach(dim => {
            if (dim !== 'average_score' && dimension_averages[dim] > highestScore) {
                highestScore = dimension_averages[dim];
                highestDimension = dim;
            }
        });
    }

    // 创建统计卡片 HTML
    const cardsHtml = `
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-primary">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <div class="stat-value">${count || 0}</div>
                    <div class="stat-label">评估总数</div>
                </div>
            </div>
        </div>
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-success">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-value">${overall_average || 0}</div>
                    <div class="stat-label">总平均分</div>
                </div>
            </div>
        </div>
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm">
                <div class="card-body stat-card">
                    <div class="stat-icon text-warning">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stat-value">${highestScore}</div>
                    <div class="stat-label">最高维度: ${formatDimensionName(highestDimension)}</div>
                </div>
            </div>
        </div>
    `;

    // 更新 DOM
    elements.statsCards.innerHTML = cardsHtml;
}

/**
 * 更新评估表格
 */
function updateEvaluationsTable() {
    if (!state.evaluations || state.evaluations.length === 0) {
        elements.evaluationsTable.querySelector('tbody').innerHTML = `
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
    elements.evaluationsTable.querySelector('tbody').innerHTML = rowsHtml;
}

/**
 * 更新图表
 */
function updateCharts() {
    if (!state.stats || !state.stats.dimension_averages) return;

    // 更新雷达图
    updateRadarChart(state.stats.dimension_averages);

    // 更新柱状图
    updateBarChart(state.stats.dimension_averages);
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
    if (state.stats && state.stats.last_updated) {
        const date = new Date(state.stats.last_updated);
        elements.lastUpdated.textContent = `最后更新: ${date.toLocaleString('zh-CN')}`;
    } else {
        elements.lastUpdated.textContent = '最后更新: 未知';
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
            <h6>基本信息</h6>
            <div class="detail-content">
                <p><strong>ID:</strong> ${evaluation.id}</p>
                <p><strong>日期:</strong> ${dateStr} ${timeStr}</p>
                <p><strong>平均分:</strong> ${evaluation.average_score || 0}</p>
            </div>
        </div>

        <div class="detail-section">
            <h6>维度评分</h6>
            <div class="detail-content">
                <div class="row">
                    ${dimensions.map(dim => `
                        <div class="col-md-6 mb-2">
                            <div class="d-flex justify-content-between">
                                <span>${formatDimensionName(dim)}:</span>
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
            <h6>摘要</h6>
            <div class="detail-content">
                <p>${evaluation.summary || '无摘要信息'}</p>
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
