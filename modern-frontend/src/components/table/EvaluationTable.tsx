import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  HStack,
  Box,
  Text,
  Input,
  Select,
  Flex,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaFileExport } from 'react-icons/fa';
import { Evaluation } from '../../store/dashboardStore';
import { formatDate, exportToCsv } from '../../utils/api';
import { DIMENSION_LABELS } from '../../utils/constants';

interface EvaluationTableProps {
  data: Evaluation[];
  searchQuery: string;
  sortKey: string;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (query: string) => void;
  onSortChange: (key: string) => void;
  onSortOrderToggle: () => void;
  onShowDetails: (item: Evaluation) => void;
  onAddToCompare: (item: Evaluation) => void;
}

const EvaluationTable = ({
  data,
  searchQuery,
  sortKey,
  sortOrder,
  onSearchChange,
  onSortChange,
  onSortOrderToggle,
  onShowDetails,
  onAddToCompare
}: EvaluationTableProps) => {
  // 处理导出数据
  const handleExport = () => {
    exportToCsv(data, 'evaluation_data');
  };

  // 获取排序图标
  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <FaSort />;
    return sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Box
        bg="rgba(30, 41, 59, 0.8)"
        backdropFilter="blur(10px)"
        borderRadius="xl"
        p={5}
        boxShadow="0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)"
        borderWidth="1px"
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="xl" fontWeight="bold" color="gray.300">评估结果列表</Text>
          <HStack spacing={3}>
            <Flex>
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                borderRightRadius="0"
                borderRight="0"
                _focus={{
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)'
                }}
              />
              <Button
                borderLeftRadius="0"
                bg="brand.500"
                _hover={{ bg: 'brand.600' }}
              >
                <FaSearch />
              </Button>
            </Flex>
            <Select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value)}
              w="180px"
              _focus={{
                borderColor: 'brand.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)'
              }}
            >
              <option value="id">ID</option>
              <option value="timestamp">时间</option>
              <option value="average_score">平均分</option>
              <option value="weighted_average">加权平均分</option>
              <option value="hallucination_control">幻觉控制</option>
              <option value="quality">质量</option>
              <option value="professionalism">专业性</option>
              <option value="usefulness">实用性</option>
              <option value="Part Number">产品型号</option>
            </Select>
            <IconButton
              aria-label="切换排序顺序"
              icon={sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />}
              onClick={onSortOrderToggle}
              variant="outline"
            />
            <Tooltip label="导出为CSV">
              <IconButton
                aria-label="导出数据"
                icon={<FaFileExport />}
                onClick={handleExport}
                colorScheme="blue"
              />
            </Tooltip>
          </HStack>
        </Flex>

        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th color="gray.400" onClick={() => onSortChange('id')} cursor="pointer">
                  ID {getSortIcon('id')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('timestamp')} cursor="pointer">
                  时间 {getSortIcon('timestamp')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('average_score')} cursor="pointer">
                  平均分 {getSortIcon('average_score')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('weighted_average')} cursor="pointer">
                  加权平均分 {getSortIcon('weighted_average')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('Part Number')} cursor="pointer">
                  产品型号 {getSortIcon('Part Number')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('hallucination_control')} cursor="pointer">
                  幻觉控制 {getSortIcon('hallucination_control')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('quality')} cursor="pointer">
                  质量 {getSortIcon('quality')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('professionalism')} cursor="pointer">
                  专业性 {getSortIcon('professionalism')}
                </Th>
                <Th color="gray.400" onClick={() => onSortChange('usefulness')} cursor="pointer">
                  实用性 {getSortIcon('usefulness')}
                </Th>
                <Th color="gray.400">操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.length > 0 ? (
                data.map((item) => (
                  <Tr key={item.id} _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}>
                    <Td>{item.id}</Td>
                    <Td>{formatDate(item.timestamp)}</Td>
                    <Td>{item.average_score}</Td>
                    <Td fontWeight="bold">{item.weighted_average}</Td>
                    <Td>{item['Part Number']}</Td>
                    <Td>{item.hallucination_control}</Td>
                    <Td>{item.quality}</Td>
                    <Td>{item.professionalism}</Td>
                    <Td>{item.usefulness}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => onShowDetails(item)}
                        >
                          详情
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="purple"
                          onClick={() => onAddToCompare(item)}
                        >
                          对比
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={10} textAlign="center" py={10}>
                    <Text color="gray.500">暂无评估数据</Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </motion.div>
  );
};

export default EvaluationTable;
