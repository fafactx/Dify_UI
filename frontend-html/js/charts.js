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
    if (typeof echarts === 'undefined') {
        console.error(`[DEBUG] ECharts 库未加载，无法初始化图表: #${elementId}`);
        return null;
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

    if (width === 0 || height === 0) {
        console.warn(`[DEBUG] 图表容器尺寸为零: #${elementId}, width=${width}, height=${height}`);
        // 尝试设置最小高度
        element.style.minHeight = '400px';
        console.log(`[DEBUG] 已设置最小高度为 400px`);
    }

    try {
        console.log(`[DEBUG] 调用 echarts.init() 初始化图表: #${elementId}`);
        const chart = echarts.init(element);
        console.log(`[DEBUG] 图表初始化成功: #${elementId}`);
        return chart;
    } catch (error) {
        console.error(`[DEBUG] 初始化图表失败 #${elementId}:`, error);
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

    // 获取所有维度
    const allDimensions = getAllDimensions();
    console.log(`[DEBUG] 所有维度:`, allDimensions);

    // 过滤掉非数值属性，但保留所有定义的维度
    const dimensions = allDimensions.filter(dim =>
        dim !== 'average_score'
    );

    console.log(`[DEBUG] 过滤后的维度:`, dimensions);

    if (dimensions.length === 0) {
        console.warn(`[DEBUG] 没有有效的维度数据，无法更新饼图`);
        return;
    }

    // 准备饼图数据
    const data = dimensions.map((dim, index) => ({
        name: formatDimensionNameEn(dim),
        value: dimensionAverages[dim] || 0,
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
            formatter: '{a} <br/>{b}: {c} ({d}%)'
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
            if (dim !== 'average_score') {
                data.push([formatDimensionNameEn(dim), dimensionAverages[dim]]);
            }
        });

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
            console.log(`[DEBUG] MAG分数分布图选项设置成功`);
        } catch (error) {
            console.error(`[DEBUG] 设置MAG分数分布图选项失败:`, error);
        }

        return;
    }

    console.log(`[DEBUG] 评估数据样本:`, evaluations[0]);

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
    // 所有支持的维度列表
    return [
        'factual_accuracy',
        'hallucination_control',
        'professionalism',
        'practicality',
        'technical_depth',
        'context_relevance',
        'solution_completeness',
        'actionability',
        'clarity_structure',
        'quality',
        'usefulness'
    ];
}

/**
 * 格式化维度名称（中文）
 * @param {string} dimension - 维度名称
 * @returns {string} 格式化后的维度名称
 */
function formatDimensionName(dimension) {
    // 维度名称映射
    const dimensionMap = {
        'factual_accuracy': '事实准确性',
        'hallucination_control': '幻觉控制',
        'professionalism': '专业性',
        'practicality': '实践性',  // 修改为"实践性"，与 usefulness 区分
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

/**
 * 格式化维度名称（英文）
 * @param {string} dimension - 维度名称
 * @returns {string} 格式化后的英文维度名称
 */
function formatDimensionNameEn(dimension) {
    // 维度名称映射（英文）
    const dimensionMapEn = {
        'factual_accuracy': 'Factual Accuracy',
        'hallucination_control': 'Hallucination Control',
        'professionalism': 'Professionalism',
        'practicality': 'Practicality',
        'technical_depth': 'Technical Depth',
        'context_relevance': 'Context Relevance',
        'solution_completeness': 'Solution Completeness',
        'actionability': 'Actionability',
        'clarity_structure': 'Clarity & Structure',
        'quality': 'Quality',
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

    // 测试雷达图
    const testRadarData = {
        hallucination_control: 8,
        quality: 7,
        professionalism: 6,
        usefulness: 5,
        // 添加其他维度的测试数据
        factual_accuracy: 9,
        practicality: 4,
        technical_depth: 7,
        context_relevance: 8,
        solution_completeness: 6,
        actionability: 5,
        clarity_structure: 7
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
