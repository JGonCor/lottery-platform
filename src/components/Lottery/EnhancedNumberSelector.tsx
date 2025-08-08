import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../UI/Button';
import { LotteryTicket, TicketValidation } from '../../hooks/useLotteryTickets';

const SelectorContainer = styled.div`
  background: ${({ theme }) => 
    theme.mode === 'dark' 
      ? 'linear-gradient(135deg, #1a1a2e, #16213e)' 
      : 'linear-gradient(135deg, #f8f9ff, #e8f0ff)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  border: 2px solid ${({ theme }) => theme.colors.primary}20;
  position: relative;
  overflow: hidden;
`;

const GlowEffect = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, ${({ theme }) => theme.colors.primary}08 0%, transparent 70%);
  pointer-events: none;
  animation: glow-pulse 4s ease-in-out infinite;
  
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.02); }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  position: relative;
  z-index: 1;
`;

const Title = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  &::before {
    content: '🎯';
    font-size: 1.6rem;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  position: relative;
  z-index: 1;
`;

const SelectedNumbers = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  min-height: 60px;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 2px dashed ${({ theme }) => theme.colors.primary}30;
  position: relative;
  z-index: 1;
  align-items: center;
`;

const SelectedNumber = styled(motion.div)<{ position: number }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  position: relative;
  
  background: ${({ position }) => {
    const colors = [
      'linear-gradient(135deg, #e91e63, #ad1457)',
      'linear-gradient(135deg, #9c27b0, #6a1b99)',
      'linear-gradient(135deg, #3f51b5, #283593)',
      'linear-gradient(135deg, #2196f3, #1565c0)',
      'linear-gradient(135deg, #4caf50, #2e7d32)',
      'linear-gradient(135deg, #ff9800, #f57400)'
    ];
    return colors[position % colors.length];
  }};
  
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }
  
  &::after {
    content: '×';
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    background: #ff4444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover::after {
    opacity: 1;
  }
`;

const EmptySlot = styled.div<{ position: number }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px dashed ${({ theme }) => theme.colors.primary}40;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary}60;
  font-size: 1.1rem;
  font-weight: 600;
  background: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
  };
`;

const NumberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(5, 1fr);
    gap: ${({ theme }) => theme.spacing.xs};
  }
`;

const NumberBall = styled(motion.button)<{ 
  selected: boolean; 
  disabled: boolean;
  number: number;
}>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  position: relative;
  
  ${({ selected, disabled, number, theme }) => {
    if (disabled) {
      return `
        background: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        color: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
        opacity: 0.5;
      `;
    }
    
    if (selected) {
      const colors = [
        'linear-gradient(135deg, #e91e63, #ad1457)',
        'linear-gradient(135deg, #9c27b0, #6a1b99)',
        'linear-gradient(135deg, #3f51b5, #283593)',
        'linear-gradient(135deg, #2196f3, #1565c0)',
        'linear-gradient(135deg, #4caf50, #2e7d32)',
        'linear-gradient(135deg, #ff9800, #f57400)'
      ];
      return `
        background: ${colors[(number - 1) % colors.length]};
        color: white;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        transform: scale(1.1);
      `;
    }
    
    return `
      background: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
      color: ${theme.colors.text};
      border: 2px solid ${theme.colors.primary}20;
      
      &:hover {
        background: ${theme.colors.primary}15;
        border-color: ${theme.colors.primary}40;
        transform: scale(1.05);
      }
    `;
  }}
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 0.9rem;
  }
`;

const ValidationSection = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ValidationResult = styled.div<{ isValid: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-weight: 500;
  
  ${({ isValid }) => isValid
    ? `
        background: #10b98115;
        color: #059669;
        border: 1px solid #05966930;
      `
    : `
        background: #ef444415;
        color: #dc2626;
        border: 1px solid #dc262630;
      `
  }
`;

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const MessageItem = styled.div<{ type: 'error' | 'warning' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: 0.9rem;
  
  &::before {
    content: ${({ type }) => type === 'error' ? "'⚠️'" : "'💡'"};
    font-size: 1rem;
  }
`;

const TicketInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  position: relative;
  z-index: 1;
`;

const TicketCost = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  &::before {
    content: '💰';
    font-size: 1.3rem;
  }
`;

const QuickPickBadge = styled(motion.div)`
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  &::before {
    content: '🎲';
    font-size: 0.9rem;
  }
`;

interface EnhancedNumberSelectorProps {
  ticket: LotteryTicket;
  onUpdateTicket: (updates: Partial<LotteryTicket>) => void;
  onToggleNumber: (number: number) => void;
  onGenerateQuickPick: () => void;
  onClearNumbers: () => void;
  validation: TicketValidation;
  disabled?: boolean;
}

const EnhancedNumberSelector: React.FC<EnhancedNumberSelectorProps> = ({
  ticket,
  onUpdateTicket,
  onToggleNumber,
  onGenerateQuickPick,
  onClearNumbers,
  validation,
  disabled = false
}) => {
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);

  const maxNumbers = 49;
  const requiredNumbers = 6;
  const selectedCount = ticket.numbers.length;
  const canSelectMore = selectedCount < requiredNumbers;

  // Generate number grid
  const numberGrid = Array.from({ length: maxNumbers }, (_, i) => i + 1);

  // Create empty slots for visual feedback
  const emptySlots = Array.from({ length: Math.max(0, requiredNumbers - selectedCount) }, (_, i) => i);

  const handleNumberClick = (number: number) => {
    if (disabled) return;
    
    const isSelected = ticket.numbers.includes(number);
    if (!isSelected && !canSelectMore) return;
    
    setHighlightedNumber(number);
    setTimeout(() => setHighlightedNumber(null), 300);
    
    onToggleNumber(number);
  };

  const handleSelectedNumberClick = (number: number) => {
    if (disabled) return;
    onToggleNumber(number);
  };

  const handleQuickPick = () => {
    if (disabled) return;
    onGenerateQuickPick();
  };

  const handleClear = () => {
    if (disabled) return;
    onClearNumbers();
  };

  return (
    <SelectorContainer>
      <GlowEffect />
      
      <Header>
        <Title>Selecciona tus números</Title>
        <QuickActions>
          <Button
            variant="outline"
            size="small"
            onClick={handleClear}
            disabled={disabled || selectedCount === 0}
          >
            Limpiar
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleQuickPick}
            disabled={disabled}
          >
            🎲 Quick Pick
          </Button>
        </QuickActions>
      </Header>

      <TicketInfo>
        <div>
          <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
            Números seleccionados: {selectedCount}/{requiredNumbers}
          </div>
          {ticket.isQuickPick && (
            <QuickPickBadge
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              Quick Pick
            </QuickPickBadge>
          )}
        </div>
        <TicketCost>
          {ticket.cost} USDT
        </TicketCost>
      </TicketInfo>

      <SelectedNumbers>
        <AnimatePresence>
          {ticket.numbers.map((number) => {
            const position = ticket.numbers.indexOf(number);
            return (
              <SelectedNumber
                key={number}
                position={position}
                onClick={() => handleSelectedNumberClick(number)}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', damping: 15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {number}
              </SelectedNumber>
            );
          })}
        </AnimatePresence>
        
        {emptySlots.map((_, index) => (
          <EmptySlot key={`empty-${index}`} position={selectedCount + index}>
            {selectedCount + index + 1}
          </EmptySlot>
        ))}
      </SelectedNumbers>

      <NumberGrid>
        {numberGrid.map((number) => {
          const isSelected = ticket.numbers.includes(number);
          const isDisabled = disabled || (!isSelected && !canSelectMore);
          const isHighlighted = highlightedNumber === number;
          
          return (
            <NumberBall
              key={number}
              selected={isSelected}
              disabled={isDisabled}
              number={number}
              onClick={() => handleNumberClick(number)}
              whileHover={!isDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              animate={isHighlighted ? { 
                scale: [1, 1.2, 1],
                boxShadow: [
                  '0 4px 15px rgba(0, 0, 0, 0.2)',
                  '0 8px 25px rgba(255, 255, 255, 0.3)',
                  '0 4px 15px rgba(0, 0, 0, 0.2)'
                ]
              } : {}}
              transition={{ duration: 0.3 }}
            >
              {number}
            </NumberBall>
          );
        })}
      </NumberGrid>

      <AnimatePresence>
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <ValidationSection
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {validation.errors.length > 0 && (
              <ValidationResult isValid={false}>
                <MessageList>
                  {validation.errors.map((error, index) => (
                    <MessageItem key={index} type="error">
                      {error}
                    </MessageItem>
                  ))}
                </MessageList>
              </ValidationResult>
            )}
            
            {validation.warnings.length > 0 && (
              <ValidationResult isValid={true}>
                <MessageList>
                  {validation.warnings.map((warning, index) => (
                    <MessageItem key={index} type="warning">
                      {warning}
                    </MessageItem>
                  ))}
                </MessageList>
              </ValidationResult>
            )}
          </ValidationSection>
        )}
      </AnimatePresence>
    </SelectorContainer>
  );
};

export default EnhancedNumberSelector;