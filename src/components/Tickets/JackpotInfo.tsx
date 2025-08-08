import React, { useEffect } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import AnimatedCounter from '../Animations/AnimatedCounter';
import CountdownTimer from '../Animations/CountdownTimer';
import { motion } from 'framer-motion';
import { useLottery } from '../../store';

const JackpotCard = styled(Card)`
  text-align: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}20, ${({ theme }) => theme.colors.accent.yellow}20);
  border: 2px solid ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const JackpotTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-weight: 700;
`;

const JackpotAmount = styled(motion.div)`
  font-size: 3rem;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.accent.yellow};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const JackpotInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const InfoItem = styled.div`
  text-align: center;
`;

const InfoValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const InfoLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const NextDrawInfo = styled.div`
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
  
  h3 {
    margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.1rem;
  }
`;

const WinnersSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  
  h4 {
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const WinnerAddress = styled.div`
  font-family: monospace;
  background-color: ${({ theme }) => theme.colors.cardBackground};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: 0.85rem;
`;

const JackpotInfo: React.FC = () => {
  const { 
    jackpot, 
    winners, 
    ticketPrice, 
    timeUntilNextDraw, 
    loading,
    loadLotteryInfo 
  } = useLottery();

  useEffect(() => {
    loadLotteryInfo();
  }, [loadLotteryInfo]);

  const displayPrice = parseFloat(ticketPrice || '5.00');
  const displayJackpot = parseFloat(jackpot || '0');

  return (
    <JackpotCard>
      <JackpotTitle>Jackpot Actual</JackpotTitle>
      
      <JackpotAmount
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 10 
        }}
      >
        <AnimatedCounter 
          value={displayJackpot} 
          formatter={val => val.toLocaleString()} 
          suffix=" USDT"
          duration={2}
        />
      </JackpotAmount>
      
      <JackpotInfo>
        <InfoItem>
          <InfoValue>
            <AnimatedCounter value={winners.length} />
          </InfoValue>
          <InfoLabel>Ganadores Recientes</InfoLabel>
        </InfoItem>
        
        <InfoItem>
          <InfoValue>
            <AnimatedCounter 
              value={displayPrice} 
              formatter={val => val.toFixed(2)} 
              suffix=" USDT" 
            />
          </InfoValue>
          <InfoLabel>Precio del Boleto</InfoLabel>
        </InfoItem>
        
        <InfoItem>
          <InfoValue>{loading ? 'Cargando...' : 'Diario'}</InfoValue>
          <InfoLabel>Frecuencia de Sorteo</InfoLabel>
        </InfoItem>
      </JackpotInfo>
      
      <NextDrawInfo>
        <h3>Próximo Sorteo En:</h3>
        <CountdownTimer 
          targetTime={timeUntilNextDraw}
          onComplete={() => {
            console.log('¡Sorteo realizado!');
            loadLotteryInfo(); // Refresh data after draw
          }}
        />
      </NextDrawInfo>
      
      <WinnersSection>
        <h4>🎉 Últimos Ganadores</h4>
        {winners.slice(0, 3).map((address, index) => (
          <WinnerAddress key={index}>
            {address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address}
          </WinnerAddress>
        ))}
      </WinnersSection>
    </JackpotCard>
  );
};

export default JackpotInfo;