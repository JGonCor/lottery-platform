import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { LotterySpinner } from '../UI/LoadingSpinner';
// Removed unused imports - using winnersDataService directly
import { getWinnersData, WinnerData } from '../../utils/winnersDataService';
// MultiTierLotteryABI now handled by winnersDataService

// Usar la interfaz del servicio
type WinnerRound = WinnerData;

// Componentes estilizados
const WinnersContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const RoundCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  overflow: hidden;
  position: relative;
`;

const RoundHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
`;

const RoundTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const RoundNumber = styled.span`
  font-weight: bold;
`;

const RoundDate = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
  };
`;

const Navigation = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const NavButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.circle};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
    };
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LatestTag = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.complementary.darkGreen});
  color: white;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  transform: rotate(45deg) translate(20%, -50%);
  font-size: 0.8rem;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

const WinningNumbersSection = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
`;

const WinningNumbersTitle = styled.h3`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const NumbersContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  flex-wrap: wrap;
`;

const NumberBall = styled.div<{ number: number }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  color: white;
  background-color: ${({ number, theme }) => {
    const colors = [
      '#e91e63', // Rosa
      '#9c27b0', // Púrpura
      '#03a9f4', // Azul claro
      '#4caf50', // Verde
      '#ffc107', // Amarillo
      '#ff9800'  // Naranja
    ];
    return colors[number % colors.length];
  }};
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
`;

const PrizePoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const PrizePoolInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const PrizePoolTitle = styled.h3`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const PrizeAmount = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const TokenAmount = styled.div`
  font-size: 1.2rem;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
  };
`;

const MatchingRules = styled.div`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
  };
`;

const MatchingTable = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const MatchingItem = styled.div`
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MatchingTitle = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: bold;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  text-align: center;
  font-size: 0.9rem;
`;

const MatchingPrize = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const MatchingUSDValue = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
  };
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const MatchingWinners = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
  };
`;

const TotalPlayers = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TotalPlayersLabel = styled.div`
  font-weight: bold;
`;

const TotalPlayersValue = styled.div`
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
`;

const ActionButtons = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

// Datos mock eliminados - ahora usando datos reales del blockchain

const Winners: React.FC = () => {
  // Removed unused web3 hook
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [realRounds, setRealRounds] = useState<WinnerRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar datos reales de ganadores del contrato
  const loadWinnersData = useCallback(async () => {
    let isMounted = true;
    
    try {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      console.log('🏆 Loading REAL winners data from contract using read-only Web3...');
      
      // Cargar datos reales del blockchain
      const winnersData = await getWinnersData();
      
      if (isMounted) {
        if (winnersData.error) {
          console.log('❌ Error loading winners data:', winnersData.error);
          setError(winnersData.error);
          setLoading(false);
        } else if (winnersData.rounds.length > 0) {
          console.log('✅ Real winners data loaded successfully:', winnersData.rounds.length, 'rounds');
          setRealRounds(winnersData.rounds);
          setLoading(false);
          setError(null);
        } else {
          console.log('⚠️ No winners data available yet');
          setError('No hay sorteos completados aún. El primer sorteo se realizará después de 24 horas de actividad.');
          setLoading(false);
        }
      }

    } catch (error: any) {
      console.log('❌ Error loading real winners data:', error?.message || 'Unknown error');
      if (isMounted) {
        setError(error?.message || 'Error al cargar datos de ganadores');
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []); // Removed web3 dependency

  useEffect(() => {
    // Solo cargar una vez al montar el componente
    let isInitialLoad = true;
    
    if (isInitialLoad) {
      loadWinnersData();
    }
    
    return () => {
      isInitialLoad = false;
    };
  }, []); // Sin dependencias para evitar loops

  // SOLO usar datos reales - NO usar mock data
  const currentRounds = realRounds;
  const currentRound = currentRounds[currentRoundIndex];

  const goToPrevRound = () => {
    if (currentRoundIndex < currentRounds.length - 1) {
      setCurrentRoundIndex(currentRoundIndex + 1);
    }
  };

  const goToNextRound = () => {
    if (currentRoundIndex > 0) {
      setCurrentRoundIndex(currentRoundIndex - 1);
    }
  };

  const goToLatest = () => {
    setCurrentRoundIndex(0);
  };

  if (loading) {
    return (
      <WinnersContainer>
        <PageTitle>Historial de Ganadores</PageTitle>
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <LotterySpinner 
            size="large" 
            message="Cargando historial de sorteos desde el blockchain..." 
          />
        </Card>
      </WinnersContainer>
    );
  }

  if (error || !currentRound) {
    return (
      <WinnersContainer>
        <PageTitle>Historial de Ganadores</PageTitle>
        <Card style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>⚠️ {error || 'No hay datos disponibles'}</h3>
          <p style={{ marginTop: '1rem', opacity: 0.7 }}>
            {error || 'No se encontraron sorteos completados'}
          </p>
          <Button 
            variant="primary" 
            onClick={loadWinnersData}
            style={{ marginTop: '2rem' }}
          >
            Intentar de nuevo
          </Button>
        </Card>
      </WinnersContainer>
    );
  }

  return (
    <WinnersContainer>
      <PageTitle>Historial de Ganadores</PageTitle>
      
      <RoundCard>
        {currentRound.isLatest && <LatestTag>Último</LatestTag>}
        
        <RoundHeader>
          <RoundTitle>
            Ronda <RoundNumber>{currentRound.drawId}</RoundNumber>
          </RoundTitle>
          <RoundDate>Sorteado: {currentRound.date}</RoundDate>
          <Navigation>
            <NavButton onClick={goToPrevRound} disabled={currentRoundIndex === currentRounds.length - 1}>
              &lt;
            </NavButton>
            <NavButton onClick={goToNextRound} disabled={currentRoundIndex === 0}>
              &gt;
            </NavButton>
            <NavButton onClick={goToLatest} disabled={currentRoundIndex === 0}>
              &raquo;
            </NavButton>
          </Navigation>
        </RoundHeader>
        
        <WinningNumbersSection>
          <WinningNumbersTitle>Número ganador</WinningNumbersTitle>
          <NumbersContainer>
            {currentRound.winningNumbers.map((number, index) => (
              <NumberBall key={index} number={index}>
                {number}
              </NumberBall>
            ))}
          </NumbersContainer>
        </WinningNumbersSection>
        
        <PrizePoolSection>
          <PrizePoolInfo>
            <PrizePoolTitle>Pool del premio</PrizePoolTitle>
            <PrizeAmount>~{currentRound.prizePool.usdValue}</PrizeAmount>
            <TokenAmount>{currentRound.prizePool.tokenAmount}</TokenAmount>
          </PrizePoolInfo>
          
          <div>
            <MatchingRules>
              Haz que coincida el número ganador en el mismo orden para compartir los premios.
            </MatchingRules>
            <MatchingTable>
              {currentRound.matches.map((match, index) => (
                <MatchingItem key={index}>
                  <MatchingTitle>{match.type}</MatchingTitle>
                  <MatchingPrize>{match.prize}</MatchingPrize>
                  <MatchingUSDValue>~{match.usdValue}</MatchingUSDValue>
                  <MatchingUSDValue>{match.prizePerTicket}</MatchingUSDValue>
                  <MatchingWinners>{match.winners} boletos ganadores</MatchingWinners>
                </MatchingItem>
              ))}
            </MatchingTable>
          </div>
        </PrizePoolSection>
        
        <TotalPlayers>
          <TotalPlayersLabel>
            Número total de jugadores para esta ronda:
          </TotalPlayersLabel>
          <TotalPlayersValue>{currentRound.totalPlayers}</TotalPlayersValue>
        </TotalPlayers>
        
        <ActionButtons>
          <Button
            variant="outline"
            onClick={() => window.open(`https://bscscan.com/address/${process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS}`, '_blank')}
          >
            Ver Contrato en BscScan
          </Button>
          {currentRound.blockNumber && (
            <Button
              variant="outline"
              onClick={() => window.open(`https://bscscan.com/block/${currentRound.blockNumber}`, '_blank')}
            >
              Ver Bloque #{currentRound.blockNumber}
            </Button>
          )}
        </ActionButtons>
      </RoundCard>
    </WinnersContainer>
  );
};

export default Winners;