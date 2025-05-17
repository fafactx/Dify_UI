// frontend/js/app.js

// 使用 Vue 3 创建应用
const { createApp, ref, computed, onMounted, watch } = Vue;

createApp({
  setup() {
    // 数据
    const evaluations = ref([]);
    const stats = ref({
      count: 0,
      overall_average: 0,
      dimension_averages: {}
    });
    const searchQuery = ref('');
    const sortKey = ref('average_score');
    const sortOrder = ref('desc');
    const selectedItem = ref(null);
    const loading = ref(true);
    const compareItems = ref([]);
    const showingCompare = ref(false);

    // 维度权重
    const dimensionWeights = ref({
      factual_accuracy: 1,
      hallucination_control: 1,
      professionalism: 1,
      practicality: 1,
      technical_depth: 1,
      context_relevance: 1,
      solution_completeness: 1,
      actionability: 1,
      clarity_structure: 1
    });

    // 计算加权平均分
    const weightedScores = computed(() => {
      return evaluations.value.map(item => {
        let totalWeight = 0;
        let weightedSum = 0;

        Object.entries(dimensionWeights.value).forEach(([dim, weight]) => {
          if (item[dim] !== undefined) {
            weightedSum += item[dim] * weight;
            totalWeight += weight;
          }
        });

        const weightedAverage = totalWeight > 0 ?
          Math.round(weightedSum / totalWeight) : 0;

        return {
          ...item,
          weighted_average: weightedAverage
        };
      });
    });

    // 计算属性：过滤和排序后的数据
    const filteredAndSortedData = computed(() => {
      // 使用加权分数
      let result = [...weightedScores.value];

      // 搜索过滤
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(item => {
          return Object.values(item).some(val =>
            String(val).toLowerCase().includes(query)
          );
        });
      }

      // 排序
      result.sort((a, b) => {
        let aVal = a[sortKey.value];
        let bVal = b[sortKey.value];

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });

      return result;
    });

    // 计算属性：维度分数（用于详情模态框）
    const dimensionScores = computed(() => {
      if (!selectedItem.value) return {};

      const scores = {};
      Object.keys(dimensionLabels).forEach(key => {
        if (selectedItem.value[key] !== undefined && key !== 'average_score' && key !== 'weighted_average') {
          scores[key] = selectedItem.value[key];
        }
      });

      return scores;
    });

    // 计算属性：最高评分维度
    const highestDimension = computed(() => {
      const averages = stats.value.dimension_averages || {};
      if (Object.keys(averages).length === 0) {
        return { name: '无数据', value: 0 };
      }

      let highest = { name: '', value: 0 };
      Object.entries(averages).forEach(([key, value]) => {
        if (key !== 'average_score' && value > highest.value) {
          highest = {
            name: dimensionLabels[key] || key,
            value
          };
        }
      });

      return highest;
    });

    // 方法：获取数据
    const fetchData = async () => {
      loading.value = true;
      try {
        // 获取评估数据
        const response = await fetch('http://10.193.21.115:3000/api/evaluations');
        const result = await response.json();
        evaluations.value = result.evaluations;

        // 获取统计数据
        const statsResponse = await fetch('http://10.193.21.115:3000/api/stats');
        const statsResult = await statsResponse.json();
        stats.value = statsResult.stats;

        // 初始化图表
        initCharts();
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('获取数据失败，请检查服务器是否运行');
      } finally {
        loading.value = false;
      }
    };

    // 方法：初始化图表
    const initCharts = () => {
      console.log("开始初始化图表");
      console.log("统计数据:", JSON.stringify(stats.value));
      console.log("评估数据:", JSON.stringify(evaluations.value));

      // 初始化雷达图和柱状图
      try {
        console.log("初始化雷达图");
        initRadarChart(stats.value);
        console.log("雷达图初始化完成");

        console.log("初始化柱状图");
        initBarChart(stats.value);
        console.log("柱状图初始化完成");
      } catch (error) {
        console.error("初始化图表出错:", error);
      }

      // 初始化时间趋势图
      if (evaluations.value.length > 0) {
        try {
          console.log("初始化时间趋势图");
          initTrendChart(evaluations.value);
          console.log("时间趋势图初始化完成");
        } catch (error) {
          console.error("初始化时间趋势图出错:", error);
        }
      } else {
        console.log("没有评估数据，跳过时间趋势图初始化");
      }
    };

    // 方法：切换排序顺序
    const toggleSortOrder = () => {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    };

    // 方法：显示详情
    const showDetails = (item) => {
      selectedItem.value = item;

      // 等待 DOM 更新后初始化详情雷达图
      setTimeout(() => {
        initDetailRadarChart(item);

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        modal.show();
      }, 100);
    };

    // 方法：添加到对比列表
    const addToCompare = (item) => {
      if (!compareItems.value.some(i => i.id === item.id)) {
        compareItems.value.push(item);
      }
    };

    // 方法：从对比列表移除
    const removeFromCompare = (item) => {
      compareItems.value = compareItems.value.filter(i => i.id !== item.id);
      if (compareItems.value.length === 0) {
        showingCompare.value = false;
      }
    };

    // 方法：显示对比视图
    const showCompareView = () => {
      if (compareItems.value.length > 0) {
        showingCompare.value = true;

        // 等待 DOM 更新后初始化对比图表
        setTimeout(() => {
          initCompareChart(compareItems.value);

          // 显示模态框
          const modal = new bootstrap.Modal(document.getElementById('compareModal'));
          modal.show();
        }, 100);
      }
    };

    // 方法：显示权重配置模态框
    const showWeightConfig = () => {
      const modal = new bootstrap.Modal(document.getElementById('weightConfigModal'));
      modal.show();
    };

    // 方法：重置权重
    const resetWeights = () => {
      Object.keys(dimensionWeights.value).forEach(key => {
        dimensionWeights.value[key] = 1;
      });
    };

    // 方法：应用权重并关闭模态框
    const applyWeights = () => {
      // 关闭模态框
      const modalElement = document.getElementById('weightConfigModal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();

      // 更新排序（如果当前排序是按平均分）
      if (sortKey.value === 'average_score') {
        sortKey.value = 'weighted_average';
      }
    };

    // 方法：导出数据
    const exportData = () => {
      // 准备导出数据
      const dataToExport = filteredAndSortedData.value.map(item => {
        const exportItem = { ...item };
        // 格式化日期
        exportItem.date = formatDate(item.timestamp);
        return exportItem;
      });

      // 转换为 CSV
      const headers = ['id', 'date', 'average_score', 'weighted_average', 'factual_accuracy', 'hallucination_control',
                      'professionalism', 'practicality', 'technical_depth', 'context_relevance',
                      'solution_completeness', 'actionability', 'clarity_structure', 'summary'];

      const csvContent = [
        // 表头
        headers.map(h => `"${dimensionLabels[h] || h}"`).join(','),
        // 数据行
        ...dataToExport.map(item =>
          headers.map(key => {
            const value = item[key];
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
      link.setAttribute('download', `evaluation_data_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // 方法：刷新数据
    const refreshData = () => {
      fetchData();
    };

    // 方法：格式化日期
    const formatDate = (timestamp) => {
      return new Date(timestamp).toLocaleString();
    };

    // 组件挂载时获取数据
    onMounted(() => {
      fetchData();

      // 设置定时刷新（每5分钟）
      setInterval(fetchData, 5 * 60 * 1000);
    });

    // 返回模板需要的数据和方法
    return {
      evaluations,
      stats,
      searchQuery,
      sortKey,
      sortOrder,
      selectedItem,
      loading,
      compareItems,
      showingCompare,
      dimensionWeights,
      filteredAndSortedData,
      dimensionScores,
      highestDimension,
      dimensionLabels,
      toggleSortOrder,
      showDetails,
      addToCompare,
      removeFromCompare,
      showCompareView,
      showWeightConfig,
      resetWeights,
      applyWeights,
      exportData,
      refreshData,
      formatDate
    };
  }
}).mount('#app');
