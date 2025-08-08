import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../UI/Button';
import { LotteryTicket, MatchResult } from '../../hooks/useLotteryTickets';

const TicketsContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  &::before {
    content: '🎫';
    font-size: 2rem;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}10, 
    ${({ theme }) => theme.colors.secondary}05
  );
  border: 2px solid ${({ theme }) => theme.colors.primary}20;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FilterSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FilterButton = styled(Button)<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  font-size: 0.85rem;
  
  ${({ active, theme }) => active && `
    background: ${theme.colors.primary};
    color: white;
  `}
`;

const TicketsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const TicketCard = styled(motion.div)<{ status: string }>`
  background: ${({ theme }) => 
    theme.mode === 'dark' 
      ? 'linear-gradient(135deg, #1a1a2e, #16213e)' 
      : 'linear-gradient(135deg, #ffffff, #f8f9ff)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 2px solid ${({ status, theme }) => {
    switch (status) {
      case 'winning': return '#10b981';
      case 'losing': return theme.colors.primary + '20';
      case 'pending': return '#f59e0b';
      case 'confirmed': return theme.colors.primary + '40';
      default: return theme.colors.primary + '20';
    }
  }};
  position: relative;
  overflow: hidden;
`;

const StatusBadge = styled.div<{ status: string }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${({ status }) => {
    switch (status) {
      case 'winning':
        return `
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        `;
      case 'losing':
        return `
          background: #6b728015;
          color: #6b7280;
          border: 1px solid #6b728030;
        `;
      case 'pending':
        return `
          background: linear-gradient(45deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        `;
      case 'confirmed':
        return `
          background: #3b82f615;
          color: #2563eb;
          border: 1px solid #2563eb30;
        `;
      default:
        return `
          background: #6b728015;
          color: #6b7280;
        `;
    }
  }}
`;

const WinningBadge = styled(motion.div)`
  position: absolute;
  top: -10px;
  left: -10px;
  width: 80px;
  height: 80px;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  animation: sparkle 2s ease-in-out infinite;
  
  @keyframes sparkle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(5deg); }
  }
  
  &::before {
    content: '🏆';
  }
`;

const TicketHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const TicketId = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.7;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const TicketDate = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.6;
`;

const NumbersSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const NumbersTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1rem;
  font-weight: 600;
`;

const NumbersGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const NumberBall = styled.div<{ 
  number: number; 
  isWinning?: boolean;
  isMatched?: boolean;
}>`
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  position: relative;
  
  background: ${({ number, isWinning, isMatched }) => {
    if (isMatched) {
      return 'linear-gradient(135deg, #10b981, #059669)';
    }
    if (isWinning) {
      return 'linear-gradient(135deg, #ffd700, #ffed4e)';
    }
    
    const colors = [
      'linear-gradient(135deg, #e91e63, #ad1457)',
      'linear-gradient(135deg, #9c27b0, #6a1b99)',
      'linear-gradient(135deg, #3f51b5, #283593)',
      'linear-gradient(135deg, #2196f3, #1565c0)',
      'linear-gradient(135deg, #4caf50, #2e7d32)',
      'linear-gradient(135deg, #ff9800, #f57400)'
    ];
    return colors[(number - 1) % colors.length];
  }};
  
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  ${({ isMatched }) => isMatched && `
    animation: match-glow 1s ease-in-out infinite alternate;
    
    @keyframes match-glow {
      from { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); }
      to { box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); }
    }
  `}
  
  ${({ isWinning }) => isWinning && `
    &::after {
      content: '✨';
      position: absolute;
      top: -8px;
      right: -8px;
      font-size: 0.8rem;
      animation: sparkle-small 2s ease-in-out infinite;
    }
    
    @keyframes sparkle-small {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 0.7; }
    }
  `}
`;

const QuickPickIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &::before {
    content: '🎲';
    font-size: 0.8rem;
  }
`;

const TicketFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.primary}20;
`;

const TicketCost = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const PrizeAmount = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  &::before {
    content: '🏆';
    font-size: 1.2rem;
  }
`;

const MatchInfo = styled.div`
  background: linear-gradient(135deg, #10b98115, #05966915);
  border: 1px solid #05966930;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MatchTitle = styled.div`
  font-weight: 700;
  color: #059669;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  &::before {
    content: '🎯';
    font-size: 1.1rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.7;
`;

interface UserTicketsDisplayProps {
  tickets: LotteryTicket[];
  matches?: MatchResult[];
  winningNumbers?: number[];
  stats: {
    totalTickets: string;
    winningTickets: string;
    totalPrizes: string;
    totalSpent: string;
    winRate: string;
  };
}

const UserTicketsDisplay: React.FC<UserTicketsDisplayProps> = ({
  tickets,
  matches = [],
  winningNumbers = [],
  stats
}) => {
  const [filter, setFilter] = useState<'all' | 'winning' | 'losing' | 'pending'>('all');

  const filteredTickets = tickets.filter(ticket => {
    switch (filter) {
      case 'winning':
        return ticket.status === 'winning';
      case 'losing':
        return ticket.status === 'losing';
      case 'pending':
        return ticket.status === 'pending' || ticket.status === 'confirmed';
      default:
        return true;
    }
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'winning': return 'Ganador';
      case 'losing': return 'Perdedor';
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'draft': return 'Borrador';
      default: return status;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchedNumbers = (ticket: LotteryTicket): number[] => {
    if (winningNumbers.length === 0) return [];
    return ticket.numbers.filter(num => winningNumbers.includes(num));
  };

  return (
    <TicketsContainer>
      <SectionTitle>Mis Tickets</SectionTitle>
      
      {/* Statistics */}
      <StatsGrid>
        <StatCard>
          <StatValue>{stats.totalTickets}</StatValue>
          <StatLabel>Total Tickets</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.winningTickets}</StatValue>
          <StatLabel>Tickets Ganadores</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>${stats.totalPrizes}</StatValue>
          <StatLabel>Total Premios</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.winRate}%</StatValue>
          <StatLabel>Tasa de Éxito</StatLabel>
        </StatCard>
      </StatsGrid>

      {/* Filters */}
      {tickets.length > 0 && (
        <FilterSection>
          <FilterButton
            variant="outline"
            size="small"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Todos ({tickets.length})
          </FilterButton>
          <FilterButton
            variant="outline"
            size="small"
            active={filter === 'winning'}
            onClick={() => setFilter('winning')}
          >
            Ganadores ({tickets.filter(t => t.status === 'winning').length})
          </FilterButton>
          <FilterButton
            variant="outline"
            size="small"
            active={filter === 'losing'}
            onClick={() => setFilter('losing')}
          >
            Perdedores ({tickets.filter(t => t.status === 'losing').length})
          </FilterButton>
          <FilterButton
            variant="outline"
            size="small"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
          >
            Pendientes ({tickets.filter(t => ['pending', 'confirmed'].includes(t.status)).length})
          </FilterButton>
        </FilterSection>
      )}

      {/* Tickets List */}
      <TicketsList>
        <AnimatePresence>
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => {
              const matchedNumbers = getMatchedNumbers(ticket);
              const hasMatches = matchedNumbers.length > 0;
              
              return (
                <TicketCard
                  key={ticket.id}
                  status={ticket.status}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {ticket.status === 'winning' && <WinningBadge />}
                  
                  <StatusBadge status={ticket.status}>
                    {getStatusText(ticket.status)}
                  </StatusBadge>
                  
                  <TicketHeader>
                    <div>
                      <TicketId>#{ticket.id.slice(-8)}</TicketId>
                      <TicketDate>{formatDate(ticket.purchaseTime)}</TicketDate>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      {ticket.isQuickPick && <QuickPickIndicator>Quick Pick</QuickPickIndicator>}
                    </div>
                  </TicketHeader>

                  <NumbersSection>
                    <NumbersTitle>Números Seleccionados</NumbersTitle>
                    <NumbersGrid>
                      {ticket.numbers.map((number) => (
                        <NumberBall
                          key={number}
                          number={number}
                          isWinning={winningNumbers.includes(number)}
                          isMatched={matchedNumbers.includes(number)}
                        >
                          {number}
                        </NumberBall>
                      ))}
                    </NumbersGrid>
                  </NumbersSection>

                  {hasMatches && (
                    <MatchInfo>
                      <MatchTitle>
                        {matchedNumbers.length} número{matchedNumbers.length !== 1 ? 's' : ''} coinciden
                      </MatchTitle>
                      <div style={{ fontSize: '0.9rem' }}>
                        Números coincidentes: {matchedNumbers.join(', ')}
                      </div>
                    </MatchInfo>
                  )}

                  <TicketFooter>
                    <TicketCost>Costo: {ticket.cost} USDT</TicketCost>
                    {ticket.prize && parseFloat(ticket.prize) > 0 && (
                      <PrizeAmount>
                        Premio: {ticket.prize} USDT
                      </PrizeAmount>
                    )}
                  </TicketFooter>
                </TicketCard>
              );
            })
          ) : tickets.length === 0 ? (
            <EmptyState>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎫</div>
              <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                No tienes tickets aún
              </div>
              <div>
                ¡Compra tu primer ticket y comienza a jugar!
              </div>
            </EmptyState>
          ) : (
            <EmptyState>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔍</div>
              <div>
                No hay tickets que coincidan con el filtro seleccionado
              </div>
            </EmptyState>
          )}
        </AnimatePresence>
      </TicketsList>
    </TicketsContainer>
  );
};

export default UserTicketsDisplay;