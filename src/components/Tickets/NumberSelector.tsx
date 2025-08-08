import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Button from '../UI/Button';

const NumberSelectorContainer = styled.div`
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const SelectorTitle = styled.h3`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SelectorDescription = styled.p`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 0.9rem;
`;

const SelectionModes = styled.div`
  display: flex;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: 4px;
`;

const ModeButton = styled.button<{ isActive: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: none;
  background-color: ${({ isActive, theme }) => 
    isActive ? theme.colors.primary : 'transparent'
  };
  color: ${({ isActive, theme }) => 
    isActive ? theme.colors.base.white : theme.colors.text
  };
  font-weight: ${({ isActive }) => isActive ? '600' : '400'};
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  
  &:hover {
    background-color: ${({ isActive, theme }) => 
      isActive ? theme.colors.primary : 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    };
  }
`;

const NumberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: 500px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const NumberButton = styled(motion.button)<{ isSelected: boolean }>`
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ isSelected }) => isSelected ? '700' : '400'};
  background-color: ${({ isSelected, theme }) => 
    isSelected ? theme.colors.primary : 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  color: ${({ isSelected, theme }) => 
    isSelected ? theme.colors.base.white : theme.colors.text
  };
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ isSelected, theme }) => 
      isSelected ? theme.colors.primary : 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    };
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const SelectedNumbers = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin: ${({ theme }) => theme.spacing.md} 0;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const NumberBall = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

interface NumberSelectorProps {
  onSelectNumbers: (numbers: number[]) => void;
}

const NumberSelector: React.FC<NumberSelectorProps> = ({ onSelectNumbers }) => {
  const [mode, setMode] = useState<'manual' | 'random'>('manual');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [availableNumbers] = useState<number[]>(
    Array.from({ length: 49 }, (_, i) => i + 1)
  );
  
  const requiredNumbers = 6;
  
  // Generate random numbers for quick pick
  const generateRandomNumbers = () => {
    const allNumbers = Array.from({ length: 49 }, (_, i) => i + 1);
    const randomPick: number[] = [];
    
    for (let i = 0; i < requiredNumbers; i++) {
      const randomIndex = Math.floor(Math.random() * allNumbers.length);
      randomPick.push(allNumbers[randomIndex]);
      allNumbers.splice(randomIndex, 1);
    }
    
    return randomPick.sort((a, b) => a - b);
  };
  
  const handleModeChange = (newMode: 'manual' | 'random') => {
    setMode(newMode);
    
    if (newMode === 'random') {
      const randomPick = generateRandomNumbers();
      setSelectedNumbers(randomPick);
      onSelectNumbers(randomPick);
    }
  };
  
  const toggleNumber = (number: number) => {
    if (selectedNumbers.includes(number)) {
      // Remove number
      setSelectedNumbers(prev => prev.filter(n => n !== number));
    } else if (selectedNumbers.length < requiredNumbers) {
      // Add number
      setSelectedNumbers(prev => [...prev, number]);
    }
  };
  
  const handleRandomize = () => {
    const randomPick = generateRandomNumbers();
    setSelectedNumbers(randomPick);
  };
  
  const handleClear = () => {
    setSelectedNumbers([]);
  };
  
  // Notify parent component when numbers change
  useEffect(() => {
    onSelectNumbers(selectedNumbers);
  }, [selectedNumbers, onSelectNumbers]);
  
  return (
    <NumberSelectorContainer>
      <SelectorTitle>Selecciona tus Números</SelectorTitle>
      <SelectorDescription>
        Elige 6 números entre 1 y 49, o usa la Selección Rápida para una selección aleatoria.
      </SelectorDescription>
      
      <SelectionModes>
        <ModeButton
          isActive={mode === 'manual'}
          onClick={() => handleModeChange('manual')}
        >
          Selección Manual
        </ModeButton>
        <ModeButton
          isActive={mode === 'random'}
          onClick={() => handleModeChange('random')}
        >
          Selección Rápida
        </ModeButton>
      </SelectionModes>
      
      {mode === 'manual' && (
        <>
          <NumberGrid>
            {availableNumbers.map(number => (
              <NumberButton
                key={number}
                isSelected={selectedNumbers.includes(number)}
                onClick={() => toggleNumber(number)}
                disabled={selectedNumbers.length >= requiredNumbers && !selectedNumbers.includes(number)}
                whileTap={{ scale: 0.95 }}
              >
                {number}
              </NumberButton>
            ))}
          </NumberGrid>
          
          <ActionButtons>
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={selectedNumbers.length === 0}
            >
              Limpiar
            </Button>
            <Button 
              onClick={handleRandomize}
              disabled={mode !== 'manual'}
            >
              Aleatorio
            </Button>
          </ActionButtons>
        </>
      )}
      
      <SelectedNumbers>
        {selectedNumbers.sort((a, b) => a - b).map(number => (
          <NumberBall key={number}>{number}</NumberBall>
        ))}
        
        {selectedNumbers.length < requiredNumbers && mode === 'manual' && (
          <span style={{ alignSelf: 'center' }}>
            Selecciona {requiredNumbers - selectedNumbers.length} más
          </span>
        )}
      </SelectedNumbers>
    </NumberSelectorContainer>
  );
};

export default NumberSelector;