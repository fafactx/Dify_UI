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
 * 初始化所有图表
 */
function initCharts() {
    // 初始化雷达图
    radarChart = echarts.init(document.getElementById('radar-chart'));
    
    // 初始化柱状图
    barChart = echarts.init(document.getElementById('bar-chart'));
    
    // 初始化对比图
    compareChart = echarts.init(document.getElementById('compare-chart'));
    
    // 设置图表响应式
    window.addEventListener('resize', () => {
        radarChart.resize();
        barChart.resize();
        compareChart.resize();
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
                { offset: 0, color: 'rgba(74, 107, 255, 0.8)' },
                { offset: 1, color: 'rgba(74, 107, 255, 0.2)' }
            ])
        }
    }];
    
    // 设置雷达图选项
    const option = {
        tooltip: {
            trigger: 'item'
        },
        radar: {
            indicator: indicator,
            shape: 'circle',
            splitNumber: 5,
            axisName: {
                color: '#666',
                fontSize: 12
            },
            splitLine: {
                lineStyle: {
                    color: ['#ddd', '#ccc', '#bbb', '#aaa', '#999']
                }
            },
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(250, 250, 250, 0.3)', 'rgba(240, 240, 240, 0.3)']
                }
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd'
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
                color: CHART_COLORS.primary
            },
            emphasis: {
                lineStyle: {
                    width: 5
                }
            }
        }]
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
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel: {
                interval: 0,
                rotate: 30,
                fontSize: 12
            }
        },
        yAxis: {
            type: 'value',
            max: 10,
            splitNumber: 5
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
                borderRadius: [5, 5, 0, 0]
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            label: {
                show: true,
                position: 'top',
                formatter: '{c}'
            },
            barWidth: '50%'
        }]
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
            color: CHART_COLORS.gradients[index % 5][0]
        },
        areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: `${CHART_COLORS.gradients[index % 5][0]}80` },
                { offset: 1, color: `${CHART_COLORS.gradients[index % 5][1]}20` }
            ])
        }
    }));
    
    // 设置雷达图选项
    const option = {
        tooltip: {
            trigger: 'item'
        },
        legend: {
            data: compareItems.map((_, index) => `评估 ${index + 1}`),
            orient: 'vertical',
            right: 10,
            top: 10
        },
        radar: {
            indicator: indicator,
            shape: 'circle',
            splitNumber: 5,
            axisName: {
                color: '#666',
                fontSize: 12
            },
            splitLine: {
                lineStyle: {
                    color: ['#ddd', '#ccc', '#bbb', '#aaa', '#999']
                }
            },
            splitArea: {
                show: true,
                areaStyle: {
                    color: ['rgba(250, 250, 250, 0.3)', 'rgba(240, 240, 240, 0.3)']
                }
            },
            axisLine: {
                lineStyle: {
                    color: '#ddd'
                }
            }
        },
        series: [{
            type: 'radar',
            data: seriesData,
            symbol: 'circle',
            symbolSize: 6
        }]
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
