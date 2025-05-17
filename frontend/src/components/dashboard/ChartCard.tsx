import { Box, Heading } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  delay?: number;
}

const ChartCard = ({ title, children, delay = 0 }: ChartCardProps) => {
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
        transition="all 0.3s"
      >
        <Heading as="h3" size="md" mb={4} color="gray.300">
          {title}
        </Heading>
        {children}
      </Box>
    </motion.div>
  );
};

export default ChartCard;
