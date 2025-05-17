// frontend/js/charts.js

// 图表颜色配置
const chartColors = {
  primary: 'rgba(13, 110, 253, 0.7)',
  secondary: 'rgba(108, 117, 125, 0.7)',
  success: 'rgba(25, 135, 84, 0.7)',
  info: 'rgba(13, 202, 240, 0.7)',
  warning: 'rgba(255, 193, 7, 0.7)',
  danger: 'rgba(220, 53, 69, 0.7)',
  light: 'rgba(248, 249, 250, 0.7)',
  dark: 'rgba(33, 37, 41, 0.7)'
};

// 图表实例
let radarChart = null;
let barChart = null;
let detailRadarChart = null;
let trendChart = null;

// 维度标签映射
const dimensionLabels = {
  factual_accuracy: '事实准确性',
  hallucination_control: '幻觉控制',
  professionalism: '专业性',
  practicality: '实用性',
  technical_depth: '技术深度',
  context_relevance: '上下文相关性',
  solution_completeness: '解决方案完整性',
  actionability: '可操作性',
  clarity_structure: '清晰度和结构',
  average_score: '平均分',
  weighted_average: '加权平均分'
};

// 初始化雷达图
function initRadarChart(stats) {
  console.log("initRadarChart 函数开始执行");
  console.log("stats 参数:", JSON.stringify(stats));

  const radarElement = document.getElementById('radarChart');
  if (!radarElement) {
    console.error("找不到 radarChart 元素");
    return;
  }

  const ctx = radarElement.getContext('2d');
  console.log("获取到 canvas 上下文");

  // 如果图表已存在，销毁它
  if (radarChart) {
    console.log("销毁现有雷达图");
    radarChart.destroy();
  }

  // 准备数据
  console.log("dimension_averages:", JSON.stringify(stats.dimension_averages));
  const dimensions = Object.keys(stats.dimension_averages || {}).filter(
    key => key !== 'average_score'
  );
  console.log("过滤后的维度:", dimensions);

  const data = {
    labels: dimensions.map(dim => dimensionLabels[dim] || dim),
    datasets: [{
      label: '平均分',
      data: dimensions.map(dim => stats.dimension_averages[dim]),
      backgroundColor: 'rgba(13, 110, 253, 0.2)',
      borderColor: chartColors.primary,
      borderWidth: 2,
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: chartColors.primary
    }]
  };
  console.log("准备的图表数据:", JSON.stringify(data));

  // 创建图表
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: data,
    options: {
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}分`;
            }
          }
        }
      }
    }
  });
}

// 初始化柱状图
function initBarChart(stats) {
  const ctx = document.getElementById('barChart').getContext('2d');

  // 如果图表已存在，销毁它
  if (barChart) {
    barChart.destroy();
  }

  // 准备数据
  const dimensions = Object.keys(stats.dimension_averages || {}).filter(
    key => key !== 'average_score'
  );

  const data = {
    labels: dimensions.map(dim => dimensionLabels[dim] || dim),
    datasets: [{
      label: '平均分',
      data: dimensions.map(dim => stats.dimension_averages[dim]),
      backgroundColor: Object.values(chartColors),
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1
    }]
  };

  // 创建图表
  barChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}分`;
            }
          }
        }
      }
    }
  });
}

// 初始化详情雷达图
function initDetailRadarChart(item) {
  const ctx = document.getElementById('detailRadarChart').getContext('2d');

  // 如果图表已存在，销毁它
  if (detailRadarChart) {
    detailRadarChart.destroy();
  }

  // 准备数据
  const dimensions = [
    'factual_accuracy', 'hallucination_control', 'professionalism',
    'practicality', 'technical_depth', 'context_relevance',
    'solution_completeness', 'actionability', 'clarity_structure'
  ];

  const data = {
    labels: dimensions.map(dim => dimensionLabels[dim] || dim),
    datasets: [{
      label: '分数',
      data: dimensions.map(dim => item[dim] || 0),
      backgroundColor: 'rgba(13, 110, 253, 0.2)',
      borderColor: chartColors.primary,
      borderWidth: 2,
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: chartColors.primary
    }]
  };

  // 创建图表
  detailRadarChart = new Chart(ctx, {
    type: 'radar',
    data: data,
    options: {
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}分`;
            }
          }
        }
      }
    }
  });
}

// 初始化对比图表
function initCompareChart(items) {
  const ctx = document.getElementById('compareChart').getContext('2d');

  // 准备数据
  const dimensions = [
    'factual_accuracy', 'hallucination_control', 'professionalism',
    'practicality', 'technical_depth', 'context_relevance',
    'solution_completeness', 'actionability', 'clarity_structure'
  ];

  const datasets = items.map((item, index) => {
    const colors = Object.values(chartColors);
    return {
      label: `评估 ${item.id}`,
      data: dimensions.map(dim => item[dim] || 0),
      backgroundColor: `${colors[index % colors.length]}33`,
      borderColor: colors[index % colors.length],
      borderWidth: 2
    };
  });

  // 创建图表
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: dimensions.map(dim => dimensionLabels[dim] || dim),
      datasets: datasets
    },
    options: {
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      }
    }
  });
}

// 初始化时间趋势图
function initTrendChart(evaluations) {
  const ctx = document.getElementById('trendChart').getContext('2d');

  // 如果图表已存在，销毁它
  if (trendChart) {
    trendChart.destroy();
  }

  // 按时间排序
  const sortedData = [...evaluations].sort((a, b) => a.timestamp - b.timestamp);

  // 准备数据
  const timestamps = sortedData.map(item => new Date(item.timestamp));
  const scores = sortedData.map(item => item.average_score);

  // 创建图表
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [{
        label: '平均分',
        data: scores,
        borderColor: chartColors.primary,
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MM/dd'
            }
          },
          title: {
            display: true,
            text: '日期'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '分数'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: function(context) {
              return new Date(context[0].parsed.x).toLocaleString();
            }
          }
        }
      }
    }
  });
}
