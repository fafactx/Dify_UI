import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Tooltip
} from '@chakra-ui/react';
import { useState } from 'react';
import { DIMENSION_LABELS } from '../../utils/constants';

interface WeightConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  weights: Record<string, number>;
  onWeightChange: (dimension: string, weight: number) => void;
  onReset: () => void;
}

const WeightConfigModal = ({ 
  isOpen, 
  onClose, 
  weights, 
  onWeightChange, 
  onReset 
}: WeightConfigModalProps) => {
  // 本地状态，用于显示滑块值
  const [showTooltip, setShowTooltip] = useState<Record<string, boolean>>({});

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
        <ModalHeader color="white">维度权重配置</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color="gray.400" mb={4}>
            调整各维度的权重，以便更好地分析评估结果。权重越高，该维度在加权平均分中的影响越大。
          </Text>
          
          <Grid templateColumns="repeat(1, 1fr)" gap={4}>
            {Object.entries(weights)
              .filter(([key]) => key !== 'average_score' && key !== 'weighted_average')
              .map(([dimension, weight]) => (
                <GridItem key={dimension}>
                  <FormControl>
                    <FormLabel display="flex" justifyContent="space-between">
                      <Text color="gray.300">{DIMENSION_LABELS[dimension] || dimension}</Text>
                      <Text color="brand.400" fontWeight="bold">{weight}</Text>
                    </FormLabel>
                    <Slider
                      min={0}
                      max={5}
                      step={0.5}
                      value={weight}
                      onChange={(val) => onWeightChange(dimension, val)}
                      onMouseEnter={() => setShowTooltip({ ...showTooltip, [dimension]: true })}
                      onMouseLeave={() => setShowTooltip({ ...showTooltip, [dimension]: false })}
                      colorScheme="blue"
                    >
                      <SliderTrack bg="gray.700">
                        <SliderFilledTrack />
                      </SliderTrack>
                      <Tooltip
                        hasArrow
                        bg="brand.500"
                        color="white"
                        placement="top"
                        isOpen={showTooltip[dimension]}
                        label={weight}
                      >
                        <SliderThumb boxSize={4} />
                      </Tooltip>
                    </Slider>
                  </FormControl>
                </GridItem>
              ))}
          </Grid>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onReset}>
            重置
          </Button>
          <Button colorScheme="blue" onClick={onClose}>
            应用
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WeightConfigModal;
