import { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { init, getInstanceByDom } from 'echarts';
import type { EChartsOption } from 'echarts';
import { motion } from 'framer-motion';
import { DIMENSION_LABELS, CHART_GRADIENTS } from '../../utils/constants';

interface RadarChartProps {
  data: Record<string, number>;
  title?: string;
  height?: string | number;
}

const RadarChart = ({ data, title, height = '300px' }: RadarChartProps) => {
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
      radar: {
        indicator: dimensions.map(dim => ({ 
          name: DIMENSION_LABELS[dim] || dim, 
          max: 100 
        })),
        splitArea: {
          areaStyle: {
            color: ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.05)', 
                    'rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.09)'],
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 10
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        },
        name: {
          textStyle: {
            color: '#CBD5E1',
            fontSize: 12
          }
        }
      },
      series: [{
        name: '评分',
        type: 'radar',
        data: [{
          value: values,
          name: '评分',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: CHART_GRADIENTS.blueToViolet.start
              }, {
                offset: 1, color: CHART_GRADIENTS.blueToViolet.end
              }]
            }
          },
          lineStyle: {
            width: 2,
            color: '#3B82F6'
          },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#3B82F6'
          }
        }]
      }],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          const data = params.data;
          const indicator = params.indicator;
          const value = params.value;
          return `${indicator}: ${value}分`;
        }
      }
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
      transition={{ duration: 0.8 }}
    >
      <Box ref={chartRef} w="100%" h={height} />
    </motion.div>
  );
};

export default RadarChart;
