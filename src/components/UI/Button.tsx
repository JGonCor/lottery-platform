import React from 'react';
import styled from 'styled-components';

// Safe motion import with fallback
let motion: any;
try {
  motion = require('framer-motion').motion;
} catch (error) {
  // Fallback to regular HTML elements if framer-motion fails
  motion = {
    button: 'button',
    div: 'div'
  };
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

const StyledButton = styled(motion.button)<ButtonProps>`
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  font-weight: 600;
  transition: ${({ theme }) => theme.transition};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};

  /* Variants */
  background-color: ${({ theme, variant }) => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.accent.blue;
      case 'outline':
        return 'transparent';
      case 'text':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  }};

  color: ${({ theme, variant }) => {
    switch (variant) {
      case 'outline':
        return theme.colors.primary;
      case 'text':
        return theme.colors.primary;
      default:
        return theme.colors.base.white;
    }
  }};

  border: ${({ theme, variant }) => {
    return variant === 'outline' ? `2px solid ${theme.colors.primary}` : 'none';
  }};

  /* Sizes */
  padding: ${({ size, variant }) => {
    if (variant === 'text') {
      return '0.25rem 0.5rem';
    }
    
    switch (size) {
      case 'small':
        return '0.5rem 1rem';
      case 'large':
        return '1rem 2rem';
      default:
        return '0.75rem 1.5rem';
    }
  }};

  font-size: ${({ size }) => {
    switch (size) {
      case 'small':
        return '0.875rem';
      case 'large':
        return '1.125rem';
      default:
        return '1rem';
    }
  }};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: ${({ variant }) => variant === 'text' ? 'none' : 'translateY(-2px)'};
    text-decoration: ${({ variant }) => variant === 'text' ? 'underline' : 'none'};
  }

  &:active:not(:disabled) {
    filter: brightness(0.9);
    transform: translateY(0);
  }
`;

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  children,
  fullWidth = false,
  style,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      fullWidth={fullWidth}
      style={style}
      whileTap={variant !== 'text' ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default Button;