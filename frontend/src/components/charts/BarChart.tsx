import { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { init, getInstanceByDom } from 'echarts';
import type { EChartsOption } from 'echarts';
import { motion } from 'framer-motion';
import { DIMENSION_LABELS, CHART_COLORS } from '../../utils/constants';

interface BarChartProps {
  data: Record<string, number>;
  title?: string;
  height?: string | number;
}

const BarChart = ({ data, title, height = '300px' }: BarChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    let chart = getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = init(chartRef.current);
    }
    
    // 准备数据
    const dimensions = Object.keys(data).filter(key => key !== 'average_score');
    const values = dimensions.map(dim => data[dim]);
    
    // 获取颜色数组
    const colors = Object.values(CHART_COLORS);
    
    // 配置选项
    const option: EChartsOption = {
      title: title ? {
        text: title,
        textStyle: {
          color: '#fff',
          fontSize: 16,
          fontWeight: 'normal'
        },
        left: 'center'
      } : undefined,
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: title ? '60px' : '30px',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dimensions.map(dim => DIMENSION_LABELS[dim] || dim),
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        },
        axisLabel: {
          color: '#CBD5E1',
          fontSize: 12,
          interval: 0,
          rotate: 30
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: '#CBD5E1',
          fontSize: 12
        }
      },
      series: [{
        name: '评分',
        type: 'bar',
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: colors[index % colors.length]
          }
        })),
        barWidth: '40%',
        label: {
          show: true,
          position: 'top',
          color: '#fff',
          fontSize: 12
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          return `${params.name}: ${params.value}分`;
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'elasticOut'
    };

    // 设置选项并渲染图表
    chart.setOption(option);
    
    // 响应窗口大小变化
    const handleResize = () => {
      chart.resize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, title]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <Box ref={chartRef} w="100%" h={height} />
    </motion.div>
  );
};

export default BarChart;
