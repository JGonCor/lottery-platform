import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

interface NumberBallProps {
  number: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  highlighted?: boolean;
  delay?: number;
}

const getBallSize = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small': return '30px';
    case 'large': return '60px';
    case 'medium':
    default: return '45px';
  }
};

const getFontSize = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small': return '0.9rem';
    case 'large': return '1.5rem';
    case 'medium':
    default: return '1.2rem';
  }
};

const BallContainer = styled(motion.div)<{
  size: string;
  bgColor: string;
  isHighlighted: boolean;
}>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: 50%;
  background: ${({ bgColor }) => bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: ${({ size }) => getFontSize(size as any)};
  box-shadow: ${({ isHighlighted }) => 
    isHighlighted ? '0 0 15px rgba(255, 255, 255, 0.7), 0 0 30px rgba(255, 193, 7, 0.6)' : '0 4px 8px rgba(0, 0, 0, 0.2)'};
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.4),
      rgba(255, 255, 255, 0.1)
    );
    border-radius: 50% 50% 100% 100% / 50% 50% 70% 70%;
  }
`;

// Colors for different ball numbers
const getBallColor = (number: number) => {
  const colors = [
    '#f44336', // red
    '#2196f3', // blue
    '#4caf50', // green
    '#ff9800', // orange
    '#9c27b0', // purple
    '#e91e63', // pink
    '#009688', // teal
    '#673ab7', // deep purple
    '#3f51b5', // indigo
    '#ffeb3b'  // yellow
  ];
  
  // Distribute colors evenly
  return colors[number % colors.length];
};

const NumberBall: React.FC<NumberBallProps> = ({
  number,
  size = 'medium',
  color,
  highlighted = false,
  delay = 0
}) => {
  const ballColor = color || getBallColor(number);
  const sizeValue = getBallSize(size);
  
  return (
    <BallContainer
      size={sizeValue}
      bgColor={ballColor}
      isHighlighted={highlighted}
      initial={{ scale: 0, opacity: 0, rotate: -180 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0, rotate: 180 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: delay
      }}
      whileHover={{ scale: 1.1, rotate: 5 }}
    >
      {number}
    </BallContainer>
  );
};

export default NumberBall;