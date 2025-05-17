import { useQuery } from '@tanstack/react-query';
import { fetchEvaluations } from '../utils/api';
import useDashboardStore from '../store/dashboardStore';
import { useEffect } from 'react';

// 计算加权平均分
const calculateWeightedAverage = (
  evaluation: any, 
  weights: Record<string, number>
) => {
  let totalWeight = 0;
  let weightedSum = 0;

  Object.entries(weights).forEach(([dim, weight]) => {
    if (evaluation[dim] !== undefined) {
      weightedSum += evaluation[dim] * weight;
      totalWeight += weight;
    }
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
};

// 自定义 Hook 获取评估数据
export const useEvaluations = () => {
  const { 
    setEvaluations, 
    setLoading, 
    setError,
    dimensionWeights
  } = useDashboardStore();

  // 使用 React Query 获取数据
  const { data, isLoading, error } = useQuery({
    queryKey: ['evaluations'],
    queryFn: fetchEvaluations,
    refetchInterval: 5 * 60 * 1000, // 每5分钟刷新一次
    staleTime: 60 * 1000, // 1分钟后数据过期
  });

  // 当数据加载完成或权重变化时，更新状态
  useEffect(() => {
    setLoading(isLoading);
    
    if (error) {
      setError(error instanceof Error ? error.message : '获取数据失败');
    } else if (data) {
      // 计算加权平均分
      const evaluationsWithWeightedAvg = data.map((item: any) => ({
        ...item,
        weighted_average: calculateWeightedAverage(item, dimensionWeights)
      }));
      
      setEvaluations(evaluationsWithWeightedAvg);
      setError(null);
    }
  }, [data, isLoading, error, dimensionWeights, setEvaluations, setLoading, setError]);

  return { isLoading, error };
};

export default useEvaluations;
