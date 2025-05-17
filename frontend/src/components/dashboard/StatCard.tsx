import { Box, Flex, Text, Stat, StatLabel, StatNumber, StatHelpText, StatArrow } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import SparklineChart from '../charts/SparklineChart';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  sparklineData?: number[];
  suffix?: string;
  delay?: number;
}

const StatCard = ({ 
  title, 
  value, 
  change = 0, 
  sparklineData = [], 
  suffix = '',
  delay = 0
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Box
        bg="rgba(30, 41, 59, 0.8)"
        backdropFilter="blur(10px)"
        borderRadius="xl"
        p={5}
        boxShadow="0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)"
        height="100%"
        borderWidth="1px"
        borderColor="rgba(255, 255, 255, 0.1)"
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
        transition="all 0.3s"
      >
        <Stat>
          <StatLabel fontSize="md" fontWeight="medium" mb={2} color="gray.300">{title}</StatLabel>
          <Flex justify="space-between" align="center">
            <StatNumber fontSize="3xl" fontWeight="bold">
              {value}{suffix}
            </StatNumber>
            {change !== 0 && (
              <StatHelpText mb={0}>
                <StatArrow type={change > 0 ? 'increase' : 'decrease'} />
                {Math.abs(change)}%
              </StatHelpText>
            )}
          </Flex>
          {sparklineData.length > 0 && (
            <Box mt={2} h="40px">
              <SparklineChart 
                data={sparklineData} 
                color={change >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'} 
              />
            </Box>
          )}
        </Stat>
      </Box>
    </motion.div>
  );
};

export default StatCard;
