/**
 * Test Cases Helper Functions - 辅助函数
 * 包含渲染、事件处理和其他辅助功能
 */

/**
 * 并行加载测试用例数据，带回退机制 - 修复版
 */
async function loadTestCasesWithFallback(apiBaseUrl, signal) {
    const endpoints = [
        `${apiBaseUrl}/api/evaluations`,
        `${apiBaseUrl}/api/test-cases`
    ];

    console.log('尝试从以下端点加载数据:', endpoints);

    // 使用Promise.allSettled来并行尝试所有端点
    const results = await Promise.allSettled(
        endpoints.map(url => fetchWithTimeout(url, 8000, signal))
    );

    // 找到第一个成功的响应
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
            const data = result.value;
            console.log(`成功从端点 ${endpoints[i]} 获取数据:`, data);

            // 更严格的空数据检查
            const isEmpty = (
                data.is_empty === true ||
                (data.success === false && data.message?.includes('数据库为空')) ||
                (data.success === false && data.message?.includes('请等待数据从 Dify 同步'))
            );

            if (isEmpty) {
                console.log('服务器返回空数据状态');
                return { isEmpty: true, data: [] };
            }

            // 更灵活的数据提取
            let extractedData = [];
            if (data.data && Array.isArray(data.data)) {
                extractedData = data.data;
            } else if (data.testCases && Array.isArray(data.testCases)) {
                extractedData = data.testCases;
            } else if (data.evaluations && Array.isArray(data.evaluations)) {
                extractedData = data.evaluations;
            } else if (Array.isArray(data)) {
                extractedData = data;
            }

            console.log(`从端点 ${endpoints[i]} 提取到 ${extractedData.length} 条数据`);

            return {
                isEmpty: extractedData.length === 0,
                data: extractedData
            };
        } else {
            console.error(`端点 ${endpoints[i]} 失败:`, result.reason);
        }
    }

    // 如果所有端点都失败，抛出详细错误
    const errors = results.map((result, i) => `${endpoints[i]}: ${result.reason?.message || result.reason}`);
    throw new Error(`所有API端点都无法访问:\n${errors.join('\n')}`);
}

/**
 * 带超时的fetch请求
 */
async function fetchWithTimeout(url, timeout = 5000, signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 如果传入了外部signal，监听它的abort事件
    if (signal) {
        signal.addEventListener('abort', () => controller.abort());
    }

    try {
        // 增加API调用计数
        if (window.performanceMetrics) {
            window.performanceMetrics.apiCalls++;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * 处理测试用例数据 - 真实数据格式版本
 */
function processTestCasesData(rawData) {
    if (!Array.isArray(rawData)) {
        console.warn('测试用例数据不是数组格式:', rawData);
        return [];
    }

    console.log(`开始处理 ${rawData.length} 条原始数据`);
    console.log('原始数据示例:', rawData[0]);

    const processedData = rawData.map((item, index) => {
        // 标准化数据格式
        let testCase = {
            id: item.id || index + 1,
            result_key: item.result_key || item.resultKey || `result_${index}`,
            timestamp: item.timestamp || item.date || new Date().toISOString(),
            date: item.date || item.timestamp || new Date().toISOString()
        };

        // 处理嵌套的数据字段 - 适配真实数据格式
        let evalData = {};

        // 如果有data字段且是字符串，尝试解析JSON
        if (item.data && typeof item.data === 'string') {
            try {
                evalData = JSON.parse(item.data);
                console.log(`成功解析ID ${item.id} 的JSON数据`);
            } catch (e) {
                console.warn(`解析数据失败 ID ${item.id}:`, e);
                evalData = {};
            }
        }
        // 如果data字段是对象，直接使用
        else if (item.data && typeof item.data === 'object') {
            evalData = item.data;
        }
        // 否则使用整个item作为数据
        else {
            evalData = { ...item };
            // 移除基础字段，避免重复
            delete evalData.id;
            delete evalData.result_key;
            delete evalData.resultKey;
            delete evalData.timestamp;
            delete evalData.date;
        }

        // 确保关键字段存在
        const finalData = {
            ...testCase,
            'CAS Name': evalData['CAS Name'] || 'N/A',
            'Product Family': evalData['Product Family'] || 'N/A',
            'Part Number': evalData['Part Number'] || 'N/A',
            'MAG': evalData['MAG'] || 'N/A',
            'Question': evalData['Question'] || 'N/A',
            'Answer': evalData['Answer'] || 'N/A',
            'Question Complexity': evalData['Question Complexity'] || 'N/A',
            'Question Category': evalData['Question Category'] || 'N/A',
            'hallucination_control': Number(evalData['hallucination_control']) || 0,
            'quality': Number(evalData['quality']) || 0,
            'professionalism': Number(evalData['professionalism']) || 0,
            'usefulness': Number(evalData['usefulness']) || 0,
            'average_score': Number(evalData['average_score']) || 0
        };

        // 如果没有预计算的平均分，则计算
        if (!finalData.average_score) {
            const scores = [
                finalData.hallucination_control,
                finalData.quality,
                finalData.professionalism,
                finalData.usefulness
            ].filter(score => score > 0);

            if (scores.length > 0) {
                finalData.average_score = scores.reduce((a, b) => a + b, 0) / scores.length;
            }
        }

        // 调试第一条数据
        if (index === 0) {
            console.log('第一条处理后的数据示例:', finalData);
        }

        return finalData;
    });

    console.log(`数据处理完成，共 ${processedData.length} 条`);
    return processedData;
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    const testCasesBody = document.getElementById('testCasesBody');
    if (testCasesBody) {
        testCasesBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <div>加载测试用例...</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * 显示空状态
 */
function showEmptyState() {
    const testCasesBody = document.getElementById('testCasesBody');
    const pagination = document.getElementById('pagination');

    if (testCasesBody) {
        testCasesBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-database"></i>
                        <h5>数据库为空</h5>
                        <p class="text-muted">还没有测试用例数据，请等待Dify工作流生成数据</p>
                        <button onclick="loadData()" class="btn btn-primary btn-sm mt-2">
                            <i class="fas fa-sync-alt me-1"></i>
                            刷新
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    if (pagination) pagination.innerHTML = '';
}

/**
 * 显示错误状态
 */
function showErrorState(error) {
    const testCasesBody = document.getElementById('testCasesBody');
    const pagination = document.getElementById('pagination');

    if (testCasesBody) {
        testCasesBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle text-danger"></i>
                        <h5 class="text-danger">加载测试用例错误</h5>
                        <p class="text-danger">${error.message}</p>
                        <button onclick="loadData()" class="btn btn-danger btn-sm mt-2">
                            <i class="fas fa-redo me-1"></i>
                            重试
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    if (pagination) pagination.innerHTML = '';
}

/**
 * 过滤测试用例
 */
function filterTestCases(cases, term) {
    if (!term) return cases;

    const lowerTerm = term.toLowerCase();
    return cases.filter(testCase => {
        // 搜索基本字段
        if (testCase.id && testCase.id.toString().includes(lowerTerm)) return true;
        if (testCase['CAS Name'] && testCase['CAS Name'].toLowerCase().includes(lowerTerm)) return true;
        if (testCase['Product Family'] && testCase['Product Family'].toLowerCase().includes(lowerTerm)) return true;
        if (testCase['Part Number'] && testCase['Part Number'].toLowerCase().includes(lowerTerm)) return true;
        if (testCase.MAG && testCase.MAG.toLowerCase().includes(lowerTerm)) return true;

        // 搜索问题和答案
        if (testCase.Question && testCase.Question.toLowerCase().includes(lowerTerm)) return true;
        if (testCase.Answer && testCase.Answer.toLowerCase().includes(lowerTerm)) return true;

        return false;
    });
}

// 格式化日期 - 健壮版
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        // 尝试创建日期对象
        const date = new Date(dateString);

        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        // 格式化日期
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
        console.error('日期格式化错误:', error);
        return 'Error';
    }
}

// Update delete selected button visibility
function updateDeleteSelectedButton() {
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectedIds = window.selectedIds || new Set();

    if (deleteSelectedBtn) {
        if (selectedIds.size > 0) {
            deleteSelectedBtn.classList.remove('hidden');
        } else {
            deleteSelectedBtn.classList.add('hidden');
        }
    }
}

// Handle select all checkbox
function handleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const selectedIds = window.selectedIds || new Set();

    if (!selectAllCheckbox) return;

    const isChecked = selectAllCheckbox.checked;

    // Update all checkboxes on the current page
    document.querySelectorAll('.case-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
        const id = parseInt(checkbox.dataset.id);

        if (isChecked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
    });

    updateDeleteSelectedButton();
}

// Handle individual checkbox change
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const id = parseInt(checkbox.dataset.id);
    const selectedIds = window.selectedIds || new Set();
    const selectAllCheckbox = document.getElementById('selectAll');

    if (checkbox.checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }

    updateDeleteSelectedButton();
}

// Show delete confirmation modal
function showDeleteConfirmation() {
    const selectedIds = window.selectedIds || new Set();
    const count = selectedIds.size;
    const messageElement = document.getElementById('confirmationMessage');
    const confirmationModal = document.getElementById('confirmationModal');

    if (messageElement) {
        messageElement.textContent = `Are you sure you want to delete ${count} selected test case${count !== 1 ? 's' : ''}?`;
    }
    if (confirmationModal) {
        confirmationModal.style.display = 'flex';
    }
}

// Hide confirmation modal
function hideConfirmationModal() {
    const confirmationModal = document.getElementById('confirmationModal');
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}

// Show delete range modal
function showDeleteRangeModal() {
    const deleteRangeModal = document.getElementById('deleteRangeModal');
    if (deleteRangeModal) {
        deleteRangeModal.style.display = 'flex';
    }
}

// Hide delete range modal
function hideDeleteRangeModal() {
    const deleteRangeModal = document.getElementById('deleteRangeModal');
    if (deleteRangeModal) {
        deleteRangeModal.style.display = 'none';
    }
}

// 渲染测试用例 - Bootstrap版本
function renderTestCases() {
    const testCasesBody = document.getElementById('testCasesBody');
    const testCases = window.testCases || [];
    const searchTerm = window.searchTerm || '';
    const currentPage = window.currentPage || 1;
    const pageSize = window.pageSize || 10;

    if (!testCasesBody) return;

    // 应用搜索过滤
    let filteredTestCases = testCases;
    if (searchTerm) {
        filteredTestCases = filterTestCases(testCases, searchTerm);
        console.log(`搜索 "${searchTerm}" 找到 ${filteredTestCases.length} 个结果`);
    }

    if (filteredTestCases.length === 0) {
        const message = searchTerm ? `没有找到包含 "${searchTerm}" 的测试用例` : '没有找到测试用例';
        const displayFields = window.getDisplayFields ? window.getDisplayFields() : [];
        const totalCols = 3 + displayFields.length + 1; // checkbox + id + date + fields + actions

        testCasesBody.innerHTML = `
            <tr>
                <td colspan="${totalCols}" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h5>${message}</h5>
                        <p class="text-muted">Try adjusting your search criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // 分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredTestCases.length);
    const pageTestCases = filteredTestCases.slice(startIndex, endIndex);

    // 获取要显示的字段
    const displayFields = window.getDisplayFields ? window.getDisplayFields() : [
        'CAS Name',
        'Product Family',
        'Part Number',
        'MAG',
        'Question Complexity',
        'Question Category',
        'average_score'
    ];

    // Bootstrap样式渲染 - 动态字段
    const rows = pageTestCases.map(testCase => {
        const scoreClass = testCase.average_score >= 80 ? 'text-success' :
                          testCase.average_score >= 60 ? 'text-warning' : 'text-danger';

        // 构建动态字段列
        const fieldCells = displayFields.map(field => {
            let value = testCase[field];

            // 特殊处理分数字段
            if (field === 'average_score') {
                return `
                    <td>
                        <span class="fw-bold ${scoreClass}">
                            ${value ? Number(value).toFixed(1) : 'N/A'}
                        </span>
                    </td>
                `;
            }

            // 处理其他字段
            if (value === undefined || value === null || value === '') {
                value = '<span class="text-muted">N/A</span>';
            }

            return `<td>${value}</td>`;
        }).join('');

        return `
            <tr data-id="${testCase.id}">
                <td>
                    <div class="form-check">
                        <input class="form-check-input case-checkbox" type="checkbox" data-id="${testCase.id}">
                    </div>
                </td>
                <td><span class="badge bg-primary">${testCase.id}</span></td>
                <td><small class="text-muted">${formatDate(testCase.date || testCase.timestamp)}</small></td>
                ${fieldCells}
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-danger btn-action" onclick="deleteTestCase(${testCase.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-action" onclick="viewTestCase(${testCase.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    testCasesBody.innerHTML = rows;

    // 添加复选框事件监听器
    document.querySelectorAll('.case-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

// 渲染分页控件 - Bootstrap版本
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const testCases = window.testCases || [];
    const searchTerm = window.searchTerm || '';
    const currentPage = window.currentPage || 1;
    const pageSize = window.pageSize || 10;

    if (!pagination) return;

    // 计算过滤后的数据
    let filteredTestCases = testCases;
    if (searchTerm) {
        filteredTestCases = filterTestCases(testCases, searchTerm);
    }

    const totalPages = Math.ceil(filteredTestCases.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredTestCases.length);

    // 显示总记录数
    const searchInfo = searchTerm ? ` (搜索: "${searchTerm}")` : '';
    const totalInfo = `显示 ${startIndex}-${endIndex} 条，共 ${filteredTestCases.length} 条记录${searchInfo}`;

    // 如果只有一页，只显示记录信息
    if (totalPages <= 1) {
        pagination.innerHTML = `
            <div class="text-muted">
                <small>${totalInfo}</small>
            </div>
        `;
        return;
    }

    // 创建Bootstrap分页HTML
    pagination.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="text-muted">
                <small>${totalInfo}</small>
            </div>
            <nav aria-label="Test cases pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i>
                            <span class="d-none d-sm-inline ms-1">Previous</span>
                        </button>
                    </li>
                    <li class="page-item active">
                        <span class="page-link">
                            ${currentPage} / ${totalPages}
                        </span>
                    </li>
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>
                            <span class="d-none d-sm-inline me-1">Next</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    `;

    // 添加事件监听器
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    if (prevPageBtn && !prevPageBtn.disabled) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                window.currentPage = currentPage - 1;
                renderTestCases();
                renderPagination();
            }
        });
    }

    if (nextPageBtn && !nextPageBtn.disabled) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                window.currentPage = currentPage + 1;
                renderTestCases();
                renderPagination();
            }
        });
    }
}

// 防抖搜索
let searchTimeout = null;

function debouncedSearch(event) {
    const value = event.target.value;

    // 清除之前的定时器
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // 设置新的定时器 - 300ms延迟
    searchTimeout = setTimeout(() => {
        handleSearch(value);
    }, 300);
}

function handleSearch(searchValue) {
    window.searchTerm = searchValue || '';
    window.currentPage = 1; // 重置到第一页

    // 重新渲染
    renderTestCases();
    renderPagination();
}

// 简单的查看测试用例函数
function viewTestCase(id) {
    const testCases = window.testCases || [];
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) {
        alert('未找到测试用例');
        return;
    }

    // 简单的alert显示，可以后续改为模态框
    const info = `
测试用例 #${testCase.id}
日期: ${formatDate(testCase.date || testCase.timestamp)}
CAS名称: ${testCase['CAS Name'] || 'N/A'}
产品系列: ${testCase['Product Family'] || 'N/A'}
零件编号: ${testCase['Part Number'] || 'N/A'}
MAG: ${testCase.MAG || 'N/A'}
平均分: ${testCase.average_score ? testCase.average_score.toFixed(1) : 'N/A'}
问题: ${testCase.Question || 'N/A'}
回答: ${testCase.Answer || 'N/A'}
    `;

    alert(info);
}

// 删除测试用例的占位函数
async function deleteTestCase(id) {
    if (!confirm(`确定要删除测试用例 #${id} 吗？`)) {
        return;
    }

    console.log(`删除测试用例 #${id} - 功能待实现`);
    alert('删除功能待实现');
}

async function handleDelete() {
    console.log('批量删除功能待实现');
    alert('批量删除功能待实现');
}

async function handleDeleteRange() {
    console.log('范围删除功能待实现');
    alert('范围删除功能待实现');
}
