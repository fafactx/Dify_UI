/**
 * Test Cases Helper Functions - 辅助函数
 * 包含渲染、事件处理和其他辅助功能
 */

/**
 * 并行加载测试用例数据，带回退机制
 */
async function loadTestCasesWithFallback(apiBaseUrl, signal) {
    const endpoints = [
        `${apiBaseUrl}/api/evaluations`,
        `${apiBaseUrl}/api/test-cases`
    ];

    // 使用Promise.allSettled来并行尝试所有端点
    const results = await Promise.allSettled(
        endpoints.map(url => fetchWithTimeout(url, 8000, signal))
    );

    // 找到第一个成功的响应
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
            const data = result.value;
            console.log(`成功从端点 ${endpoints[i]} 获取数据`);

            // 检查是否为空
            if (data.is_empty || (data.success === false && data.message?.includes('数据库为空'))) {
                return { isEmpty: true, data: [] };
            }

            return {
                isEmpty: false,
                data: data.data || data.testCases || []
            };
        }
    }

    // 如果所有端点都失败，抛出最后一个错误
    const lastError = results[results.length - 1];
    throw new Error(lastError.reason?.message || '所有API端点都无法访问');
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
 * 处理测试用例数据
 */
function processTestCasesData(rawData) {
    if (!Array.isArray(rawData)) {
        console.warn('测试用例数据不是数组格式:', rawData);
        return [];
    }

    return rawData.map(item => {
        // 标准化数据格式
        let testCase = {
            id: item.id,
            result_key: item.result_key || '',
            timestamp: item.timestamp || '',
            date: item.date || new Date().toISOString(),
            average_score: 0
        };

        // 处理嵌套的数据字段
        let evalData = {};
        if (item.data && typeof item.data === 'string') {
            try {
                evalData = JSON.parse(item.data);
            } catch (e) {
                console.warn(`解析数据失败 ID ${item.id}:`, e);
                evalData = {};
            }
        } else if (item.data && typeof item.data === 'object') {
            evalData = item.data;
        } else {
            evalData = item;
        }

        // 合并数据
        return { ...testCase, ...evalData };
    });
}

/**
 * 显示加载状态
 */
function showLoadingState() {
    const testCasesBody = document.getElementById('testCasesBody');
    if (testCasesBody) {
        testCasesBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="flex justify-center items-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-2"></div>
                        <span>加载测试用例...</span>
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
                <td colspan="8" class="text-center py-4">
                    <div class="bg-gray-50 p-4 rounded text-center">
                        <i class="fas fa-database text-gray-400 text-3xl mb-2"></i>
                        <h4 class="text-lg font-bold text-gray-600">数据库为空</h4>
                        <p class="text-gray-500">还没有测试用例数据</p>
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
                <td colspan="8" class="text-center py-4">
                    <div class="bg-red-50 p-4 rounded text-center">
                        <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-2"></i>
                        <h4 class="text-lg font-bold text-red-800">加载测试用例错误</h4>
                        <p class="text-red-600">${error.message}</p>
                        <button onclick="loadData()" class="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            <i class="fas fa-redo mr-1"></i> 重试
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

// 渲染测试用例 - 简化版本
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
        testCasesBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">${message}</td>
            </tr>
        `;
        return;
    }

    // 分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredTestCases.length);
    const pageTestCases = filteredTestCases.slice(startIndex, endIndex);

    // 简单渲染
    const rows = pageTestCases.map(testCase => {
        return `
            <tr data-id="${testCase.id}">
                <td><input type="checkbox" class="case-checkbox rounded" data-id="${testCase.id}"></td>
                <td>${testCase.id}</td>
                <td>${formatDate(testCase.date || testCase.timestamp)}</td>
                <td>${testCase['CAS Name'] || 'N/A'}</td>
                <td>${testCase['Product Family'] || 'N/A'}</td>
                <td>${testCase['Part Number'] || 'N/A'}</td>
                <td>${testCase.MAG || 'N/A'}</td>
                <td class="font-bold">${testCase.average_score ? testCase.average_score.toFixed(1) : 'N/A'}</td>
                <td>
                    <button class="text-red-500 hover:text-red-700" onclick="deleteTestCase(${testCase.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="text-blue-500 hover:text-blue-700 ml-2" onclick="viewTestCase(${testCase.id})">
                        <i class="fas fa-eye"></i>
                    </button>
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

// 渲染分页控件 - 简化版
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

    // 显示总记录数
    const searchInfo = searchTerm ? ` (搜索: "${searchTerm}")` : '';
    const totalInfo = `共 ${filteredTestCases.length} 条记录${searchInfo}`;

    // 如果只有一页，不显示分页控件
    if (totalPages <= 1) {
        pagination.innerHTML = `<div class="text-gray-600 text-sm mt-2">${totalInfo}</div>`;
        return;
    }

    // 创建分页HTML
    pagination.innerHTML = `
        <div class="flex items-center space-x-2">
            <button id="prevPage" class="px-3 py-1 rounded border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${currentPage === 1 ? 'disabled' : ''}>
                上一页
            </button>
            <span class="text-gray-600">第 ${currentPage} 页，共 ${totalPages} 页</span>
            <button id="nextPage" class="px-3 py-1 rounded border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${currentPage === totalPages ? 'disabled' : ''}>
                下一页
            </button>
        </div>
        <div class="text-gray-600 text-sm mt-2">${totalInfo}</div>
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
