import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Button,
  HStack,
  useDisclosure,
  Badge,
  IconButton,
  Tooltip,
  Grid,
  GridItem,
  useColorMode
} from '@chakra-ui/react';
import { FaSun, FaMoon, FaSync, FaChartPie, FaBalanceScale } from 'react-icons/fa';
import { motion } from 'framer-motion';

// 组件
import StatCard from './components/dashboard/StatCard';
import ChartCard from './components/dashboard/ChartCard';
import RadarChart from './components/charts/RadarChart';
import BarChart from './components/charts/BarChart';
import TrendChart from './components/charts/TrendChart';
import EvaluationTable from './components/table/EvaluationTable';
import DetailModal from './components/modals/DetailModal';
import CompareModal from './components/modals/CompareModal';
import WeightConfigModal from './components/modals/WeightConfigModal';

// Hooks 和 Store
import useEvaluations from './hooks/useEvaluations';
import useStats from './hooks/useStats';
import useDashboardStore from './store/dashboardStore';
import { DIMENSION_LABELS } from './utils/constants';

const App = () => {
  // 颜色模式
  const { colorMode, toggleColorMode } = useColorMode();

  // 获取数据
  useEvaluations();
  useStats();

  // 获取状态
  const {
    evaluations,
    stats,
    loading,
    searchQuery,
    sortKey,
    sortOrder,
    selectedItem,
    compareItems,
    dimensionWeights,
    setSearchQuery,
    setSortKey,
    toggleSortOrder,
    setSelectedItem,
    addToCompare,
    removeFromCompare,
    clearCompare,
    updateDimensionWeight,
    resetWeights
  } = useDashboardStore();

  // 模态框状态
  const detailModal = useDisclosure();
  const compareModal = useDisclosure();
  const weightConfigModal = useDisclosure();

  // 处理详情查看
  const handleShowDetails = (item: any) => {
    setSelectedItem(item);
    detailModal.onOpen();
  };

  // 处理对比查看
  const handleShowCompare = () => {
    if (compareItems.length > 0) {
      compareModal.onOpen();
    }
  };

  // 过滤和排序数据
  const filteredAndSortedData = useMemo(() => {
    let result = [...evaluations];

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        return Object.values(item).some(val =>
          String(val).toLowerCase().includes(query)
        );
      });
    }

    // 排序
    result.sort((a, b) => {
      let aVal = a[sortKey as keyof typeof a];
      let bVal = b[sortKey as keyof typeof b];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [evaluations, searchQuery, sortKey, sortOrder]);

  // 获取最高评分维度
  const highestDimension = useMemo(() => {
    const averages = stats.dimension_averages || {};
    if (Object.keys(averages).length === 0) {
      return { name: '无数据', value: 0 };
    }

    let highest = { name: '', value: 0 };
    Object.entries(averages).forEach(([key, value]) => {
      if (key !== 'average_score' && value > highest.value) {
        highest = {
          name: DIMENSION_LABELS[key] || key,
          value
        };
      }
    });

    return highest;
  }, [stats.dimension_averages]);

  // 刷新数据
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box minH="100vh" bg="#0F172A" color="white">
      {/* 导航栏 */}
      <Box as="nav" bg="rgba(30, 41, 59, 0.8)" backdropFilter="blur(10px)" py={4} boxShadow="lg">
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Heading as="h1" size="lg" fontWeight="bold">
              评估结果可视化仪表板
            </Heading>
            <HStack spacing={4}>
              <Tooltip label="配置权重">
                <IconButton
                  aria-label="配置权重"
                  icon={<FaBalanceScale />}
                  onClick={weightConfigModal.onOpen}
                  variant="ghost"
                />
              </Tooltip>
              {compareItems.length > 0 && (
                <Button
                  leftIcon={<FaChartPie />}
                  onClick={handleShowCompare}
                  variant="outline"
                  colorScheme="purple"
                >
                  对比 <Badge ml={2} colorScheme="purple">{compareItems.length}</Badge>
                </Button>
              )}
              <Tooltip label="刷新数据">
                <IconButton
                  aria-label="刷新数据"
                  icon={<FaSync />}
                  onClick={handleRefresh}
                  variant="ghost"
                />
              </Tooltip>
              <Tooltip label={colorMode === 'light' ? '切换到暗色模式' : '切换到亮色模式'}>
                <IconButton
                  aria-label="切换颜色模式"
                  icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
                  onClick={toggleColorMode}
                  variant="ghost"
                />
              </Tooltip>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* 主内容区 */}
      <Container maxW="container.xl" py={8}>
        {/* 统计卡片 */}
        <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(3, 1fr)" }} gap={6} mb={8}>
          <GridItem>
            <StatCard
              title="评估总数"
              value={stats.count}
              delay={0.1}
            />
          </GridItem>
          <GridItem>
            <StatCard
              title="总平均分"
              value={stats.overall_average}
              suffix="分"
              delay={0.2}
            />
          </GridItem>
          <GridItem>
            <StatCard
              title="最高评分维度"
              value={highestDimension.name}
              suffix={highestDimension.value ? `（${highestDimension.value}分）` : ''}
              delay={0.3}
            />
          </GridItem>
        </Grid>

        {/* 图表区域 */}
        <Grid templateColumns={{ base: "repeat(1, 1fr)", lg: "repeat(2, 1fr)" }} gap={6} mb={8}>
          <GridItem>
            <ChartCard title="评分维度分布" delay={0.4}>
              <RadarChart data={stats.dimension_averages || {}} height="300px" />
            </ChartCard>
          </GridItem>
          <GridItem>
            <ChartCard title="评分维度对比" delay={0.5}>
              <BarChart data={stats.dimension_averages || {}} height="300px" />
            </ChartCard>
          </GridItem>
        </Grid>

        {/* 时间趋势图 */}
        <Box mb={8}>
          <ChartCard title="评分随时间变化趋势" delay={0.6}>
            <TrendChart data={evaluations} height="300px" />
          </ChartCard>
        </Box>

        {/* 数据表格 */}
        <EvaluationTable
          data={filteredAndSortedData}
          searchQuery={searchQuery}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSearchChange={setSearchQuery}
          onSortChange={setSortKey}
          onSortOrderToggle={toggleSortOrder}
          onShowDetails={handleShowDetails}
          onAddToCompare={addToCompare}
        />
      </Container>

      {/* 模态框 */}
      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.onClose}
        evaluation={selectedItem}
      />
      
      <CompareModal
        isOpen={compareModal.isOpen}
        onClose={compareModal.onClose}
        items={compareItems}
        onRemoveItem={removeFromCompare}
      />
      
      <WeightConfigModal
        isOpen={weightConfigModal.isOpen}
        onClose={weightConfigModal.onClose}
        weights={dimensionWeights}
        onWeightChange={updateDimensionWeight}
        onReset={resetWeights}
      />
    </Box>
  );
};

export default App;
