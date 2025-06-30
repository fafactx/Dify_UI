/**
 * Test Cases Application - 完全重构版本
 * 目标：动态获取数据库所有内容，保存到内存，动态显示，点击查看详情
 */

class TestCasesApp {
    constructor() {
        // 数据存储
        this.allTestCases = [];
        this.filteredTestCases = [];
        this.searchTerm = '';
        this.dynamicFields = [];

        // DOM元素
        this.elements = {};

        // 状态
        this.isLoading = false;
        this.hasError = false;
    }

    /**
     * 初始化应用
     */
    async init() {
        console.log('🚀 Test Cases App 初始化开始...');

        // 初始化DOM元素引用
        this.initDOMElements();

        // 绑定事件监听器
        this.bindEventListeners();

        // 加载数据
        await this.loadAllData();
    }

    /**
     * 初始化DOM元素引用
     */
    initDOMElements() {
        this.elements = {
            statusText: document.getElementById('statusText'),
            refreshBtn: document.getElementById('refreshBtn'),
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            errorMessage: document.getElementById('errorMessage'),
            emptyState: document.getElementById('emptyState'),
            tableContainer: document.getElementById('tableContainer'),
            tableHead: document.getElementById('tableHead'),
            tableBody: document.getElementById('tableBody'),
            paginationInfo: document.getElementById('paginationInfo'),
            paginationNav: document.getElementById('paginationNav'),
            detailModal: document.getElementById('detailModal'),
            detailModalBody: document.getElementById('detailModalBody')
        };

        console.log('✅ DOM元素初始化完成');
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 刷新按钮
        this.elements.refreshBtn?.addEventListener('click', () => this.loadAllData());

        // 搜索输入
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            this.filterAndRender();
        });

        // 清除搜索
        this.elements.clearSearch?.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.searchTerm = '';
            this.filterAndRender();
        });



        console.log('✅ 事件监听器绑定完成');
    }

    /**
     * 获取API基础URL
     */
    getApiBaseUrl() {
        if (window.appConfig && window.appConfig.apiBaseUrl) {
            return window.appConfig.apiBaseUrl;
        }

        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;

        if (/^\d+\.\d+\.\d+\.\d+$/.test(currentHost)) {
            return `${currentProtocol}//${currentHost}:3000`;
        }

        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        return `${currentProtocol}//${currentHost}:3000`;
    }

    /**
     * 加载所有数据
     */
    async loadAllData() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoadingState();

        try {
            console.log('📡 开始加载所有测试用例数据...');

            const apiBaseUrl = this.getApiBaseUrl();
            console.log('🌐 API Base URL:', apiBaseUrl);

            // 获取所有测试用例（设置大的limit来获取所有数据）
            const response = await fetch(`${apiBaseUrl}/api/test-cases?limit=10000`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 API响应数据:', data);

            // 检查数据格式
            if (data.success === false || data.is_empty) {
                this.showEmptyState();
                return;
            }

            // 提取测试用例数据
            let testCases = [];
            if (data.testCases && Array.isArray(data.testCases)) {
                testCases = data.testCases;
            } else if (data.data && Array.isArray(data.data)) {
                testCases = data.data;
            } else {
                throw new Error('无法识别的数据格式');
            }

            console.log(`✅ 成功加载 ${testCases.length} 条测试用例`);

            // 保存到内存
            this.allTestCases = testCases;

            // 动态检测字段
            this.detectDynamicFields();

            // 过滤和渲染
            this.filterAndRender();

            // 更新状态文本
            this.updateStatusText(`Loaded ${testCases.length} test cases - Click any row to view full details`);

        } catch (error) {
            console.error('❌ 加载数据失败:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 动态检测字段
     */
    detectDynamicFields() {
        if (this.allTestCases.length === 0) return;

        // 从第一条记录中提取所有字段
        const firstRecord = this.allTestCases[0];
        const allFields = Object.keys(firstRecord);

        // 排除基础字段
        const excludeFields = ['id', 'result_key', 'timestamp', 'date'];

        // 只显示关键字段，其他信息通过点击查看
        const displayFields = [
            'CAS Name',
            'Product Family',
            'Part Number',
            'Question',  // 简化显示
            'average_score'
        ];

        this.dynamicFields = displayFields;

        console.log('🔍 检测到的动态字段:', this.dynamicFields);
    }

    /**
     * 过滤和渲染
     */
    filterAndRender() {
        // 应用搜索过滤
        if (this.searchTerm) {
            this.filteredTestCases = this.allTestCases.filter(testCase => {
                const searchLower = this.searchTerm.toLowerCase();
                return Object.values(testCase).some(value =>
                    String(value).toLowerCase().includes(searchLower)
                );
            });
        } else {
            this.filteredTestCases = [...this.allTestCases];
        }

        console.log(`🔍 过滤后的测试用例数量: ${this.filteredTestCases.length}`);

        // 重置到第一页
        this.currentPage = 1;

        // 渲染表格
        this.renderTable();
    }

    /**
     * 渲染表格
     */
    renderTable() {
        if (this.filteredTestCases.length === 0) {
            this.showEmptyState();
            return;
        }

        // 显示表格容器
        this.showTableContainer();

        // 渲染表头
        this.renderTableHeader();

        // 渲染表格内容
        this.renderTableBody();

        // 渲染分页
        this.renderPagination();
    }

    /**
     * 渲染表头
     */
    renderTableHeader() {
        const headerRow = document.createElement('tr');

        // ID列
        headerRow.innerHTML = `
            <th style="width: 80px;">ID</th>
            <th style="width: 120px;">Date</th>
        `;

        // 动态字段列
        this.dynamicFields.forEach(field => {
            const th = document.createElement('th');
            th.textContent = field;
            headerRow.appendChild(th);
        });

        // 操作列
        const actionTh = document.createElement('th');
        actionTh.style.width = '100px';
        actionTh.textContent = 'Actions';
        headerRow.appendChild(actionTh);

        this.elements.tableHead.innerHTML = '';
        this.elements.tableHead.appendChild(headerRow);
    }

    /**
     * 渲染表格内容
     */
    renderTableBody() {
        // 显示所有过滤后的数据，不分页
        const rows = this.filteredTestCases.map(testCase => this.createTableRow(testCase));

        this.elements.tableBody.innerHTML = rows.join('');

        // 绑定点击事件
        this.bindRowClickEvents();
    }

    /**
     * 创建表格行
     */
    createTableRow(testCase) {
        const scoreClass = this.getScoreClass(testCase.average_score);

        let row = `
            <tr data-id="${testCase.id}" style="cursor: pointer;" title="Click to view full details" class="table-row-hover">
                <td><span class="badge bg-primary">${testCase.id}</span></td>
                <td><small class="text-muted">${this.formatDate(testCase.date || testCase.timestamp)}</small></td>
        `;

        // 动态字段列
        this.dynamicFields.forEach(field => {
            let value = testCase[field];

            if (field === 'average_score') {
                value = value ? `<span class="fw-bold ${scoreClass}">${Number(value).toFixed(1)}</span>` : 'N/A';
            } else if (value === undefined || value === null || value === '') {
                value = '<span class="text-muted">N/A</span>';
            } else {
                // 截断长文本并添加省略号
                const maxLength = field === 'Question' ? 50 : 30;
                if (String(value).length > maxLength) {
                    value = `<span title="${String(value).replace(/"/g, '&quot;')}">${String(value).substring(0, maxLength)}...</span>`;
                }
            }

            row += `<td>${value}</td>`;
        });

        // 操作列
        row += `
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="TestCasesApp.viewDetails(${testCase.id})" title="View Full Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;

        return row;
    }

    /**
     * 绑定行点击事件
     */
    bindRowClickEvents() {
        const rows = this.elements.tableBody.querySelectorAll('tr[data-id]');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                // 如果点击的是按钮，不触发行点击
                if (e.target.closest('button')) return;

                const id = parseInt(row.dataset.id);
                this.viewDetails(id);
            });
        });
    }

    /**
     * 查看详情
     */
    viewDetails(id) {
        const testCase = this.allTestCases.find(tc => tc.id === id);
        if (!testCase) return;

        console.log('👁️ 查看测试用例详情:', testCase);

        // 生成详情HTML
        const detailsHTML = this.generateDetailsHTML(testCase);

        // 显示模态框
        this.elements.detailModalBody.innerHTML = detailsHTML;
        const modal = new bootstrap.Modal(this.elements.detailModal);
        modal.show();
    }

    /**
     * 生成详情HTML
     */
    generateDetailsHTML(testCase) {
        let html = '<div class="container-fluid">';

        // 基础信息卡片
        html += `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Basic Information</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm mb-0">
                                <tr><td><strong>ID:</strong></td><td>${testCase.id}</td></tr>
                                <tr><td><strong>Result Key:</strong></td><td>${testCase.result_key || 'N/A'}</td></tr>
                                <tr><td><strong>Date:</strong></td><td>${this.formatDate(testCase.date || testCase.timestamp)}</td></tr>
                                <tr><td><strong>CAS Name:</strong></td><td>${testCase['CAS Name'] || 'N/A'}</td></tr>
                                <tr><td><strong>Product Family:</strong></td><td>${testCase['Product Family'] || 'N/A'}</td></tr>
                                <tr><td><strong>Part Number:</strong></td><td>${testCase['Part Number'] || 'N/A'}</td></tr>
                                <tr><td><strong>MAG:</strong></td><td>${testCase['MAG'] || 'N/A'}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Evaluation Scores</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm mb-0">
                                <tr><td><strong>Hallucination Control:</strong></td><td><span class="badge bg-info">${testCase.hallucination_control || 'N/A'}</span></td></tr>
                                <tr><td><strong>Quality:</strong></td><td><span class="badge bg-info">${testCase.quality || 'N/A'}</span></td></tr>
                                <tr><td><strong>Professionalism:</strong></td><td><span class="badge bg-info">${testCase.professionalism || 'N/A'}</span></td></tr>
                                <tr><td><strong>Usefulness:</strong></td><td><span class="badge bg-info">${testCase.usefulness || 'N/A'}</span></td></tr>
                                <tr><td><strong>Average Score:</strong></td><td><span class="badge ${this.getScoreBadgeClass(testCase.average_score)}">${testCase.average_score ? Number(testCase.average_score).toFixed(2) : 'N/A'}</span></td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 问答内容卡片
        if (testCase['Question'] || testCase['Answer']) {
            html += `
                <div class="row mb-3">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-warning text-dark">
                                <h6 class="mb-0"><i class="fas fa-question-circle me-2"></i>Question & Answer</h6>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <strong>Question:</strong>
                                    <div class="mt-1 p-2 bg-light rounded">${testCase['Question'] || 'N/A'}</div>
                                </div>
                                <div>
                                    <strong>Answer:</strong>
                                    <div class="mt-1 p-2 bg-light rounded">${testCase['Answer'] || testCase['LLM_ANSWER'] || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // 其他所有字段
        html += `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-secondary text-white">
                            <h6 class="mb-0"><i class="fas fa-list me-2"></i>All Fields</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-sm mb-0">
        `;

        Object.entries(testCase).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'result_key' && key !== 'date' && key !== 'timestamp') {
                // 处理长文本
                let displayValue = value || 'N/A';
                if (typeof displayValue === 'string' && displayValue.length > 100) {
                    displayValue = `<div style="max-height: 100px; overflow-y: auto;">${displayValue}</div>`;
                }
                html += `<tr><td style="width: 200px;"><strong>${key}:</strong></td><td>${displayValue}</td></tr>`;
            }
        });

        html += '</table></div></div></div></div></div></div>';

        return html;
    }

    /**
     * 获取分数徽章样式
     */
    getScoreBadgeClass(score) {
        if (!score) return 'bg-secondary';
        return score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger';
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        // 只显示总数信息，不显示分页控件
        const searchInfo = this.searchTerm ? ` (filtered)` : '';
        this.elements.paginationInfo.textContent =
            `Showing all ${this.filteredTestCases.length} items${searchInfo}`;

        // 清空分页控件
        this.elements.paginationNav.innerHTML = '';
    }



    /**
     * 工具方法
     */
    getScoreClass(score) {
        if (!score) return 'text-muted';
        return score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger';
    }

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return dateStr;
        }
    }

    updateStatusText(text) {
        if (this.elements.statusText) {
            this.elements.statusText.textContent = text;
        }
    }

    /**
     * 状态显示方法
     */
    showLoadingState() {
        this.hideAllStates();
        this.elements.loadingState?.classList.remove('d-none');
        this.updateStatusText('Loading...');
    }

    showErrorState(message) {
        this.hideAllStates();
        this.elements.errorState?.classList.remove('d-none');
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        this.updateStatusText('Error loading data');
    }

    showEmptyState() {
        this.hideAllStates();
        this.elements.emptyState?.classList.remove('d-none');
        this.updateStatusText('No test cases found');
    }

    showTableContainer() {
        this.hideAllStates();
        this.elements.tableContainer?.classList.remove('d-none');
    }

    hideAllStates() {
        this.elements.loadingState?.classList.add('d-none');
        this.elements.errorState?.classList.add('d-none');
        this.elements.emptyState?.classList.add('d-none');
        this.elements.tableContainer?.classList.add('d-none');
    }
}

// 创建全局实例
window.TestCasesApp = new TestCasesApp();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.TestCasesApp.init();
});

// 导出给HTML使用的方法
window.TestCasesApp.viewDetails = function(id) {
    window.TestCasesApp.viewDetails(id);
};

window.TestCasesApp.goToPage = function(page) {
    window.TestCasesApp.goToPage(page);
};
