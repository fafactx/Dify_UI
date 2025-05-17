import { create } from 'zustand';

// 定义维度权重类型
interface DimensionWeights {
  hallucination_control: number;
  quality: number;
  professionalism: number;
  usefulness: number;
}

// 定义评估项类型
export interface Evaluation {
  id: string;
  timestamp: number;
  date: string;
  hallucination_control: number;
  quality: number;
  professionalism: number;
  usefulness: number;
  average_score: number;
  weighted_average?: number;
  summary: string;
  // 产品相关信息
  'CAS Name'?: string;
  'Product Family'?: string;
  'MAG'?: string;
  'Part Number'?: string;
  'Question'?: string;
  'Answer'?: string;
  'Question Scenario'?: string;
  'Answer Source'?: string;
  'Question Complexity'?: string;
  'Question Frequency'?: string;
  'Question Category'?: string;
  'Source Category'?: string;
  'LLM_ANSWER'?: string;
}

// 定义统计数据类型
export interface Stats {
  count: number;
  overall_average: number;
  dimension_averages: Record<string, number>;
  last_updated: string | null;
}

// 定义仪表板状态
interface DashboardState {
  evaluations: Evaluation[];
  stats: Stats;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  sortKey: string;
  sortOrder: 'asc' | 'desc';
  selectedItem: Evaluation | null;
  compareItems: Evaluation[];
  dimensionWeights: DimensionWeights;
  setEvaluations: (evaluations: Evaluation[]) => void;
  setStats: (stats: Stats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortKey: (key: string) => void;
  toggleSortOrder: () => void;
  setSelectedItem: (item: Evaluation | null) => void;
  addToCompare: (item: Evaluation) => void;
  removeFromCompare: (item: Evaluation) => void;
  clearCompare: () => void;
  updateDimensionWeight: (dimension: keyof DimensionWeights, weight: number) => void;
  resetWeights: () => void;
}

// 创建状态存储
const useDashboardStore = create<DashboardState>((set) => ({
  evaluations: [],
  stats: {
    count: 0,
    overall_average: 0,
    dimension_averages: {},
    last_updated: null
  },
  loading: false,
  error: null,
  searchQuery: '',
  sortKey: 'average_score',
  sortOrder: 'desc',
  selectedItem: null,
  compareItems: [],
  dimensionWeights: {
    hallucination_control: 1,
    quality: 1,
    professionalism: 1,
    usefulness: 1
  },
  setEvaluations: (evaluations) => set({ evaluations }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortKey: (sortKey) => set({ sortKey }),
  toggleSortOrder: () => set((state) => ({
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
  })),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  addToCompare: (item) => set((state) => ({
    compareItems: state.compareItems.some(i => i.id === item.id)
      ? state.compareItems
      : [...state.compareItems, item]
  })),
  removeFromCompare: (item) => set((state) => ({
    compareItems: state.compareItems.filter(i => i.id !== item.id)
  })),
  clearCompare: () => set({ compareItems: [] }),
  updateDimensionWeight: (dimension, weight) => set((state) => ({
    dimensionWeights: {
      ...state.dimensionWeights,
      [dimension]: weight
    }
  })),
  resetWeights: () => set({
    dimensionWeights: {
      hallucination_control: 1,
      quality: 1,
      professionalism: 1,
      usefulness: 1
    }
  })
}));

export default useDashboardStore;
