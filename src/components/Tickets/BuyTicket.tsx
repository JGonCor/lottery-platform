import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import Button from '../UI/Button';
import NumberSelector from './NumberSelector';
import { useWeb3, useLottery } from '../../store';

const BuyTicketCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  max-width: 500px;
  width: 100%;
`;

const CardTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const PriceInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const TicketPrice = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.yellow};
`;

const CurrencyLabel = styled.span`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.text};
`;

const TotalAmount = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md} 0;
  border-top: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const BalanceInfo = styled.div`
  display: flex;
  justify-content: flex-end;
  font-size: 0.9rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TicketCount = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const CountButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: scale(1.1);
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CountDisplay = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  min-width: 60px;
  text-align: center;
`;

const StatusMessage = styled.div<{ type?: 'error' | 'warning' | 'success' | 'info' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin: ${({ theme }) => theme.spacing.md} 0;
  text-align: center;
  background-color: ${({ theme, type }) => {
    switch (type) {
      case 'error': return 'rgba(255, 82, 82, 0.1)';
      case 'warning': return 'rgba(255, 193, 7, 0.1)';
      case 'success': return 'rgba(76, 175, 80, 0.1)';
      default: return 'rgba(33, 150, 243, 0.1)';
    }
  }};
  border: 1px solid ${({ theme, type }) => {
    switch (type) {
      case 'error': return 'rgba(255, 82, 82, 0.3)';
      case 'warning': return 'rgba(255, 193, 7, 0.3)';
      case 'success': return 'rgba(76, 175, 80, 0.3)';
      default: return 'rgba(33, 150, 243, 0.3)';
    }
  }};
  color: ${({ theme }) => theme.colors.text};
`;

interface Ticket {
  id: number;
  numbers: number[];
}

const BuyTicket: React.FC = () => {
  const { account, active, connectWallet } = useWeb3();
  const { 
    ticketPrice, 
    usdtBalance, 
    loading: lotteryLoading,
    error, 
    isApproved, 
    buyTicket,
    buyMultipleTickets,
    approveUsdtSpending,
    loadLotteryInfo
  } = useLottery();
  
  const [tickets, setTickets] = useState<Ticket[]>([{ id: 1, numbers: [] }]);
  const [currentTicketNumbers, setCurrentTicketNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    message: string;
    type?: 'error' | 'warning' | 'success' | 'info';
  } | null>(null);

  // Use real data from hooks
  const ticketPriceNum = parseFloat(ticketPrice || '5.00');
  const usdtBalanceNum = parseFloat(usdtBalance || '0');
  const isConnected = active && !!account;

  // Load lottery info on mount
  useEffect(() => {
    loadLotteryInfo();
  }, [loadLotteryInfo]);

  const ticketCount = tickets.length;
  const totalAmount = ticketCount * ticketPriceNum;

  const addTicket = () => {
    if (ticketCount < 10) { // Max 10 tickets
      setTickets([...tickets, { id: Date.now(), numbers: [] }]);
    }
  };

  const removeTicket = () => {
    if (ticketCount > 1) {
      setTickets(tickets.slice(0, -1));
    }
  };

  const handleNumbersSelected = (numbers: number[]) => {
    setCurrentTicketNumbers(numbers);
  };

  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      setStatusMessage({ 
        message: 'Conectando billetera...', 
        type: 'info' 
      });
      
      await connectWallet();
      
      setLoading(false);
      setStatusMessage({ 
        message: 'Billetera conectada exitosamente', 
        type: 'success' 
      });
    } catch (error: any) {
      setLoading(false);
      setStatusMessage({ 
        message: error.message || 'Error al conectar billetera', 
        type: 'error' 
      });
    }
  };

  const handleBuyTickets = async () => {
    if (!isConnected) {
      await handleConnectWallet();
      return;
    }
    
    if (currentTicketNumbers.length === 0) {
      setStatusMessage({ 
        message: 'Por favor selecciona números para tu ticket', 
        type: 'warning' 
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({ 
        message: isApproved ? 'Comprando tickets...' : 'Aprobando USDT...', 
        type: 'info' 
      });

      // If not approved, approve first
      if (!isApproved) {
        await approveUsdtSpending();
        setStatusMessage({ 
          message: 'USDT aprobado. Comprando tickets...', 
          type: 'info' 
        });
      }

      // Buy single or multiple tickets
      if (ticketCount === 1) {
        await buyTicket(currentTicketNumbers);
      } else {
        const allNumbers = tickets.map((_, index) => 
          index === 0 ? currentTicketNumbers : []
        ).filter(nums => nums.length > 0);
        
        if (allNumbers.length > 0) {
          await buyMultipleTickets(allNumbers);
        }
      }

      setLoading(false);
      setStatusMessage({ 
        message: `¡${ticketCount} ticket(s) comprado(s) exitosamente!`, 
        type: 'success' 
      });

      // Reset form
      setTickets([{ id: 1, numbers: [] }]);
      setCurrentTicketNumbers([]);
      
    } catch (error: any) {
      setLoading(false);
      setStatusMessage({ 
        message: error.message || 'Error al comprar tickets', 
        type: 'error' 
      });
    }
  };

  return (
    <BuyTicketCard>
      <CardTitle>🎫 Comprar Tickets</CardTitle>
      
      <PriceInfo>
        <TicketPrice>{ticketPriceNum.toFixed(2)}</TicketPrice>
        <CurrencyLabel>USDT por ticket</CurrencyLabel>
      </PriceInfo>
      
      <TicketCount>
        <CountButton onClick={removeTicket} disabled={ticketCount <= 1}>
          −
        </CountButton>
        <CountDisplay>{ticketCount}</CountDisplay>
        <CountButton onClick={addTicket} disabled={ticketCount >= 10}>
          +
        </CountButton>
      </TicketCount>

      <div style={{ margin: '20px 0' }}>
        <NumberSelector 
          onNumbersSelected={handleNumbersSelected}
          selectedNumbers={currentTicketNumbers}
        />
              </div>

      <TotalAmount>
        <span>Total:</span>
        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          {totalAmount.toFixed(2)} USDT
                  </span>
      </TotalAmount>

        <BalanceInfo>
        Balance: {usdtBalanceNum.toFixed(2)} USDT {!isConnected && '(simulado)'}
        </BalanceInfo>

      {statusMessage && (
        <StatusMessage type={statusMessage.type}>
          {statusMessage.message}
        </StatusMessage>
      )}
      
      <Button 
        variant="primary" 
        onClick={isConnected ? handleBuyTickets : handleConnectWallet}
        loading={loading || lotteryLoading}
        disabled={loading || lotteryLoading}
        style={{ width: '100%' }}
      >
        {loading || lotteryLoading
            ? 'Procesando...' 
          : isConnected 
            ? `Comprar ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`
            : 'Conectar Billetera'
        }
      </Button>
      
      {!isConnected && (
        <StatusMessage type="info">
          💡 Conecta tu billetera para comprar tickets reales con USDT
        </StatusMessage>
      )}
    </BuyTicketCard>
  );
};

export default BuyTicket;