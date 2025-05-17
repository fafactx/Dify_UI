import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../utils/api';
import useDashboardStore from '../store/dashboardStore';
import { useEffect } from 'react';

// 自定义 Hook 获取统计数据
export const useStats = () => {
  const { setStats, setLoading, setError } = useDashboardStore();

  // 使用 React Query 获取数据
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 5 * 60 * 1000, // 每5分钟刷新一次
    staleTime: 60 * 1000, // 1分钟后数据过期
  });

  // 当数据加载完成时，更新状态
  useEffect(() => {
    setLoading(isLoading);
    
    if (error) {
      setError(error instanceof Error ? error.message : '获取统计数据失败');
    } else if (data) {
      setStats(data);
      setError(null);
    }
  }, [data, isLoading, error, setStats, setLoading, setError]);

  return { isLoading, error };
};

export default useStats;
