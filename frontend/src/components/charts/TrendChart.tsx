import { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { init, getInstanceByDom } from 'echarts';
import type { EChartsOption } from 'echarts';
import { motion } from 'framer-motion';
import { CHART_GRADIENTS } from '../../utils/constants';
import { Evaluation } from '../../store/dashboardStore';
import { formatDate } from '../../utils/api';

interface TrendChartProps {
  data: Evaluation[];
  title?: string;
  height?: string | number;
}

const TrendChart = ({ data, title, height = '300px' }: TrendChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // 初始化图表
    let chart = getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = init(chartRef.current);
    }
    
    // 按时间排序
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // 准备数据
    const timestamps = sortedData.map(item => new Date(item.timestamp));
    const scores = sortedData.map(item => item.average_score);
    
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
        type: 'time',
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.2)'
          }
        },
        axisLabel: {
          color: '#CBD5E1',
          fontSize: 12,
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        min: (value: { min: number }) => Math.max(0, Math.floor(value.min * 0.9)),
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
        name: '平均分',
        type: 'line',
        data: timestamps.map((time, index) => [time, scores[index]]),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#3B82F6'
        },
        lineStyle: {
          width: 3,
          color: '#3B82F6'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: CHART_GRADIENTS.blue.start
            }, {
              offset: 1, color: CHART_GRADIENTS.blue.end
            }]
          }
        }
      }],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          const param = params[0];
          const date = new Date(param.value[0]);
          const score = param.value[1];
          return `${formatDate(date.getTime())}<br/>${param.seriesName}: ${score}分`;
        }
      },
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicInOut'
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
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <Box ref={chartRef} w="100%" h={height} />
    </motion.div>
  );
};

export default TrendChart;
