// 维度标签映射
export const DIMENSION_LABELS: Record<string, string> = {
  // 新维度
  hallucination_control: '幻觉控制',
  quality: '质量',
  professionalism: '专业性',
  usefulness: '实用性',
  average_score: '平均分',
  weighted_average: '加权平均分'
};

// 图表颜色配置
export const CHART_COLORS = {
  primary: 'rgba(59, 130, 246, 0.7)', // 蓝色
  secondary: 'rgba(139, 92, 246, 0.7)', // 紫色
  success: 'rgba(16, 185, 129, 0.7)', // 绿色
  warning: 'rgba(245, 158, 11, 0.7)', // 橙色
  danger: 'rgba(239, 68, 68, 0.7)', // 红色
  info: 'rgba(14, 165, 233, 0.7)', // 浅蓝色
  light: 'rgba(248, 250, 252, 0.7)', // 浅色
  dark: 'rgba(30, 41, 59, 0.7)', // 深色
};

// 图表渐变色
export const CHART_GRADIENTS = {
  blue: {
    start: 'rgba(59, 130, 246, 0.7)',
    end: 'rgba(59, 130, 246, 0.1)'
  },
  purple: {
    start: 'rgba(139, 92, 246, 0.7)',
    end: 'rgba(139, 92, 246, 0.1)'
  },
  blueToViolet: {
    start: 'rgba(59, 130, 246, 0.7)',
    end: 'rgba(139, 92, 246, 0.3)'
  }
};
