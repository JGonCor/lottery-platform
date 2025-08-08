import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
  inline?: boolean;
}

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
`;

const SpinnerContainer = styled.div<{ inline?: boolean }>`
  display: ${({ inline }) => inline ? 'inline-flex' : 'flex'};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Spinner = styled.div<{ size: string; color?: string }>`
  width: ${({ size }) => {
    switch (size) {
      case 'small': return '20px';
      case 'medium': return '40px';
      case 'large': return '60px';
      default: return '40px';
    }
  }};
  height: ${({ size }) => {
    switch (size) {
      case 'small': return '20px';
      case 'medium': return '40px';
      case 'large': return '60px';
      default: return '40px';
    }
  }};
  border: ${({ size }) => {
    switch (size) {
      case 'small': return '2px';
      case 'medium': return '3px';
      case 'large': return '4px';
      default: return '3px';
    }
  }} solid ${({ theme, color }) => color || theme.colors.primary}20;
  border-top: ${({ size }) => {
    switch (size) {
      case 'small': return '2px';
      case 'medium': return '3px';
      case 'large': return '4px';
      default: return '3px';
    }
  }} solid ${({ theme, color }) => color || theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingMessage = styled.p<{ size: string }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ size }) => {
    switch (size) {
      case 'small': return '0.875rem';
      case 'medium': return '1rem';
      case 'large': return '1.125rem';
      default: return '1rem';
    }
  }};
  animation: ${pulse} 2s ease-in-out infinite;
  text-align: center;
  margin: 0;
`;

// Lottery-specific animated spinner
const LotteryBallContainer = styled.div<{ size: string }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: center;
  align-items: center;
`;

const LotteryBall = styled.div<{ size: string; delay: number }>`
  width: ${({ size }) => {
    switch (size) {
      case 'small': return '8px';
      case 'medium': return '12px';
      case 'large': return '16px';
      default: return '12px';
    }
  }};
  height: ${({ size }) => {
    switch (size) {
      case 'small': return '8px';
      case 'medium': return '12px';
      case 'large': return '16px';
      default: return '12px';
    }
  }};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent?.blue || '#4285f4'});
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite;
  animation-delay: ${({ delay }) => delay}s;
`;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  message,
  inline = false
}) => {
  return (
    <SpinnerContainer inline={inline} role="status" aria-label="Loading">
      <Spinner size={size} color={color} />
      {message && <LoadingMessage size={size}>{message}</LoadingMessage>}
    </SpinnerContainer>
  );
};

// Lottery-themed spinner variant
export const LotterySpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  inline = false
}) => {
  return (
    <SpinnerContainer inline={inline} role="status" aria-label="Loading lottery data">
      <LotteryBallContainer size={size}>
        <LotteryBall size={size} delay={0} />
        <LotteryBall size={size} delay={0.2} />
        <LotteryBall size={size} delay={0.4} />
        <LotteryBall size={size} delay={0.6} />
        <LotteryBall size={size} delay={0.8} />
      </LotteryBallContainer>
      {message && <LoadingMessage size={size}>{message}</LoadingMessage>}
    </SpinnerContainer>
  );
};

// Skeleton loader for content
export const SkeletonLoader: React.FC<{
  width?: string;
  height?: string;
  borderRadius?: string;
}> = ({ width = '100%', height = '20px', borderRadius = '4px' }) => {
  const SkeletonBox = styled.div`
    width: ${width};
    height: ${height};
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.colors.cardBackground} 25%,
      rgba(255, 255, 255, 0.1) 50%,
      ${({ theme }) => theme.colors.cardBackground} 75%
    );
    background-size: 200% 100%;
    animation: ${keyframes`
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    `} 1.5s infinite;
    border-radius: ${borderRadius};
  `;

  return <SkeletonBox />;
};

// Button loading state component
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}> = ({ 
  loading, 
  children, 
  disabled, 
  onClick, 
  variant = 'primary',
  size = 'medium' 
}) => {
  const Button = styled.button<{ variant: string; size: string }>`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ size, theme }) => {
      switch (size) {
        case 'small': return `${theme.spacing.sm} ${theme.spacing.md}`;
        case 'medium': return `${theme.spacing.md} ${theme.spacing.lg}`;
        case 'large': return `${theme.spacing.lg} ${theme.spacing.xl}`;
        default: return `${theme.spacing.md} ${theme.spacing.lg}`;
      }
    }};
    background-color: ${({ theme, variant }) =>
      variant === 'primary' ? theme.colors.primary : theme.colors.cardBackground};
    color: ${({ theme, variant }) =>
      variant === 'primary' ? 'white' : theme.colors.text};
    border: ${({ theme, variant }) =>
      variant === 'primary' ? 'none' : `1px solid ${theme.colors.primary}`};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    font-size: ${({ size }) => {
      switch (size) {
        case 'small': return '0.875rem';
        case 'medium': return '1rem';
        case 'large': return '1.125rem';
        default: return '1rem';
      }
    }};
    font-weight: 600;
    cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
    opacity: ${({ disabled }) => disabled ? 0.6 : 1};
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `;

  const ButtonContent = styled.span<{ loading: boolean }>`
    opacity: ${({ loading }) => loading ? 0 : 1};
    transition: opacity 0.2s ease;
  `;

  const SpinnerOverlay = styled.div<{ loading: boolean }>`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: ${({ loading }) => loading ? 1 : 0};
    transition: opacity 0.2s ease;
  `;

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      <ButtonContent loading={loading}>
        {children}
      </ButtonContent>
      <SpinnerOverlay loading={loading}>
        <LoadingSpinner size="small" color="white" inline />
      </SpinnerOverlay>
    </Button>
  );
};

export default LoadingSpinner;