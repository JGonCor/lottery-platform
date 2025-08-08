// Accessible UI components following WCAG 2.1 AA guidelines
import React, { useRef, useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { FocusManager, KeyboardNavigation, AriaUtilities, ScreenReaderUtilities } from '../../utils/accessibility';

// Accessible Button Component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const StyledButton = styled.button<{
  variant: string;
  size: string;
  fullWidth: boolean;
  loading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  min-height: 44px; // WCAG touch target minimum
  padding: ${({ size, theme }) => {
    switch (size) {
      case 'sm': return `${theme.spacing.sm} ${theme.spacing.md}`;
      case 'lg': return `${theme.spacing.lg} ${theme.spacing.xl}`;
      default: return `${theme.spacing.md} ${theme.spacing.lg}`;
    }
  }};
  
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};
  
  font-size: ${({ size }) => {
    switch (size) {
      case 'sm': return '0.875rem';
      case 'lg': return '1.125rem';
      default: return '1rem';
    }
  }};
  font-weight: 600;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 2px solid transparent;
  cursor: ${({ disabled, loading }) => disabled || loading ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled, loading }) => disabled || loading ? 0.6 : 1};
  
  background-color: ${({ theme, variant }) => {
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.accent?.blue || '#4285f4';
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return theme.colors.primary;
    }
  }};
  
  color: ${({ theme, variant }) => {
    switch (variant) {
      case 'primary':
      case 'secondary': return 'white';
      case 'outline':
      case 'ghost': return theme.colors.primary;
      default: return 'white';
    }
  }};
  
  border-color: ${({ theme, variant }) => {
    switch (variant) {
      case 'outline': return theme.colors.primary;
      default: return 'transparent';
    }
  }};
  
  transition: all 0.2s ease;
  
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.primary}40;
    outline-offset: 2px;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    background-color: ${({ theme, variant }) => {
      switch (variant) {
        case 'outline':
        case 'ghost': return `${theme.colors.primary}10`;
        default: return undefined;
      }
    }};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const Button: React.FC<AccessibleButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  onClick,
  ...props
}) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || props.disabled) return;
    onClick?.(event);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <span className="sr-only">Loading</span>
          {/* Loading spinner would go here */}
          <span aria-hidden="true">Loading...</span>
        </>
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && <span aria-hidden="true">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span aria-hidden="true">{icon}</span>}
      </>
    );
  };

  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      loading={loading}
      onClick={handleClick}
      aria-busy={loading}
      {...props}
    >
      {renderContent()}
    </StyledButton>
  );
};

// Accessible Modal Component
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${({ isOpen }) => isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ModalContent = styled.div<{ size: string }>`
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow-y: auto;
  
  width: 100%;
  max-width: ${({ size }) => {
    switch (size) {
      case 'sm': return '400px';
      case 'lg': return '800px';
      case 'xl': return '1200px';
      default: return '600px';
    }
  }};
  
  &:focus {
    outline: 3px solid ${({ theme }) => theme.colors.primary}40;
    outline-offset: 2px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.primary}20;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalCloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text};
  
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary}10;
  }
`;

const ModalBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

export const Modal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(AriaUtilities.generateId('modal-title')).current;

  useEffect(() => {
    if (isOpen) {
      FocusManager.storeFocus();
      
      // Focus modal after a brief delay to ensure it's rendered
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
          FocusManager.trapFocus(modalRef.current);
        }
      }, 100);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Announce modal opening
      ScreenReaderUtilities.announce(`${title} dialog opened`, 'assertive');
    } else {
      FocusManager.releaseFocus();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (closeOnEscape && event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <ModalContent
        ref={modalRef}
        size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <ModalHeader>
          <ModalTitle id={titleId}>{title}</ModalTitle>
          <ModalCloseButton
            onClick={onClose}
            aria-label={`Close ${title} dialog`}
          >
            ×
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          {children}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// Accessible Form Input Component
interface AccessibleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const InputContainer = styled.div<{ fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};
`;

const InputLabel = styled.label<{ required: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  
  &::after {
    content: ${({ required }) => required ? '" *"' : '""'};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const StyledInput = styled.input<{ size: string; hasError: boolean }>`
  min-height: 44px; // WCAG touch target minimum
  padding: ${({ size, theme }) => {
    switch (size) {
      case 'sm': return `${theme.spacing.sm} ${theme.spacing.md}`;
      case 'lg': return `${theme.spacing.lg} ${theme.spacing.xl}`;
      default: return `${theme.spacing.md}`;
    }
  }};
  
  font-size: ${({ size }) => {
    switch (size) {
      case 'sm': return '0.875rem';
      case 'lg': return '1.125rem';
      default: return '1rem';
    }
  }};
  
  border: 2px solid ${({ theme, hasError }) => 
    hasError ? '#dc3545' : `${theme.colors.primary}30`
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.cardBackground};
  color: ${({ theme }) => theme.colors.text};
  
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => 
      hasError ? '#dc3545' : theme.colors.primary
    };
    box-shadow: 0 0 0 3px ${({ theme, hasError }) => 
      hasError ? '#dc354540' : `${theme.colors.primary}40`
    };
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

const HelperText = styled.div<{ isError: boolean }>`
  font-size: 0.75rem;
  color: ${({ theme, isError }) => 
    isError ? '#dc3545' : theme.colors.text
  };
`;

export const Input: React.FC<AccessibleInputProps> = ({
  label,
  error,
  helperText,
  size = 'md',
  fullWidth = false,
  required = false,
  id,
  ...props
}) => {
  const inputId = id || AriaUtilities.generateId('input');
  const errorId = error ? AriaUtilities.generateId('error') : undefined;
  const helperId = helperText ? AriaUtilities.generateId('helper') : undefined;

  const describedByIds = [errorId, helperId].filter(Boolean).join(' ');

  return (
    <InputContainer fullWidth={fullWidth}>
      <InputLabel htmlFor={inputId} required={required}>
        {label}
      </InputLabel>
      <StyledInput
        id={inputId}
        size={size}
        hasError={!!error}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedByIds || undefined}
        {...props}
      />
      {error && (
        <HelperText id={errorId} isError role="alert">
          {error}
        </HelperText>
      )}
      {helperText && !error && (
        <HelperText id={helperId} isError={false}>
          {helperText}
        </HelperText>
      )}
    </InputContainer>
  );
};

// Accessible Number Selector (for lottery numbers)
interface NumberSelectorProps {
  value: number[];
  onChange: (numbers: number[]) => void;
  min: number;
  max: number;
  required: number;
  label: string;
}

const NumberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
  gap: ${({ theme }) => theme.spacing.xs};
  max-width: 400px;
`;

const NumberButton = styled.button<{ selected: boolean }>`
  width: 44px; // WCAG minimum touch target
  height: 44px;
  border: 2px solid ${({ theme, selected }) => 
    selected ? theme.colors.primary : `${theme.colors.primary}30`
  };
  background-color: ${({ theme, selected }) => 
    selected ? theme.colors.primary : theme.colors.cardBackground
  };
  color: ${({ theme, selected }) => 
    selected ? 'white' : theme.colors.text
  };
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.primary}40;
    outline-offset: 2px;
  }
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SelectionStatus = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const NumberSelector: React.FC<NumberSelectorProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  label,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const numbersRef = useRef<HTMLButtonElement[]>([]);
  const statusId = AriaUtilities.generateId('status');

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const handleNumberClick = (number: number) => {
    if (value.includes(number)) {
      onChange(value.filter(n => n !== number));
    } else if (value.length < required) {
      onChange([...value, number].sort((a, b) => a - b));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const newIndex = KeyboardNavigation.handleArrowNavigation(
      event,
      numbersRef.current,
      index,
      'grid',
      10 // Assuming 10 columns
    );
    
    if (newIndex !== index) {
      setFocusedIndex(newIndex);
    }

    KeyboardNavigation.handleActivation(event, () => {
      handleNumberClick(numbers[index]);
    });
  };

  return (
    <div role="group" aria-labelledby={`${statusId}-label`}>
      <InputLabel required id={`${statusId}-label`}>
        {label}
      </InputLabel>
      
      <NumberGrid>
        {numbers.map((number, index) => {
          const isSelected = value.includes(number);
          const isDisabled = !isSelected && value.length >= required;
          
          return (
            <NumberButton
              key={number}
              ref={el => numbersRef.current[index] = el!}
              selected={isSelected}
              disabled={isDisabled}
              onClick={() => handleNumberClick(number)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-pressed={isSelected}
              aria-describedby={statusId}
            >
              {number}
            </NumberButton>
          );
        })}
      </NumberGrid>
      
      <SelectionStatus id={statusId} aria-live="polite">
        {value.length} of {required} numbers selected
        {value.length > 0 && `: ${value.join(', ')}`}
      </SelectionStatus>
    </div>
  );
};

// Accessible Toast Notification
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const ToastContainer = styled.div<{ type: string; isVisible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 500px;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  
  background-color: ${({ type, theme }) => {
    switch (type) {
      case 'success': return '#22c55e';
      case 'error': return '#dc3545';
      case 'warning': return '#f59e0b';
      default: return theme.colors.primary;
    }
  }};
  
  color: white;
  transform: translateX(${({ isVisible }) => isVisible ? '0' : '100%'});
  opacity: ${({ isVisible }) => isVisible ? 1 : 0};
  transition: all 0.3s ease;
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ToastMessage = styled.div`
  flex: 1;
  font-weight: 500;
`;

const ToastCloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  
  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  useEffect(() => {
    if (isVisible) {
      ScreenReaderUtilities.announce(message, type === 'error' ? 'assertive' : 'polite');
    }
  }, [isVisible, message, type]);

  if (!isVisible) return null;

  return (
    <ToastContainer
      type={type}
      isVisible={isVisible}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <ToastContent>
        <ToastMessage>{message}</ToastMessage>
        <ToastCloseButton
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </ToastCloseButton>
      </ToastContent>
    </ToastContainer>
  );
};