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
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`图表容器元素不存在: #${elementId}`);
        return null;
    }

    try {
        return echarts.init(element);
    } catch (error) {
        console.error(`初始化图表失败 #${elementId}:`, error);
        return null;
    }
}

/**
 * 初始化所有图表
 */
function initCharts() {
    // 初始化雷达图
    radarChart = safeInitChart('radar-chart');

    // 初始化柱状图
    barChart = safeInitChart('bar-chart');

    // 初始化对比图
    compareChart = safeInitChart('compare-chart');

    // 设置图表响应式
    window.addEventListener('resize', () => {
        if (radarChart) radarChart.resize();
        if (barChart) barChart.resize();
        if (compareChart) compareChart.resize();
    });
}

/**
 * 更新雷达图
 * @param {Object} dimensionAverages - 维度平均分对象
 */
function updateRadarChart(dimensionAverages) {
    if (!radarChart) return;

    // 过滤掉非数值属性
    const dimensions = Object.keys(dimensionAverages).filter(key =>
        typeof dimensionAverages[key] === 'number' && key !== 'average_score'
    );

    // 准备雷达图数据
    const indicator = dimensions.map(dim => ({
        name: formatDimensionName(dim),
        max: 10
    }));

    const seriesData = [{
        value: dimensions.map(dim => dimensionAverages[dim]),
        name: '平均分',
        areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(74, 107, 255, 0.6)' },
                { offset: 1, color: 'rgba(74, 107, 255, 0.1)' }
            ])
        }
    }];

    // 设置雷达图选项
    const option = {
        title: {
            text: '维度评分雷达图',
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
                const dim = dimensions[dimIndex];
                return `<div style="font-weight:bold;margin-bottom:5px;">${params.name}</div>` +
                       `<div>${params.marker} ${formatDimensionName(dim)}: ${params.value}</div>`;
            }
        },
        radar: {
            indicator: indicator,
            shape: 'circle',
            splitNumber: 5,
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
            symbolSize: 8,
            lineStyle: {
                width: 3,
                color: CHART_COLORS.primary,
                shadowColor: 'rgba(74, 107, 255, 0.3)',
                shadowBlur: 5
            },
            emphasis: {
                lineStyle: {
                    width: 5
                },
                itemStyle: {
                    shadowColor: 'rgba(74, 107, 255, 0.5)',
                    shadowBlur: 10
                }
            },
            itemStyle: {
                color: CHART_COLORS.primary,
                borderColor: '#fff',
                borderWidth: 2
            }
        }],
        animation: true,
        animationDuration: 1000,
        animationEasing: 'elasticOut'
    };

    // 设置图表选项
    radarChart.setOption(option);
}

/**
 * 更新柱状图
 * @param {Object} dimensionAverages - 维度平均分对象
 */
function updateBarChart(dimensionAverages) {
    if (!barChart) return;

    // 过滤掉非数值属性
    const dimensions = Object.keys(dimensionAverages).filter(key =>
        typeof dimensionAverages[key] === 'number' && key !== 'average_score'
    );

    // 按值排序
    dimensions.sort((a, b) => dimensionAverages[b] - dimensionAverages[a]);

    // 准备柱状图数据
    const xAxisData = dimensions.map(dim => formatDimensionName(dim));
    const seriesData = dimensions.map(dim => dimensionAverages[dim]);

    // 设置柱状图选项
    const option = {
        title: {
            text: '维度评分排名',
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
            axisPointer: {
                type: 'shadow',
                shadowStyle: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e2e2e2',
            borderWidth: 1,
            textStyle: {
                color: '#333'
            },
            formatter: function(params) {
                const param = params[0];
                return `<div style="font-weight:bold;margin-bottom:5px;">${param.name}</div>` +
                       `<div>${param.marker} ${param.seriesName}: ${param.value}</div>`;
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
            data: xAxisData,
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 12,
                color: '#666',
                margin: 15
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd'
                }
            },
            axisTick: {
                alignWithLabel: true,
                lineStyle: {
                    color: '#ddd'
                }
            }
        },
        yAxis: {
            type: 'value',
            max: 10,
            splitNumber: 5,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: '#eee',
                    type: 'dashed'
                }
            },
            axisLabel: {
                color: '#666'
            }
        },
        series: [{
            name: '平均分',
            type: 'bar',
            data: seriesData,
            itemStyle: {
                color: function(params) {
                    // 使用渐变色
                    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: CHART_COLORS.gradients[params.dataIndex % 5][0] },
                        { offset: 1, color: CHART_COLORS.gradients[params.dataIndex % 5][1] }
                    ]);
                },
                borderRadius: [5, 5, 0, 0],
                shadowColor: 'rgba(0, 0, 0, 0.1)',
                shadowBlur: 5,
                shadowOffsetY: 2
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 15,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                }
            },
            label: {
                show: true,
                position: 'top',
                formatter: '{c}',
                fontSize: 12,
                fontWeight: 'bold',
                color: '#555'
            },
            barWidth: '60%',
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
                return idx * 100;
            }
        }],
        animation: true,
        animationDuration: 1000,
        animationEasing: 'elasticOut'
    };

    // 设置图表选项
    barChart.setOption(option);
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
 * 格式化维度名称
 * @param {string} dimension - 维度名称
 * @returns {string} 格式化后的维度名称
 */
function formatDimensionName(dimension) {
    // 维度名称映射
    const dimensionMap = {
        'factual_accuracy': '事实准确性',
        'hallucination_control': '幻觉控制',
        'professionalism': '专业性',
        'practicality': '实用性',
        'technical_depth': '技术深度',
        'context_relevance': '上下文相关性',
        'solution_completeness': '解决方案完整性',
        'actionability': '可操作性',
        'clarity_structure': '清晰度和结构',
        'quality': '质量',
        'usefulness': '实用性'
    };

    return dimensionMap[dimension] || dimension.replace(/_/g, ' ');
}

// 将函数暴露到全局作用域，以便 main.js 可以访问
window.updateRadarChart = updateRadarChart;
window.updateBarChart = updateBarChart;
window.updateCompareChart = updateCompareChart;
window.formatDimensionName = formatDimensionName;
