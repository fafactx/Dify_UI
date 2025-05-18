/**
 * Test Cases Page JavaScript
 *
 * This file handles all the functionality for the test cases page:
 * - Loading test cases from the backend
 * - Displaying test cases in a table
 * - Viewing detailed information for each test case
 * - Deleting test cases (single, batch, range)
 * - Pagination and search
 */

// Global variables
let testCases = [];
let currentPage = 1;
const pageSize = 10;
let selectedIds = new Set();
let statsData = null;
let isLoading = false;
let searchTerm = '';

// DOM elements
const testCasesBody = document.getElementById('testCasesBody');
const pagination = document.getElementById('pagination');
const paginationInfo = document.getElementById('paginationInfo');
const selectAllCheckbox = document.getElementById('selectAll');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteRangeBtn = document.getElementById('deleteRangeBtn');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');

// Modals
const sampleDetailModal = new bootstrap.Modal(document.getElementById('sampleDetailModal'));
const deleteRangeModal = new bootstrap.Modal(document.getElementById('deleteRangeModal'));
const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load test cases and stats
    loadData();

    // Event listeners
    selectAllCheckbox.addEventListener('change', handleSelectAll);
    deleteSelectedBtn.addEventListener('click', showDeleteConfirmation);
    deleteRangeBtn.addEventListener('click', () => deleteRangeModal.show());
    refreshBtn.addEventListener('click', loadData);
    searchInput.addEventListener('input', handleSearch);

    // Modal event listeners
    document.getElementById('confirmDeleteRange').addEventListener('click', handleDeleteRange);
    document.getElementById('confirmDelete').addEventListener('click', handleDelete);
});

/**
 * Load all data (test cases and stats)
 */
async function loadData() {
    try {
        isLoading = true;
        updateLoadingState(true);

        // Load stats first
        await loadStats();

        // Then load test cases
        await loadTestCases();

        isLoading = false;
        updateLoadingState(false);
    } catch (error) {
        console.error('Error loading data:', error);
        isLoading = false;
        updateLoadingState(false);
        showErrorMessage('Failed to load data. Please try again.');
    }
}

/**
 * Load statistics from the backend
 */
async function loadStats() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/stats`);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        statsData = data.stats;

        // Update stats UI
        updateStatsUI();
    } catch (error) {
        console.error('Error loading stats:', error);
        statsData = null;
        // Show default stats
        updateStatsUI();
    }
}

/**
 * Update statistics UI elements
 */
function updateStatsUI() {
    // If stats data is available and not empty
    if (statsData && !statsData.is_empty) {
        document.getElementById('totalSamples').textContent = statsData.count || 0;
        document.getElementById('avgScore').textContent = statsData.overall_average !== -1 ?
            (statsData.overall_average || 0).toFixed(1) : '-';
        document.getElementById('productFamilies').textContent = statsData.product_family_count || 0;
        document.getElementById('magCount').textContent = statsData.mag_count || 0;
    } else {
        // Show empty state
        document.getElementById('totalSamples').textContent = '0';
        document.getElementById('avgScore').textContent = '-';
        document.getElementById('productFamilies').textContent = '0';
        document.getElementById('magCount').textContent = '0';
    }
}

/**
 * Load test cases from the backend
 */
async function loadTestCases() {
    try {
        // Reset selection
        selectedIds.clear();
        selectAllCheckbox.checked = false;
        updateDeleteSelectedButton();

        // Show loading state
        testCasesBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading test cases...</p>
                </td>
            </tr>
        `;

        // Get API URL
        const apiBaseUrl = getApiBaseUrl();

        // Try to get evaluations directly
        const url = `${apiBaseUrl}/api/evaluations`;
        console.log(`Fetching test cases from: ${url}`);

        // Fetch data
        const response = await fetch(url);

        if (!response.ok) {
            // If evaluations endpoint fails, try the test-cases endpoint as fallback
            console.warn(`Evaluations API failed, trying test-cases endpoint as fallback`);
            const fallbackUrl = `${apiBaseUrl}/api/test-cases`;
            const fallbackResponse = await fetch(fallbackUrl);

            if (!fallbackResponse.ok) {
                throw new Error(`API request failed: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
            }

            const fallbackData = await fallbackResponse.json();

            // Check if database is empty
            if (fallbackData.is_empty || (fallbackData.success === false && fallbackData.message && fallbackData.message.includes('数据库为空'))) {
                showEmptyState();
                testCases = [];
                return;
            }

            // Store test cases
            testCases = fallbackData.testCases || fallbackData.data || [];
        } else {
            const data = await response.json();

            // Check if database is empty
            if (!data || !data.data || data.data.length === 0 ||
                (data.success === false && data.message && data.message.includes('数据库为空'))) {
                showEmptyState();
                testCases = [];
                return;
            }

            // Store test cases - handle different response formats
            testCases = data.data.map(item => {
                // If data is nested in a data field, extract it
                const evalData = item.data ? JSON.parse(item.data) : item;

                return {
                    id: item.id,
                    result_key: item.result_key,
                    timestamp: item.timestamp,
                    date: item.date,
                    'CAS Name': evalData['CAS Name'] || 'N/A',
                    'Product Family': evalData['Product Family'] || 'N/A',
                    'Part Number': evalData['Part Number'] || 'N/A',
                    MAG: evalData.MAG || 'N/A',
                    Question: evalData.Question || '',
                    Answer: evalData.Answer || '',
                    'Question Scenario': evalData['Question Scenario'] || '',
                    'Answer Source': evalData['Answer Source'] || '',
                    'Question Complexity': evalData['Question Complexity'] || '',
                    'Question Frequency': evalData['Question Frequency'] || '',
                    'Question Category': evalData['Question Category'] || '',
                    'Source Category': evalData['Source Category'] || '',
                    hallucination_control: evalData.hallucination_control || 0,
                    quality: evalData.quality || 0,
                    professionalism: evalData.professionalism || 0,
                    usefulness: evalData.usefulness || 0,
                    average_score: evalData.average_score || 0,
                    summary: evalData.summary || '',
                    LLM_ANSWER: evalData.LLM_ANSWER || ''
                };
            });
        }

        // Apply search filter if needed
        if (searchTerm) {
            testCases = filterTestCases(testCases, searchTerm);
        }

        // Render test cases
        renderTestCases();
        renderPagination();
    } catch (error) {
        console.error('Error loading test cases:', error);
        showErrorMessage(`Error loading test cases: ${error.message}`);
    }
}

/**
 * Filter test cases based on search term
 */
function filterTestCases(cases, term) {
    if (!term) return cases;

    const lowerTerm = term.toLowerCase();
    return cases.filter(testCase => {
        // Search in basic fields
        if (testCase.id && testCase.id.toString().includes(lowerTerm)) return true;
        if (testCase['CAS Name'] && testCase['CAS Name'].toLowerCase().includes(lowerTerm)) return true;
        if (testCase['Product Family'] && testCase['Product Family'].toLowerCase().includes(lowerTerm)) return true;
        if (testCase['Part Number'] && testCase['Part Number'].toLowerCase().includes(lowerTerm)) return true;
        if (testCase.MAG && testCase.MAG.toLowerCase().includes(lowerTerm)) return true;

        // Search in question and answer
        if (testCase.Question && testCase.Question.toLowerCase().includes(lowerTerm)) return true;
        if (testCase.Answer && testCase.Answer.toLowerCase().includes(lowerTerm)) return true;

        return false;
    });
}

/**
 * Render test cases table
 */
function renderTestCases() {
    if (testCases.length === 0) {
        showEmptyState();
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, testCases.length);
    const pageTestCases = testCases.slice(startIndex, endIndex);

    // Generate HTML
    testCasesBody.innerHTML = pageTestCases.map(testCase => {
        // Format score with color
        const score = testCase.average_score;
        let scoreClass = 'bg-secondary';
        if (score >= 90) scoreClass = 'bg-success';
        else if (score >= 70) scoreClass = 'bg-primary';
        else if (score >= 50) scoreClass = 'bg-warning';
        else if (score > 0) scoreClass = 'bg-danger';

        return `
        <tr data-id="${testCase.id}">
            <td>
                <input type="checkbox" class="form-check-input case-checkbox"
                       data-id="${testCase.id}"
                       ${selectedIds.has(testCase.id) ? 'checked' : ''}>
            </td>
            <td>${testCase.id}</td>
            <td>${formatDate(testCase.date || testCase.timestamp)}</td>
            <td>${testCase['CAS Name'] || 'N/A'}</td>
            <td>${testCase['Product Family'] || 'N/A'}</td>
            <td>${testCase['Part Number'] || 'N/A'}</td>
            <td>
                <span class="badge ${scoreClass} score-badge">
                    ${score ? score.toFixed(1) : 'N/A'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteTestCase(${testCase.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-primary ms-1" onclick="viewTestCase(${testCase.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');

    // Update pagination info
    paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${testCases.length} entries`;

    // Add event listeners to checkboxes
    document.querySelectorAll('.case-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

/**
 * Show empty state when no test cases are available
 */
function showEmptyState() {
    testCasesBody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h5>No Test Cases Found</h5>
                    <p class="text-muted">The database is empty. Please wait for data to be synced from Dify.</p>
                </div>
            </td>
        </tr>
    `;
    paginationInfo.textContent = 'Showing 0 of 0 entries';
    pagination.innerHTML = '';
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    testCasesBody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                    <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadData()">
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
    paginationInfo.textContent = 'Error loading data';
    pagination.innerHTML = '';
}

/**
 * Update loading state
 */
function updateLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner refresh-btn me-2"></i>Loading...';
        refreshBtn.disabled = true;
    } else {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh';
        refreshBtn.disabled = false;
    }
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const totalPages = Math.ceil(testCases.length / pageSize);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `;
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;

    // Add event listeners
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.closest('.page-link').dataset.page);
            if (!isNaN(page) && page !== currentPage) {
                currentPage = page;
                renderTestCases();
                renderPagination();
            }
        });
    });
}

/**
 * View test case details
 */
function viewTestCase(id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) {
        alert('Test case not found');
        return;
    }

    // Format date
    const date = new Date(testCase.timestamp || testCase.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();

    // Format scores
    const formatScore = (score) => {
        if (score === undefined || score === null) return 'N/A';
        return score.toFixed(1);
    };

    // Generate score badges with colors
    const getScoreBadge = (score, label) => {
        let colorClass = 'bg-secondary';
        if (score >= 90) colorClass = 'bg-success';
        else if (score >= 70) colorClass = 'bg-primary';
        else if (score >= 50) colorClass = 'bg-warning';
        else if (score > 0) colorClass = 'bg-danger';

        return `
            <div class="col-md-3 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title">${label}</h5>
                        <span class="badge ${colorClass} fs-5 px-3 py-2">${formatScore(score)}</span>
                    </div>
                </div>
            </div>
        `;
    };

    // Create detail HTML
    const detailHTML = `
        <div class="container-fluid">
            <!-- Basic Info -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="sample-detail">
                        <h5 class="mb-3">Basic Information</h5>
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <strong>ID:</strong> ${testCase.id}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Date:</strong> ${dateStr} ${timeStr}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>CAS Name:</strong> ${testCase['CAS Name'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Product Family:</strong> ${testCase['Product Family'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Part Number:</strong> ${testCase['Part Number'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>MAG:</strong> ${testCase.MAG || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="sample-detail">
                        <h5 class="mb-3">Question Information</h5>
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <strong>Question Scenario:</strong> ${testCase['Question Scenario'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Answer Source:</strong> ${testCase['Answer Source'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Question Complexity:</strong> ${testCase['Question Complexity'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Question Frequency:</strong> ${testCase['Question Frequency'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Question Category:</strong> ${testCase['Question Category'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Source Category:</strong> ${testCase['Source Category'] || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scores -->
            <div class="row mb-4">
                ${getScoreBadge(testCase.average_score, 'Average Score')}
                ${getScoreBadge(testCase.hallucination_control, 'Hallucination Control')}
                ${getScoreBadge(testCase.quality, 'Quality')}
                ${getScoreBadge(testCase.professionalism, 'Professionalism')}
            </div>

            <!-- Question and Answer -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">Question</h5>
                        <p>${testCase.Question || 'N/A'}</p>
                    </div>
                </div>
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">Answer</h5>
                        <p>${testCase.Answer || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <!-- Summary -->
            ${testCase.summary ? `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">Summary</h5>
                        <p>${testCase.summary}</p>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- LLM Answer -->
            ${testCase.LLM_ANSWER ? `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">LLM Answer</h5>
                        <p>${testCase.LLM_ANSWER}</p>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    // Update modal content and show
    document.getElementById('sampleDetailContent').innerHTML = detailHTML;
    sampleDetailModal.show();
}

/**
 * Handle select all checkbox
 */
function handleSelectAll() {
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

/**
 * Handle individual checkbox change
 */
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const id = parseInt(checkbox.dataset.id);

    if (checkbox.checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
        selectAllCheckbox.checked = false;
    }

    updateDeleteSelectedButton();
}

/**
 * Update delete selected button visibility
 */
function updateDeleteSelectedButton() {
    if (selectedIds.size > 0) {
        deleteSelectedBtn.classList.remove('d-none');
    } else {
        deleteSelectedBtn.classList.add('d-none');
    }
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation() {
    const count = selectedIds.size;
    document.getElementById('confirmationMessage').textContent =
        `Are you sure you want to delete ${count} selected test case${count !== 1 ? 's' : ''}?`;
    confirmationModal.show();
}

/**
 * Handle delete range
 */
async function handleDeleteRange() {
    const fromId = parseInt(document.getElementById('fromId').value);
    const toId = parseInt(document.getElementById('toId').value);

    if (isNaN(fromId) || isNaN(toId) || fromId > toId || fromId < 1) {
        alert('Please enter a valid ID range');
        return;
    }

    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/test-cases/range`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromId, toId })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Close modal and reload data
        deleteRangeModal.hide();

        // Show success message
        alert(`Successfully deleted ${result.deletedCount} test cases`);

        // Reload data
        loadData();
    } catch (error) {
        console.error('Error deleting test cases range:', error);
        alert(`Error deleting test cases: ${error.message}`);
    }
}

/**
 * Handle delete selected
 */
async function handleDelete() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/test-cases/batch`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Close modal and reload data
        confirmationModal.hide();

        // Show success message
        alert(`Successfully deleted ${result.deletedCount} test cases`);

        // Reload data
        loadData();
    } catch (error) {
        console.error('Error deleting test cases:', error);
        alert(`Error deleting test cases: ${error.message}`);
    }
}

/**
 * Delete a single test case
 */
async function deleteTestCase(id) {
    if (!confirm(`Are you sure you want to delete test case #${id}?`)) {
        return;
    }

    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/test-cases/${id}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        await response.json();

        // Show success message
        alert(`Successfully deleted test case #${id}`);

        // Reload data
        loadData();
    } catch (error) {
        console.error(`Error deleting test case #${id}:`, error);
        alert(`Error deleting test case: ${error.message}`);
    }
}

/**
 * Handle search input
 */
function handleSearch(e) {
    searchTerm = e.target.value.trim();

    // Reset to first page
    currentPage = 1;

    // If we have test cases loaded, filter them
    if (testCases.length > 0) {
        const filteredCases = filterTestCases(testCases, searchTerm);

        // If no results found after filtering
        if (filteredCases.length === 0) {
            testCasesBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h5>No Results Found</h5>
                            <p class="text-muted">No test cases match your search criteria.</p>
                        </div>
                    </td>
                </tr>
            `;
            paginationInfo.textContent = 'Showing 0 of 0 entries';
            pagination.innerHTML = '';
        } else {
            // Update the filtered test cases and render
            testCases = filteredCases;
            renderTestCases();
            renderPagination();
        }
    }
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toLocaleString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Error';
    }
}

/**
 * Get API base URL
 */
function getApiBaseUrl() {
    // Check if we're running locally
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }

    // If we're running on an IP address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return `${window.location.protocol}//${hostname}:3000`;
    }

    // Default to relative path
    return '';
}

/**
 * Show empty state when no test cases are available
 */
function showEmptyState() {
    testCasesBody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h5>No Test Cases Found</h5>
                    <p class="text-muted">The database is empty. Please wait for data to be synced from Dify.</p>
                </div>
            </td>
        </tr>
    `;
    paginationInfo.textContent = 'Showing 0 of 0 entries';
    pagination.innerHTML = '';
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    testCasesBody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                    <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadData()">
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
    paginationInfo.textContent = 'Error loading data';
    pagination.innerHTML = '';
}

/**
 * Update loading state
 */
function updateLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner refresh-btn me-2"></i>Loading...';
        refreshBtn.disabled = true;
    } else {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh';
        refreshBtn.disabled = false;
    }
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const totalPages = Math.ceil(testCases.length / pageSize);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `;
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;

    // Add event listeners
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.closest('.page-link').dataset.page);
            if (!isNaN(page) && page !== currentPage) {
                currentPage = page;
                renderTestCases();
                renderPagination();
            }
        });
    });
}

/**
 * View test case details
 */
function viewTestCase(id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) {
        alert('Test case not found');
        return;
    }

    // Format date
    const date = new Date(testCase.timestamp || testCase.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();

    // Format scores
    const formatScore = (score) => {
        if (score === undefined || score === null) return 'N/A';
        return score.toFixed(1);
    };

    // Generate score badges with colors
    const getScoreBadge = (score, label) => {
        let colorClass = 'bg-secondary';
        if (score >= 90) colorClass = 'bg-success';
        else if (score >= 70) colorClass = 'bg-primary';
        else if (score >= 50) colorClass = 'bg-warning';
        else if (score > 0) colorClass = 'bg-danger';

        return `
            <div class="col-md-3 mb-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title">${label}</h5>
                        <span class="badge ${colorClass} fs-5 px-3 py-2">${formatScore(score)}</span>
                    </div>
                </div>
            </div>
        `;
    };

    // Create detail HTML
    const detailHTML = `
        <div class="container-fluid">
            <!-- Basic Info -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="sample-detail">
                        <h5 class="mb-3">Basic Information</h5>
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <strong>ID:</strong> ${testCase.id}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Date:</strong> ${dateStr} ${timeStr}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>CAS Name:</strong> ${testCase['CAS Name'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Product Family:</strong> ${testCase['Product Family'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Part Number:</strong> ${testCase['Part Number'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>MAG:</strong> ${testCase.MAG || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="sample-detail">
                        <h5 class="mb-3">Question Information</h5>
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <strong>Question Scenario:</strong> ${testCase['Question Scenario'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Answer Source:</strong> ${testCase['Answer Source'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Question Complexity:</strong> ${testCase['Question Complexity'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Question Frequency:</strong> ${testCase['Question Frequency'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Question Category:</strong> ${testCase['Question Category'] || 'N/A'}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Source Category:</strong> ${testCase['Source Category'] || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scores -->
            <div class="row mb-4">
                ${getScoreBadge(testCase.average_score, 'Average Score')}
                ${getScoreBadge(testCase.hallucination_control, 'Hallucination Control')}
                ${getScoreBadge(testCase.quality, 'Quality')}
                ${getScoreBadge(testCase.professionalism, 'Professionalism')}
            </div>

            <!-- Question and Answer -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">Question</h5>
                        <p>${testCase.Question || 'N/A'}</p>
                    </div>
                </div>
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">Answer</h5>
                        <p>${testCase.Answer || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <!-- Summary -->
            ${testCase.summary ? `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">Summary</h5>
                        <p>${testCase.summary}</p>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- LLM Answer -->
            ${testCase.LLM_ANSWER ? `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="sample-detail">
                        <h5 class="mb-3">LLM Answer</h5>
                        <p>${testCase.LLM_ANSWER}</p>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    // Update modal content and show
    document.getElementById('sampleDetailContent').innerHTML = detailHTML;
    sampleDetailModal.show();
}

/**
 * Handle select all checkbox
 */
function handleSelectAll() {
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

/**
 * Handle individual checkbox change
 */
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const id = parseInt(checkbox.dataset.id);

    if (checkbox.checked) {
        selectedIds.add(id);
    } else {
        selectedIds.delete(id);
        selectAllCheckbox.checked = false;
    }

    updateDeleteSelectedButton();
}

/**
 * Update delete selected button visibility
 */
function updateDeleteSelectedButton() {
    if (selectedIds.size > 0) {
        deleteSelectedBtn.classList.remove('d-none');
    } else {
        deleteSelectedBtn.classList.add('d-none');
    }
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation() {
    const count = selectedIds.size;
    document.getElementById('confirmationMessage').textContent =
        `Are you sure you want to delete ${count} selected test case${count !== 1 ? 's' : ''}?`;
    confirmationModal.show();
}

/**
 * Handle delete range
 */
async function handleDeleteRange() {
    const fromId = parseInt(document.getElementById('fromId').value);
    const toId = parseInt(document.getElementById('toId').value);

    if (isNaN(fromId) || isNaN(toId) || fromId > toId || fromId < 1) {
        alert('Please enter a valid ID range');
        return;
    }

    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/test-cases/range`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromId, toId })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Close modal and reload data
        deleteRangeModal.hide();

        // Show success message
        alert(`Successfully deleted ${result.deletedCount} test cases`);

        // Reload data
        loadData();
    } catch (error) {
        console.error('Error deleting test cases range:', error);
        alert(`Error deleting test cases: ${error.message}`);
    }
}

/**
 * Handle delete selected
 */
async function handleDelete() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/test-cases/batch`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Close modal and reload data
        confirmationModal.hide();

        // Show success message
        alert(`Successfully deleted ${result.deletedCount} test cases`);

        // Reload data
        loadData();
    } catch (error) {
        console.error('Error deleting test cases:', error);
        alert(`Error deleting test cases: ${error.message}`);
    }
}

/**
 * Delete a single test case
 */
async function deleteTestCase(id) {
    if (!confirm(`Are you sure you want to delete test case #${id}?`)) {
        return;
    }

    try {
        const apiBaseUrl = getApiBaseUrl();
        const url = `${apiBaseUrl}/api/test-cases/${id}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        await response.json(); // Read the response but we don't need to store it

        // Show success message
        alert(`Successfully deleted test case #${id}`);

        // Reload data
        loadData();
    } catch (error) {
        console.error(`Error deleting test case #${id}:`, error);
        alert(`Error deleting test case: ${error.message}`);
    }
}

/**
 * Handle search input
 */
function handleSearch(e) {
    searchTerm = e.target.value.trim();

    // Reset to first page
    currentPage = 1;

    // If we have test cases loaded, filter them
    if (testCases.length > 0) {
        const filteredCases = filterTestCases(testCases, searchTerm);

        // If no results found after filtering
        if (filteredCases.length === 0) {
            testCasesBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h5>No Results Found</h5>
                            <p class="text-muted">No test cases match your search criteria.</p>
                        </div>
                    </td>
                </tr>
            `;
            paginationInfo.textContent = 'Showing 0 of 0 entries';
            pagination.innerHTML = '';
        } else {
            // Update the filtered test cases and render
            testCases = filteredCases;
            renderTestCases();
            renderPagination();
        }
    }
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toLocaleString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Error';
    }
}

/**
 * Get API base URL
 */
function getApiBaseUrl() {
    // Check if we're running locally
    const hostname = window.location.hostname;
    const port = window.location.port;

    // If we're running on localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }

    // If we're running on an IP address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        // If we're already on port 3000, use the current origin
        if (port === '3000') {
            return window.location.origin;
        }
        // Otherwise, use the IP with port 3000
        return `${window.location.protocol}//${hostname}:3000`;
    }

    // If we're on the same server but different port
    if (port && port !== '3000') {
        return `${window.location.protocol}//${hostname}:3000`;
    }

    // Default to relative path (same origin)
    return '';
}

// Make functions globally available
window.viewTestCase = viewTestCase;
window.deleteTestCase = deleteTestCase;