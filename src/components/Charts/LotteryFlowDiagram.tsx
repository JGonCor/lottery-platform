import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const DiagramContainer = styled.div`
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const FlowDiagram = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    flex-wrap: wrap;
  }
`;

const StepBox = styled(motion.div)`
  width: 100%;
  max-width: 200px;
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: 0 4px 6px ${({ theme }) => theme.colors.shadow};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  position: relative;
  
  @media (min-width: 768px) {
    width: 22%;
    margin-bottom: 0;
  }
`;

const StepIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  background-color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.spacing.md};
  font-size: 2rem;
`;

const StepText = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StepDescription = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.8;
`;

const Arrow = styled(motion.div)`
  display: none;
  
  @media (min-width: 768px) {
    display: block;
    width: 30px;
    height: 30px;
    border-top: 3px solid ${({ theme }) => theme.colors.primary};
    border-right: 3px solid ${({ theme }) => theme.colors.primary};
    transform: rotate(45deg);
    position: absolute;
    top: 50%;
    right: -15%;
  }
`;

const MobileArrow = styled(motion.div)`
  width: 30px;
  height: 30px;
  border-right: 3px solid ${({ theme }) => theme.colors.primary};
  border-bottom: 3px solid ${({ theme }) => theme.colors.primary};
  transform: rotate(45deg);
  margin: -15px auto 15px;
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const steps = [
  {
    icon: '🎟️',
    text: 'Buy Tickets',
    description: 'Purchase tickets with USDT and choose your numbers manually or randomly'
  },
  {
    icon: '⏳',
    text: 'Wait for Draw',
    description: 'Draws happen automatically at regular intervals using Chainlink VRF'
  },
  {
    icon: '🔢',
    text: 'Numbers Drawn',
    description: 'Six winning numbers are selected in a provably fair manner'
  },
  {
    icon: '💰',
    text: 'Win Prizes',
    description: 'Matching 2+ numbers wins prizes, with jackpot for all 6 numbers'
  }
];

const LotteryFlowDiagram: React.FC = () => {
  const boxVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      }
    })
  };

  const arrowVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * 0.2 + 0.1,
        duration: 0.5,
      }
    })
  };
  
  return (
    <DiagramContainer>
      <FlowDiagram>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <StepBox
              custom={index}
              initial="hidden"
              animate="visible"
              variants={boxVariants}
              whileHover={{ scale: 1.05 }}
            >
              <StepIcon>{step.icon}</StepIcon>
              <StepText>{step.text}</StepText>
              <StepDescription>{step.description}</StepDescription>
              {index < steps.length - 1 && (
                <Arrow
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={arrowVariants}
                />
              )}
            </StepBox>
            
            {index < steps.length - 1 && (
              <MobileArrow
                custom={index}
                initial="hidden"
                animate="visible"
                variants={arrowVariants}
              />
            )}
          </React.Fragment>
        ))}
      </FlowDiagram>
    </DiagramContainer>
  );
};

export default LotteryFlowDiagram;