/**
 * 图表模块
 * 处理所有图表的创建和更新
 */

// 图表实例
let radarChart = null;
let barChart = null;
let compareChart = null;

// 图表颜色
const CHART_COLORS = {
    primary: '#4a6bff',
    secondary: '#6c757d',
    success: '#28a745',
    info: '#17a2b8',
    warning: '#ffc107',
    danger: '#dc3545',
    light: '#f8f9fa',
    dark: '#343a40',
    gradients: [
        ['#4a6bff', '#83a4ff'],
        ['#28a745', '#5fd876'],
        ['#dc3545', '#ff7a86'],
        ['#ffc107', '#ffe083'],
        ['#17a2b8', '#5cdeef']
    ]
};

/**
 * 安全地初始化图表
 * @param {string} elementId - 图表容器元素ID
 * @returns {Object|null} - 初始化的ECharts实例或null
 */
function safeInitChart(elementId) {
    console.log(`[DEBUG] 开始初始化图表: #${elementId}`);

    // 检查 echarts 是否已加载
    if (typeof window.echarts === 'undefined') {
        console.error(`[DEBUG] ECharts 库未加载，无法初始化图表: #${elementId}`);
        // 尝试检查是否有其他变量名
        if (typeof window.echartsInstance !== 'undefined') {
            console.log(`[DEBUG] 找到 echartsInstance，尝试使用它`);
            window.echarts = window.echartsInstance;
        } else {
            // 尝试重新加载 echarts
            console.log(`[DEBUG] 尝试重新加载 ECharts 库`);
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);

            // 返回 null，等待下一次重试
            return null;
        }
    }

    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`[DEBUG] 图表容器元素不存在: #${elementId}`);
        return null;
    }

    // 检查容器尺寸
    const width = element.clientWidth;
    const height = element.clientHeight;
    console.log(`[DEBUG] 图表容器尺寸: width=${width}, height=${height}`);

    // 确保容器有足够的尺寸
    if (width === 0 || height === 0) {
        console.warn(`[DEBUG] 图表容器尺寸为零: #${elementId}, width=${width}, height=${height}`);

        // 设置内联样式确保容器有尺寸
        element.style.width = '100%';
        element.style.height = '400px';
        element.style.position = 'relative';

        console.log(`[DEBUG] 已设置容器尺寸: width=100%, height=400px`);

        // 强制浏览器重新计算布局
        element.offsetHeight;
    }

    try {
        // 检查是否已经有图表实例
        const existingInstance = element.__echarts_instance__;
        if (existingInstance) {
            console.log(`[DEBUG] 容器已有图表实例，先销毁`);
            try {
                window.echarts.dispose(element);
            } catch (disposeError) {
                console.warn(`[DEBUG] 销毁已有实例失败:`, disposeError);
            }
        }

        console.log(`[DEBUG] 调用 echarts.init() 初始化图表: #${elementId}`);

        // 使用更多选项初始化
        const chart = window.echarts.init(element, null, {
            renderer: 'canvas',
            useDirtyRect: false,
            width: 'auto',
            height: 'auto'
        });

        console.log(`[DEBUG] 图表初始化成功: #${elementId}`);

        // 添加窗口大小变化监听器
        window.addEventListener('resize', () => {
            if (chart) {
                chart.resize();
            }
        });

        return chart;
    } catch (error) {
        console.error(`[DEBUG] 初始化图表失败 #${elementId}:`, error);

        // 尝试使用备用方法
        try {
            console.log(`[DEBUG] 尝试使用备用方法初始化图表: #${elementId}`);

            // 清空容器内容
            element.innerHTML = '';

            // 创建一个新的内部容器
            const innerContainer = document.createElement('div');
            innerContainer.style.width = '100%';
            innerContainer.style.height = '100%';
            element.appendChild(innerContainer);

            // 在新容器上初始化
            const chart = window.echarts.init(innerContainer);
            console.log(`[DEBUG] 备用方法初始化成功: #${elementId}`);
            return chart;
        } catch (backupError) {
            console.error(`[DEBUG] 备用初始化方法也失败 #${elementId}:`, backupError);
            return null;
        }
    }
}

/**
 * 初始化所有图表
 */
function initCharts() {
    console.log('[DEBUG] 开始初始化图表，添加延迟以确保容器尺寸正确');

    // 检查容器是否存在并设置最小高度
    const ensureContainers = () => {
        const containers = ['radar-chart', 'bar-chart', 'compare-chart'];
        let allExist = true;

        containers.forEach(id => {
            const container = document.getElementById(id);
            if (!container) {
                console.warn(`[DEBUG] 图表容器 #${id} 不存在`);
                allExist = false;
            } else {
                // 确保容器有最小高度
                if (container.clientHeight < 100) {
                    container.style.minHeight = '400px';
                    console.log(`[DEBUG] 设置 #${id} 最小高度为 400px`);
                }

                // 确保容器宽度不为零
                if (container.clientWidth < 100) {
                    container.style.minWidth = '100%';
                    console.log(`[DEBUG] 设置 #${id} 最小宽度为 100%`);
                }

                // 确保容器可见
                const parent = container.closest('.card');
                if (parent) {
                    const isVisible = window.getComputedStyle(parent).display !== 'none';
                    console.log(`[DEBUG] 容器 #${id} 的父元素可见性: ${isVisible}`);

                    // 如果父元素不可见，临时使其可见以便初始化
                    if (!isVisible) {
                        const originalDisplay = parent.style.display;
                        parent.style.display = 'block';
                        parent.dataset.originalDisplay = originalDisplay;
                        console.log(`[DEBUG] 临时使 #${id} 的父元素可见`);
                    }
                }

                // 确保父级容器也有足够的高度
                const cardBody = container.closest('.card-body');
                if (cardBody && cardBody.clientHeight < 100) {
                    cardBody.style.minHeight = '400px';
                    console.log(`[DEBUG] 设置卡片体 #${cardBody.id || 'card-body'} 最小高度为 400px`);
                }
            }
        });

        return allExist;
    };

    // 恢复容器原始可见性
    const restoreContainers = () => {
        const containers = ['radar-chart', 'bar-chart', 'compare-chart'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                const parent = container.closest('.card');
                if (parent && parent.dataset.originalDisplay !== undefined) {
                    parent.style.display = parent.dataset.originalDisplay;
                    delete parent.dataset.originalDisplay;
                    console.log(`[DEBUG] 恢复 #${id} 的父元素原始可见性`);
                }
            }
        });
    };

    // 初始化重试计数
    let retryCount = 0;
    const maxRetries = 5; // 增加最大重试次数

    // 初始化函数
    const initChartsWithRetry = () => {
        console.log(`[DEBUG] 尝试初始化图表，尝试次数: ${retryCount + 1}`);

        // 确保容器存在
        const containersExist = ensureContainers();

        if (!containersExist && retryCount < maxRetries) {
            // 如果容器不存在且未超过最大重试次数，延迟后重试
            retryCount++;
            console.log(`[DEBUG] 容器不存在，${500 * retryCount}ms 后重试`);
            setTimeout(initChartsWithRetry, 500 * retryCount);
            return;
        }

        // 初始化图表
        try {
            // 确保仪表板视图可见
            const dashboardView = document.getElementById('dashboard-view');
            const wasHidden = dashboardView && dashboardView.classList.contains('d-none');

            if (wasHidden) {
                console.log('[DEBUG] 仪表板视图隐藏，临时显示以初始化图表');
                dashboardView.classList.remove('d-none');
            }

            // 初始化雷达图
            if (!radarChart) {
                radarChart = safeInitChart('radar-chart');
            }

            // 初始化柱状图
            if (!barChart) {
                barChart = safeInitChart('bar-chart');
            }

            // 初始化对比图
            if (!compareChart) {
                compareChart = safeInitChart('compare-chart');
            }

            // 强制重绘图表
            forceResizeCharts();

            // 恢复仪表板视图状态
            if (wasHidden) {
                console.log('[DEBUG] 恢复仪表板视图隐藏状态');
                dashboardView.classList.add('d-none');
            }

            // 恢复容器原始可见性
            restoreContainers();

            console.log('[DEBUG] 图表初始化完成，已强制重绘');

            // 添加额外的延迟重绘，确保在页面完全加载后图表正确显示
            setTimeout(() => {
                forceResizeCharts();
                console.log('[DEBUG] 额外的延迟重绘完成');

                // 测试图表是否正常工作
                testCharts();
            }, 1000);
        } catch (error) {
            console.error('[DEBUG] 初始化图表时出错:', error);

            if (retryCount < maxRetries) {
                // 如果未超过最大重试次数，延迟后重试
                retryCount++;
                console.log(`[DEBUG] 初始化失败，${500 * retryCount}ms 后重试`);
                setTimeout(initChartsWithRetry, 500 * retryCount);
            } else {
                console.error('[DEBUG] 达到最大重试次数，初始化失败');
                // 恢复容器原始可见性
                restoreContainers();

                // 最后尝试使用备用方法初始化
                console.log('[DEBUG] 尝试使用备用方法初始化图表');
                tryBackupInitialization();
            }
        }
    };

    // 备用初始化方法
    const tryBackupInitialization = () => {
        console.log('[DEBUG] 执行备用初始化方法');

        try {
            // 直接在容器上设置内联样式
            const containers = ['radar-chart', 'bar-chart', 'compare-chart'];
            containers.forEach(id => {
                const container = document.getElementById(id);
                if (container) {
                    container.style.width = '100%';
                    container.style.height = '400px';
                    container.style.position = 'relative';
                    console.log(`[DEBUG] 备用方法：设置 #${id} 的内联样式`);
                }
            });

            // 强制重新创建图表实例
            if (radarChart) {
                radarChart.dispose();
                radarChart = null;
            }
            if (barChart) {
                barChart.dispose();
                barChart = null;
            }
            if (compareChart) {
                compareChart.dispose();
                compareChart = null;
            }

            // 重新初始化
            setTimeout(() => {
                radarChart = safeInitChart('radar-chart');
                barChart = safeInitChart('bar-chart');
                compareChart = safeInitChart('compare-chart');

                // 测试图表
                testCharts();
            }, 500);
        } catch (error) {
            console.error('[DEBUG] 备用初始化方法失败:', error);
        }
    };

    // 使用setTimeout延迟初始化，确保DOM完全加载
    setTimeout(initChartsWithRetry, 500);

    // 设置图表响应式
    window.addEventListener('resize', () => {
        forceResizeCharts();
    });

    // 监听视图切换事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            // 延迟重绘图表，确保在视图切换后图表正确显示
            setTimeout(() => {
                forceResizeCharts();
                console.log('[DEBUG] 视图切换后重绘图表');
            }, 300);
        });
    });

    // 添加MutationObserver监听DOM变化，当容器可见性变化时重绘图表
    const chartContainers = ['radar-chart', 'bar-chart', 'compare-chart'];
    chartContainers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style' ||
                        mutation.attributeName === 'class') {
                        console.log(`[DEBUG] 检测到 #${id} 容器变化，重绘图表`);
                        forceResizeCharts();
                    }
                });
            });

            observer.observe(container, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });

            // 同时监听父元素的变化
            const parent = container.closest('.card');
            if (parent) {
                const parentObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'style' ||
                            mutation.attributeName === 'class') {
                            console.log(`[DEBUG] 检测到 #${id} 父元素变化，重绘图表`);
                            forceResizeCharts();
                        }
                    });
                });

                parentObserver.observe(parent, {
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
        }
    });

    // 监听仪表板视图的可见性变化
    const dashboardView = document.getElementById('dashboard-view');
    if (dashboardView) {
        const dashboardObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isVisible = !dashboardView.classList.contains('d-none');
                    console.log(`[DEBUG] 仪表板视图可见性变化: ${isVisible ? '可见' : '隐藏'}`);

                    if (isVisible) {
                        // 当仪表板变为可见时，重绘图表
                        setTimeout(() => {
                            forceResizeCharts();
                            console.log('[DEBUG] 仪表板视图变为可见，重绘图表');
                        }, 100);
                    }
                }
            });
        });

        dashboardObserver.observe(dashboardView, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
}

/**
 * 强制重绘所有图表
 */
function forceResizeCharts() {
    console.log('[DEBUG] 强制重绘所有图表');
    if (radarChart) {
        radarChart.resize();
        console.log('[DEBUG] 雷达图重绘完成');
    }
    if (barChart) {
        barChart.resize();
        console.log('[DEBUG] 柱状图重绘完成');
    }
    if (compareChart) {
        compareChart.resize();
        console.log('[DEBUG] 对比图重绘完成');
    }
}

/**
 * 更新维度占比饼图
 * @param {Object} dimensionAverages - 维度平均分对象
 */
function updateRadarChart(dimensionAverages) {
    console.log(`[DEBUG] 开始更新维度占比饼图，数据:`, dimensionAverages);

    if (!radarChart) {
        console.error(`[DEBUG] 饼图实例不存在，无法更新`);
        return;
    }

    if (!dimensionAverages || typeof dimensionAverages !== 'object') {
        console.error(`[DEBUG] 维度平均分数据无效:`, dimensionAverages);
        return;
    }

    // 获取实际存在的维度
    const validDimensions = getAllDimensions();
    console.log(`[DEBUG] 实际存在的维度:`, validDimensions);

    // 过滤数据，只保留实际存在的维度
    const filteredData = {};
    validDimensions.forEach(dim => {
        if (dimensionAverages[dim] !== undefined) {
            filteredData[dim] = dimensionAverages[dim];
        }
    });

    console.log(`[DEBUG] 过滤后的维度数据:`, filteredData);

    // 检查是否有有效数据
    if (Object.keys(filteredData).length === 0) {
        console.warn(`[DEBUG] 没有有效的维度数据，无法更新饼图`);
        return;
    }

    // 准备饼图数据
    const data = Object.keys(filteredData).map((dim, index) => ({
        name: formatDimensionNameEn(dim),
        value: filteredData[dim],
        itemStyle: {
            color: CHART_COLORS.gradients[index % 5][0]
        }
    }));

    // 按值排序
    data.sort((a, b) => b.value - a.value);

    console.log(`[DEBUG] 饼图数据:`, data);

    // 设置饼图选项
    const option = {
        title: {
            text: 'Dimension Proportion',
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#333'
            },
            padding: [20, 0, 0, 0]
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                return `<div style="font-weight:bold;margin-bottom:5px;">${params.name}</div>` +
                       `<div>${params.marker} Score: ${params.value}</div>` +
                       `<div>Proportion: ${params.percent}%</div>`;
            }
        },
        legend: {
            orient: 'horizontal',
            bottom: 10,
            data: data.map(item => item.name),
            type: 'scroll',
            pageIconSize: 12,
            pageTextStyle: {
                color: '#666'
            },
            textStyle: {
                color: '#666',
                fontSize: 12
            }
        },
        series: [
            {
                name: 'Score',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{b}: {c}',
                    fontSize: 12,
                    fontWeight: 'bold'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                labelLine: {
                    show: true,
                    length: 15,
                    length2: 10,
                    smooth: true
                },
                data: data,
                animationType: 'scale',
                animationEasing: 'elasticOut',
                animationDelay: function (idx) {
                    return idx * 100;
                }
            }
        ]
    };

    // 设置图表选项
    console.log(`[DEBUG] 设置饼图选项:`, option);
    try {
        radarChart.setOption(option);
        console.log(`[DEBUG] 饼图选项设置成功`);

        // 强制重绘
        setTimeout(() => {
            radarChart.resize();
            console.log(`[DEBUG] 饼图强制重绘完成`);
        }, 100);
    } catch (error) {
        console.error(`[DEBUG] 设置饼图选项失败:`, error);
    }
}

/**
 * 更新MAG分数分布图
 * @param {Object} dimensionAverages - 维度平均分对象
 * @param {Array} evaluations - 评估数据数组，用于计算MAG分布
 */
function updateBarChart(dimensionAverages, evaluations) {
    console.log(`[DEBUG] 开始更新MAG分数分布图，数据:`, dimensionAverages);
    console.log(`[DEBUG] 评估数据数量:`, evaluations ? evaluations.length : 0);

    if (!barChart) {
        console.error(`[DEBUG] 图表实例不存在，无法更新`);
        return;
    }

    // MAG是一个独立的字段，不是评分维度
    const MAG_FIELD = 'MAG';

    // 如果没有评估数据，使用维度平均分
    if (!evaluations || evaluations.length === 0) {
        console.warn(`[DEBUG] 没有评估数据，无法计算MAG分布`);

        // 创建一个简单的散点图，显示所有维度的平均分
        const data = [];
        Object.keys(dimensionAverages).forEach(dim => {
            if (dim !== 'average_score' &&
                typeof dimensionAverages[dim] === 'number' &&
                !dim.includes('_id') &&
                dim !== 'MAG') {
                data.push([formatDimensionNameEn(dim), dimensionAverages[dim]]);
            }
        });

        console.log(`[DEBUG] 维度数据:`, data);

        // 排序数据
        data.sort((a, b) => a[1] - b[1]);

        // 设置图表选项
        const option = {
            title: {
                text: 'Dimension Score Distribution',
                left: 'center',
                textStyle: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333'
                },
                padding: [20, 0, 0, 0]
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const param = params[0];
                    return `<div style="font-weight:bold;margin-bottom:5px;">${param.name}</div>` +
                           `<div>${param.marker} Score: ${param.value[1].toFixed(1)}</div>`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: data.map(item => item[0]),
                axisLabel: {
                    interval: 0,
                    rotate: 45,
                    fontSize: 11,
                    color: '#666'
                }
            },
            yAxis: {
                type: 'value',
                name: 'Score',
                nameLocation: 'middle',
                nameGap: 30,
                min: 0,
                max: 10,
                splitNumber: 5
            },
            series: [{
                name: 'Score',
                type: 'line',
                data: data.map(item => item[1]),
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: {
                    color: CHART_COLORS.primary
                },
                lineStyle: {
                    width: 3,
                    color: CHART_COLORS.primary
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(74, 107, 255, 0.6)' },
                        { offset: 1, color: 'rgba(74, 107, 255, 0.1)' }
                    ])
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: function(params) {
                        return params.value.toFixed(1);
                    },
                    fontSize: 12,
                    fontWeight: 'bold'
                }
            }]
        };

        try {
            barChart.setOption(option);
            console.log(`[DEBUG] 维度分数分布图选项设置成功`);
        } catch (error) {
            console.error(`[DEBUG] 设置维度分数分布图选项失败:`, error);
        }

        return;
    }

    // 打印评估数据的第一个样本，以便了解数据结构
    if (evaluations.length > 0) {
        console.log(`[DEBUG] 评估数据样本:`, evaluations[0]);
        console.log(`[DEBUG] 样本中的MAG字段:`, evaluations[0][MAG_FIELD]);

        // 检查所有样本中的MAG字段
        const magValues = evaluations.map(eval => eval[MAG_FIELD]).filter(Boolean);
        console.log(`[DEBUG] 所有MAG值:`, magValues);
        console.log(`[DEBUG] 唯一MAG值:`, [...new Set(magValues)]);
    }

    // 按MAG值分组
    const magGroups = {};

    // 遍历所有评估数据
    evaluations.forEach(eval => {
        if (eval[MAG_FIELD]) {
            // 使用MAG字段的值作为分组键
            const magValue = eval[MAG_FIELD];

            // 初始化分组
            if (!magGroups[magValue]) {
                magGroups[magValue] = {
                    count: 0,
                    totalScore: 0
                };
            }

            // 计算该评估的平均分
            let totalScore = 0;
            let dimensionCount = 0;

            // 计算评分维度的平均值
            Object.keys(eval).forEach(dim => {
                if (typeof eval[dim] === 'number' &&
                    dim !== 'timestamp' &&
                    dim !== 'id' &&
                    dim !== 'average_score' &&
                    dim !== MAG_FIELD && // 排除MAG字段本身
                    !dim.includes('_id')) {
                    totalScore += eval[dim];
                    dimensionCount++;
                }
            });

            // 如果有average_score字段，直接使用
            const avgScore = eval.average_score || (dimensionCount > 0 ? totalScore / dimensionCount : 0);

            // 更新分组数据
            magGroups[magValue].count++;
            magGroups[magValue].totalScore += avgScore;
        }
    });

    console.log(`[DEBUG] MAG分组:`, magGroups);

    // 如果没有有效的MAG分组，显示一个提示
    if (Object.keys(magGroups).length === 0) {
        console.warn(`[DEBUG] 没有有效的MAG分组数据`);

        // 设置一个空图表
        const option = {
            title: {
                text: 'MAG Correlation Chart (No Data)',
                left: 'center',
                textStyle: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#333'
                },
                padding: [20, 0, 0, 0]
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: []
            },
            yAxis: {
                type: 'value'
            },
            series: []
        };

        try {
            barChart.setOption(option);
            console.log(`[DEBUG] 空MAG图表设置成功`);
        } catch (error) {
            console.error(`[DEBUG] 设置空MAG图表失败:`, error);
        }

        return;
    }

    // 计算每个MAG组的平均分
    const data = [];
    Object.keys(magGroups).forEach(mag => {
        const group = magGroups[mag];
        const avgScore = group.totalScore / group.count;
        data.push([mag, avgScore, group.count]);
    });

    // 排序数据（按MAG值）
    data.sort((a, b) => {
        // 尝试提取MAG值中的数字部分进行排序
        const numA = a[0].match(/\d+/);
        const numB = b[0].match(/\d+/);

        if (numA && numB) {
            return parseInt(numA[0]) - parseInt(numB[0]);
        }

        // 如果无法提取数字，按字符串排序
        return a[0].localeCompare(b[0]);
    });

    console.log(`[DEBUG] 排序后的MAG数据:`, data);

    // 设置图表选项
    const option = {
        title: {
            text: 'MAG Correlation Chart',
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#333'
            },
            padding: [20, 0, 0, 0]
        },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const param = params[0];
                return `<div style="font-weight:bold;margin-bottom:5px;">MAG: ${param.value[0]}</div>` +
                       `<div>${param.marker} Average Score: ${param.value[1].toFixed(2)}</div>` +
                       `<div>Sample Count: ${param.value[2]}</div>`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            name: 'MAG',
            nameLocation: 'middle',
            nameGap: 30,
            data: data.map(item => item[0]),
            axisLabel: {
                interval: 0,
                fontSize: 12,
                color: '#666'
            }
        },
        yAxis: {
            type: 'value',
            name: 'Average Score',
            nameLocation: 'middle',
            nameGap: 40,
            min: 0,
            max: 10,
            splitNumber: 5
        },
        series: [{
            name: 'Average Score',
            type: 'line',
            data: data.map(item => [item[0], item[1], item[2]]),
            smooth: true,
            symbol: 'circle',
            symbolSize: function(value) {
                // 根据样本数量调整点的大小
                const count = value[2];
                return Math.max(8, Math.min(20, 8 + count / 2));
            },
            itemStyle: {
                color: CHART_COLORS.primary
            },
            lineStyle: {
                width: 3,
                color: CHART_COLORS.primary
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(74, 107, 255, 0.6)' },
                    { offset: 1, color: 'rgba(74, 107, 255, 0.1)' }
                ])
            },
            label: {
                show: true,
                position: 'top',
                formatter: function(params) {
                    return params.value[1].toFixed(1);
                },
                fontSize: 12,
                fontWeight: 'bold'
            }
        }]
    };

    // 设置图表选项
    console.log(`[DEBUG] 设置MAG分数分布图选项:`, option);
    try {
        barChart.setOption(option);
        console.log(`[DEBUG] MAG分数分布图选项设置成功`);
    } catch (error) {
        console.error(`[DEBUG] 设置MAG分数分布图选项失败:`, error);
    }
}

/**
 * 更新对比图
 * @param {Array} compareItems - 要对比的评估项数组
 */
function updateCompareChart(compareItems) {
    if (!compareChart || !compareItems || compareItems.length === 0) return;

    // 获取所有维度
    const dimensions = new Set();
    compareItems.forEach(item => {
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'number' &&
                key !== 'timestamp' &&
                key !== 'id' &&
                key !== 'average_score' &&
                !key.includes('_id')) {
                dimensions.add(key);
            }
        });
    });

    // 转换为数组并排序
    const dimensionArray = Array.from(dimensions).sort();

    // 准备雷达图数据
    const indicator = dimensionArray.map(dim => ({
        name: formatDimensionName(dim),
        max: 10
    }));

    const seriesData = compareItems.map((item, index) => ({
        value: dimensionArray.map(dim => item[dim] || 0),
        name: `评估 ${index + 1}`,
        lineStyle: {
            width: 2,
            color: CHART_COLORS.gradients[index % 5][0],
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowBlur: 5
        },
        areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: `${CHART_COLORS.gradients[index % 5][0]}80` },
                { offset: 1, color: `${CHART_COLORS.gradients[index % 5][1]}20` }
            ]),
            opacity: 0.7
        },
        itemStyle: {
            color: CHART_COLORS.gradients[index % 5][0],
            borderColor: '#fff',
            borderWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowBlur: 5
        }
    }));

    // 设置雷达图选项
    const option = {
        title: {
            text: '评估结果对比',
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#333'
            },
            padding: [20, 0, 0, 0]
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e2e2e2',
            borderWidth: 1,
            textStyle: {
                color: '#333'
            },
            formatter: function(params) {
                const dimIndex = params.dataIndex;
                const dim = dimensionArray[dimIndex];
                return `<div style="font-weight:bold;margin-bottom:5px;">${params.name}</div>` +
                       `<div>${params.marker} ${formatDimensionName(dim)}: ${params.value}</div>`;
            }
        },
        legend: {
            data: compareItems.map((_, index) => `评估 ${index + 1}`),
            orient: 'horizontal',
            bottom: 0,
            itemWidth: 15,
            itemHeight: 10,
            textStyle: {
                color: '#666'
            },
            itemGap: 20,
            padding: [15, 0]
        },
        radar: {
            indicator: indicator,
            shape: 'circle',
            splitNumber: 5,
            center: ['50%', '50%'],
            radius: '65%',
            axisName: {
                color: '#666',
                fontSize: 12,
                padding: [3, 5]
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(211, 220, 235, 0.8)',
                    width: 1
                }
            },
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(255, 255, 255, 0.5)', 'rgba(245, 250, 255, 0.5)'],
                    shadowColor: 'rgba(0, 0, 0, 0.05)',
                    shadowBlur: 10
                }
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(211, 220, 235, 0.8)'
                }
            }
        },
        series: [{
            type: 'radar',
            data: seriesData,
            symbol: 'circle',
            symbolSize: 6,
            emphasis: {
                lineStyle: {
                    width: 4
                },
                itemStyle: {
                    shadowBlur: 10
                }
            }
        }],
        animation: true,
        animationDuration: 1000,
        animationEasing: 'elasticOut'
    };

    // 设置图表选项
    compareChart.setOption(option);
}

/**
 * 获取所有维度列表
 * @returns {Array} 所有维度的数组
 */
function getAllDimensions() {
    // 只返回实际存在的4个维度
    console.log('[DEBUG] 获取实际存在的维度列表');
    return [
        'hallucination_control',
        'quality',
        'professionalism',
        'usefulness'
    ];
}

/**
 * 格式化维度名称（中文）
 * @param {string} dimension - 维度名称
 * @returns {string} 格式化后的维度名称
 */
function formatDimensionName(dimension) {
    // 直接调用英文版本，确保所有地方都使用英文
    console.log('[DEBUG] 调用formatDimensionName，转为使用英文版本');
    return formatDimensionNameEn(dimension);
}

/**
 * 格式化维度名称（英文）
 * @param {string} dimension - 维度名称
 * @returns {string} 格式化后的英文维度名称
 */
function formatDimensionNameEn(dimension) {
    // 只保留4个实际使用的维度的映射
    const dimensionMapEn = {
        'hallucination_control': 'Hallucination Control',
        'quality': 'Quality',
        'professionalism': 'Professionalism',
        'usefulness': 'Usefulness'
    };

    return dimensionMapEn[dimension] || dimension.replace(/_/g, ' ');
}

/**
 * 测试图表初始化和渲染
 * 用于检查 ECharts 库是否正确加载和图表容器是否正确初始化
 */
function testCharts() {
    console.log(`[DEBUG] 开始测试图表初始化和渲染`);

    // 检查 ECharts 库是否已加载
    if (typeof echarts === 'undefined') {
        console.error(`[DEBUG] ECharts 库未加载，无法初始化图表`);
        return;
    } else {
        console.log(`[DEBUG] ECharts 库已加载，版本:`, echarts.version);
    }

    // 检查图表容器
    const containers = ['radar-chart', 'bar-chart', 'compare-chart'];
    containers.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`[DEBUG] 图表容器元素不存在: #${id}`);
        } else {
            const width = element.clientWidth;
            const height = element.clientHeight;
            console.log(`[DEBUG] 图表容器 #${id} 尺寸: width=${width}, height=${height}`);

            if (width === 0 || height === 0) {
                console.warn(`[DEBUG] 图表容器 #${id} 尺寸为零: width=${width}, height=${height}`);
                // 尝试设置最小高度
                element.style.minHeight = '400px';
                console.log(`[DEBUG] 已设置 #${id} 最小高度为 400px`);
            }
        }
    });

    // 测试雷达图 - 只使用4个实际维度
    const testRadarData = {
        hallucination_control: 8,
        quality: 7,
        professionalism: 6,
        usefulness: 5
    };

    console.log(`[DEBUG] 测试雷达图，使用测试数据:`, testRadarData);
    updateRadarChart(testRadarData);

    // 测试柱状图
    console.log(`[DEBUG] 测试柱状图，使用测试数据:`, testRadarData);
    updateBarChart(testRadarData);
}

// 将函数暴露到全局作用域，以便 main.js 可以访问
window.updateRadarChart = updateRadarChart;
window.updateBarChart = updateBarChart;
window.updateCompareChart = updateCompareChart;
window.formatDimensionName = formatDimensionName;
window.formatDimensionNameEn = formatDimensionNameEn;
window.getAllDimensions = getAllDimensions;
window.testCharts = testCharts;
window.initCharts = initCharts;
window.forceResizeCharts = forceResizeCharts;

// 添加一个诊断函数，可以从控制台调用
window.diagnoseDashboard = function() {
    console.log('======= 开始诊断仪表板 =======');

    // 检查视图状态
    const dashboardView = document.getElementById('dashboard-view');
    console.log('仪表板视图可见性:',
        dashboardView ?
        (dashboardView.classList.contains('d-none') ? '隐藏' : '可见') :
        '元素不存在');

    // 检查图表容器
    const containers = ['radar-chart', 'bar-chart', 'compare-chart'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (!container) {
            console.log(`图表容器 #${id}: 不存在`);
        } else {
            const rect = container.getBoundingClientRect();
            const styles = window.getComputedStyle(container);
            console.log(`图表容器 #${id}:`, {
                width: rect.width,
                height: rect.height,
                display: styles.display,
                visibility: styles.visibility,
                position: styles.position,
                parent: container.parentElement ? container.parentElement.id || container.parentElement.tagName : 'none'
            });
        }
    });

    // 检查图表实例
    console.log('图表实例状态:', {
        radarChart: radarChart ? '已初始化' : '未初始化',
        barChart: barChart ? '已初始化' : '未初始化',
        compareChart: compareChart ? '已初始化' : '未初始化'
    });

    // 尝试重新初始化图表
    console.log('尝试重新初始化图表...');
    initCharts();

    // 强制重绘
    setTimeout(() => {
        console.log('强制重绘图表...');
        forceResizeCharts();

        // 使用测试数据更新图表
        const testData = {
            hallucination_control: 8,
            quality: 7,
            professionalism: 6,
            usefulness: 5
        };

        console.log('使用测试数据更新图表...');
        updateRadarChart(testData);
        updateBarChart(testData);

        console.log('======= 诊断完成 =======');
    }, 1000);
};
