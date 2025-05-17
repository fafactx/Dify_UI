// API 基础 URL
const API_BASE_URL = 'http://10.193.21.115:3000';

// 获取评估数据
export const fetchEvaluations = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/evaluations`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.evaluations;
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    throw error;
  }
};

// 获取统计数据
export const fetchStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

// 格式化日期
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// 导出数据为 CSV
export const exportToCsv = (data: any[], filename: string) => {
  // 准备表头
  const headers = [
    'id', 'date', 'average_score', 'weighted_average', 
    'factual_accuracy', 'hallucination_control', 'professionalism', 
    'practicality', 'technical_depth', 'context_relevance',
    'solution_completeness', 'actionability', 'clarity_structure', 'summary'
  ];

  // 准备 CSV 内容
  const csvContent = [
    // 表头
    headers.join(','),
    // 数据行
    ...data.map(item => 
      headers.map(key => {
        const value = key === 'date' ? formatDate(item.timestamp) : item[key];
        // 字符串值需要引号包裹，特别是包含逗号的值
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    )
  ].join('\n');

  // 创建下载链接
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
