import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex,
  Text,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  IconButton,
  Divider
} from '@chakra-ui/react';
import { FaTimes } from 'react-icons/fa';
import { Evaluation } from '../../store/dashboardStore';
import { DIMENSION_LABELS, CHART_COLORS } from '../../utils/constants';
import { useRef, useEffect } from 'react';
import { init, getInstanceByDom } from 'echarts';
import type { EChartsOption } from 'echarts';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Evaluation[];
  onRemoveItem: (item: Evaluation) => void;
}

const CompareModal = ({ isOpen, onClose, items, onRemoveItem }: CompareModalProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !isOpen || items.length === 0) return;

    // 初始化图表
    let chart = getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = init(chartRef.current);
    }

    // 准备数据
    const dimensions = [
      'hallucination_control', 'quality', 'professionalism', 'usefulness'
    ];

    // 获取颜色数组
    const colors = Object.values(CHART_COLORS);

    // 准备数据集
    const datasets = items.map((item, index) => {
      return {
        name: `评估 ${item.id}`,
        value: dimensions.map(dim => item[dim as keyof Evaluation] as number),
        itemStyle: {
          color: colors[index % colors.length]
        }
      };
    });

    // 配置选项
    const option: EChartsOption = {
      backgroundColor: 'transparent',
      legend: {
        data: datasets.map(d => d.name),
        textStyle: {
          color: '#CBD5E1'
        },
        top: 0
      },
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
        type: 'radar',
        data: datasets
      }],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: {
          color: '#fff'
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
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
  }, [isOpen, items]);

  if (items.length === 0) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent
        bg="rgba(30, 41, 59, 0.95)"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="rgba(255, 255, 255, 0.1)"
        boxShadow="0 4px 30px rgba(0, 0, 0, 0.3)"
        maxW={{ base: "90%", lg: "80%" }}
      >
        <ModalHeader color="white">评估结果对比</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}>
            <Text color="gray.400" mb={2}>已选择的评估结果：</Text>
            <Flex flexWrap="wrap" gap={2}>
              {items.map((item) => (
                <Badge
                  key={item.id}
                  colorScheme="blue"
                  borderRadius="full"
                  px={3}
                  py={1}
                  display="flex"
                  alignItems="center"
                >
                  <Text mr={1}>{item.id}</Text>
                  <IconButton
                    aria-label="移除"
                    icon={<FaTimes />}
                    size="xs"
                    variant="ghost"
                    onClick={() => onRemoveItem(item)}
                  />
                </Badge>
              ))}
            </Flex>
          </Box>

          <Divider my={4} borderColor="gray.700" />

          <Box h="400px" ref={chartRef} mb={6} />

          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th color="gray.400">评估维度</Th>
                  {items.map((item) => (
                    <Th key={item.id} color="gray.400" isNumeric>{item.id}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {Object.keys(DIMENSION_LABELS)
                  .filter(key => key !== 'average_score' && key !== 'weighted_average')
                  .map((dim) => (
                    <Tr key={dim}>
                      <Td>{DIMENSION_LABELS[dim]}</Td>
                      {items.map((item) => (
                        <Td key={`${item.id}-${dim}`} isNumeric fontWeight="bold">
                          {item[dim as keyof Evaluation] as number}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                <Tr>
                  <Td fontWeight="bold">平均分</Td>
                  {items.map((item) => (
                    <Td key={`${item.id}-avg`} isNumeric fontWeight="bold" color="brand.400">
                      {item.average_score}
                    </Td>
                  ))}
                </Tr>
                {items.some(item => item.weighted_average !== undefined) && (
                  <Tr>
                    <Td fontWeight="bold">加权平均分</Td>
                    {items.map((item) => (
                      <Td key={`${item.id}-weighted`} isNumeric fontWeight="bold" color="purple.400">
                        {item.weighted_average}
                      </Td>
                    ))}
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>

          <Text color="gray.400" mt={6} mb={2}>总结对比</Text>
          {items.map((item) => (
            <Box
              key={`${item.id}-summary`}
              p={4}
              borderRadius="md"
              bg="rgba(15, 23, 42, 0.5)"
              borderWidth="1px"
              borderColor="gray.700"
              mb={3}
            >
              <HStack mb={2}>
                <Badge colorScheme="blue">{item.id}</Badge>
                <Text fontWeight="bold">{item.average_score}分</Text>
              </HStack>
              <Text>{item.summary}</Text>
            </Box>
          ))}
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CompareModal;
