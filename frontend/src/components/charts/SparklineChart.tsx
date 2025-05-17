import { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { init, getInstanceByDom } from 'echarts';
import type { EChartsOption } from 'echarts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: string | number;
}

const SparklineChart = ({ data, color = '#3B82F6', height = '40px' }: SparklineChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // 初始化图表
    let chart = getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = init(chartRef.current);
    }
    
    // 配置选项
    const option: EChartsOption = {
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        show: false,
        min: (value: { min: number }) => Math.max(0, Math.floor(value.min * 0.9))
      },
      series: [{
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: color
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: color
            }, {
              offset: 1, color: 'rgba(255, 255, 255, 0.1)'
            }]
          }
        }
      }],
      animation: false
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
  }, [data, color]);

  return (
    <Box ref={chartRef} w="100%" h={height} />
  );
};

export default SparklineChart;
