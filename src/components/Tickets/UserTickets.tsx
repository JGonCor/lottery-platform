import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { useLottery } from '../../store';

const UserTicketsCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CardTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const TicketItem = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
  };
`;

const TicketHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const TicketId = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const TicketStatus = styled.span<{ status: 'active' | 'winner' | 'lost' }>`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 0.85rem;
  font-weight: 600;
  background-color: ${({ status }) => {
    switch (status) {
      case 'winner': return 'rgba(76, 175, 80, 0.2)';
      case 'lost': return 'rgba(255, 82, 82, 0.2)';
      default: return 'rgba(33, 150, 243, 0.2)';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'winner': return '#4CAF50';
      case 'lost': return '#FF5252';
      default: return '#2196F3';
    }
  }};
`;

const NumbersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
  gap: ${({ theme }) => theme.spacing.xs};
  margin: ${({ theme }) => theme.spacing.sm} 0;
  max-width: 300px;
`;

const NumberBall = styled.div<{ isWinning?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  background-color: ${({ theme, isWinning }) => 
    isWinning 
      ? theme.colors.accent.yellow 
      : theme.colors.primary
  };
  color: ${({ isWinning }) => isWinning ? '#000' : '#FFF'};
  border: ${({ isWinning }) => isWinning ? '2px solid #FFD700' : 'none'};
  animation: ${({ isWinning }) => isWinning ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

const TicketInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const PrizeAmount = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.yellow};
  font-size: 1.1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
  
  .icon {
    font-size: 3rem;
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
  
  .message {
    font-size: 1.1rem;
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
  
  .submessage {
    font-size: 0.9rem;
    opacity: 0.8;
  }
`;

interface UserTicket {
  id: string;
  numbers: number[];
  purchaseDate: string;
  status: 'active' | 'winner' | 'lost';
  prizeAmount?: number;
  winningNumbers?: number[];
}

// Mock data for demonstration
const mockTickets: UserTicket[] = [
  {
    id: 'T-2024-001',
    numbers: [7, 15, 23, 31, 42, 49],
    purchaseDate: '2024-01-15',
    status: 'winner',
    prizeAmount: 125.50,
    winningNumbers: [7, 15, 23, 31, 42, 49]
  },
  {
    id: 'T-2024-002',
    numbers: [3, 12, 18, 27, 35, 44],
    purchaseDate: '2024-01-15',
    status: 'lost',
    winningNumbers: [5, 12, 20, 28, 36, 45]
  },
  {
    id: 'T-2024-003',
    numbers: [9, 16, 22, 29, 37, 43],
    purchaseDate: '2024-01-16',
    status: 'active'
  }
];

const UserTickets: React.FC = () => {
  const { 
    tickets: lotteryTickets, 
    loading: lotteryLoading, 
    loadUserTickets 
  } = useLottery();
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserTickets();
  }, [loadUserTickets]);

  // Convert lottery tickets to display format
  const tickets: UserTicket[] = lotteryTickets.map(ticket => ({
    id: `T-${ticket.id}`,
    numbers: ticket.numbers || [],
    purchaseDate: ticket.purchaseDate,
    status: ticket.isWinner ? 'winner' : 'lost',
    prizeAmount: ticket.isWinner ? 125.50 : undefined,
    winningNumbers: ticket.isWinner ? ticket.numbers : undefined
  }));

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadUserTickets();
    } finally {
      setLoading(false);
    }
  };

  const isWinningNumber = (number: number, winningNumbers?: number[]) => {
    return winningNumbers?.includes(number) || false;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (tickets.length === 0) {
    return (
      <UserTicketsCard>
        <CardTitle>🎫 Mis Tickets</CardTitle>
        <EmptyState>
          <div className="icon">🎟️</div>
          <div className="message">No tienes tickets aún</div>
          <div className="submessage">
            ¡Compra tu primer ticket para participar en el sorteo!
          </div>
        </EmptyState>
      </UserTicketsCard>
    );
  }

  return (
    <UserTicketsCard>
      <CardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        🎫 Mis Tickets ({tickets.length})
        <Button 
          variant="secondary" 
          size="small" 
          onClick={handleRefresh}
          loading={loading || lotteryLoading}
        >
          🔄 Actualizar
        </Button>
      </CardTitle>

      {tickets.map((ticket) => (
        <TicketItem key={ticket.id}>
          <TicketHeader>
            <TicketId>#{ticket.id}</TicketId>
            <TicketStatus status={ticket.status}>
              {ticket.status === 'winner' && '🏆 Ganador'}
              {ticket.status === 'lost' && '❌ No ganó'}
              {ticket.status === 'active' && '⏳ Activo'}
            </TicketStatus>
          </TicketHeader>

          <NumbersGrid>
            {ticket.numbers.map((number, index) => (
              <NumberBall 
                key={index}
                isWinning={isWinningNumber(number, ticket.winningNumbers)}
              >
                {number}
              </NumberBall>
            ))}
          </NumbersGrid>

          <TicketInfo>
            <span>Comprado: {formatDate(ticket.purchaseDate)}</span>
            {ticket.prizeAmount && (
              <PrizeAmount>
                +{ticket.prizeAmount.toFixed(2)} USDT
              </PrizeAmount>
            )}
          </TicketInfo>
        </TicketItem>
      ))}

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px', 
        padding: '15px',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(33, 150, 243, 0.2)'
      }}>
        💡 Los tickets se revisan automáticamente después de cada sorteo
      </div>
    </UserTicketsCard>
  );
};

export default UserTickets;