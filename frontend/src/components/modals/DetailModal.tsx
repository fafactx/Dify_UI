import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Grid,
  GridItem,
  Text,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider
} from '@chakra-ui/react';
import { Evaluation } from '../../store/dashboardStore';
import RadarChart from '../charts/RadarChart';
import { formatDate } from '../../utils/api';
import { DIMENSION_LABELS } from '../../utils/constants';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: Evaluation | null;
}

const DetailModal = ({ isOpen, onClose, evaluation }: DetailModalProps) => {
  if (!evaluation) return null;

  // 准备雷达图数据
  const radarData: Record<string, number> = {};
  Object.keys(evaluation).forEach(key => {
    if (
      key !== 'id' &&
      key !== 'timestamp' &&
      key !== 'date' &&
      key !== 'summary' &&
      key !== 'average_score' &&
      key !== 'weighted_average' &&
      typeof evaluation[key as keyof Evaluation] === 'number'
    ) {
      radarData[key] = evaluation[key as keyof Evaluation] as number;
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent
        bg="rgba(30, 41, 59, 0.95)"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="rgba(255, 255, 255, 0.1)"
        boxShadow="0 4px 30px rgba(0, 0, 0, 0.3)"
      >
        <ModalHeader color="white">评估详情</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={4}>
            <GridItem>
              <Text color="gray.400">ID</Text>
              <Text fontSize="lg" fontWeight="bold">{evaluation.id}</Text>

              <Text color="gray.400" mt={4}>时间</Text>
              <Text fontSize="lg">{formatDate(evaluation.timestamp)}</Text>

              <Text color="gray.400" mt={4}>平均分</Text>
              <Text fontSize="2xl" fontWeight="bold" color="brand.400">
                {evaluation.average_score}
              </Text>

              {evaluation.weighted_average && (
                <>
                  <Text color="gray.400" mt={4}>加权平均分</Text>
                  <Text fontSize="xl" fontWeight="bold" color="purple.400">
                    {evaluation.weighted_average}
                  </Text>
                </>
              )}
            </GridItem>
            <GridItem>
              <Box h="250px">
                <RadarChart data={radarData} />
              </Box>
            </GridItem>
          </Grid>

          <Divider my={4} borderColor="gray.700" />

          <Text color="gray.400" mb={2}>评分详情</Text>
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th color="gray.400">评估维度</Th>
                  <Th color="gray.400" isNumeric>分数</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(radarData).map(([key, value]) => (
                  <Tr key={key}>
                    <Td>{DIMENSION_LABELS[key] || key}</Td>
                    <Td isNumeric fontWeight="bold">{value}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {evaluation['Part Number'] && (
            <>
              <Text color="gray.400" mt={6} mb={2}>产品信息</Text>
              <Box
                p={4}
                borderRadius="md"
                bg="rgba(15, 23, 42, 0.5)"
                borderWidth="1px"
                borderColor="gray.700"
                mb={4}
              >
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <Text color="gray.400">产品型号</Text>
                    <Text>{evaluation['Part Number']}</Text>
                  </GridItem>
                  <GridItem>
                    <Text color="gray.400">产品系列</Text>
                    <Text>{evaluation['Product Family']}</Text>
                  </GridItem>
                  <GridItem>
                    <Text color="gray.400">MAG</Text>
                    <Text>{evaluation['MAG']}</Text>
                  </GridItem>
                  <GridItem>
                    <Text color="gray.400">CAS 名称</Text>
                    <Text>{evaluation['CAS Name']}</Text>
                  </GridItem>
                </Grid>
              </Box>
            </>
          )}

          {evaluation['Question'] && (
            <>
              <Text color="gray.400" mt={6} mb={2}>问题信息</Text>
              <Box
                p={4}
                borderRadius="md"
                bg="rgba(15, 23, 42, 0.5)"
                borderWidth="1px"
                borderColor="gray.700"
                mb={4}
              >
                <Text color="gray.400">问题</Text>
                <Text mb={3}>{evaluation['Question']}</Text>

                <Text color="gray.400">标准答案</Text>
                <Text mb={3}>{evaluation['Answer']}</Text>

                <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={3}>
                  <GridItem>
                    <Text color="gray.400">问题场景</Text>
                    <Text>{evaluation['Question Scenario']}</Text>
                  </GridItem>
                  <GridItem>
                    <Text color="gray.400">答案来源</Text>
                    <Text>{evaluation['Answer Source']}</Text>
                  </GridItem>
                  <GridItem>
                    <Text color="gray.400">问题复杂度</Text>
                    <Text>{evaluation['Question Complexity']}</Text>
                  </GridItem>
                  <GridItem>
                    <Text color="gray.400">问题频率</Text>
                    <Text>{evaluation['Question Frequency']}</Text>
                  </GridItem>
                </Grid>
              </Box>
            </>
          )}

          <Text color="gray.400" mt={6} mb={2}>总结</Text>
          <Box
            p={4}
            borderRadius="md"
            bg="rgba(15, 23, 42, 0.5)"
            borderWidth="1px"
            borderColor="gray.700"
            mb={4}
          >
            <Text>{evaluation.summary}</Text>
          </Box>

          {evaluation['LLM_ANSWER'] && (
            <>
              <Text color="gray.400" mt={6} mb={2}>LLM 回答</Text>
              <Box
                p={4}
                borderRadius="md"
                bg="rgba(15, 23, 42, 0.5)"
                borderWidth="1px"
                borderColor="gray.700"
              >
                <Text whiteSpace="pre-wrap">{evaluation['LLM_ANSWER']}</Text>
              </Box>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DetailModal;
