import React from 'react';
import styled from 'styled-components';

// Safe motion import with fallback
let motion: any;
try {
  motion = require('framer-motion').motion;
} catch (error) {
  // Fallback to regular HTML elements if framer-motion fails
  motion = {
    div: 'div'
  };
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const StyledCard = styled(motion.div)<{ hoverable?: boolean }>`
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: 0 4px 16px ${({ theme }) => theme.colors.shadow};
  transition: ${({ theme }) => theme.transition};
  
  ${({ hoverable, theme }) =>
    hoverable &&
    `
    cursor: pointer;
    &:hover {
      box-shadow: 0 8px 24px ${theme.colors.shadow};
      transform: translateY(-4px);
    }
  `}
`;

const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  hoverable = false,
  ...props
}) => {
  return (
    <StyledCard
      className={className}
      onClick={onClick}
      hoverable={hoverable}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card;