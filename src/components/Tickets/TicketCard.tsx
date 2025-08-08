import React from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';

interface TicketCardProps {
  ticketId: number;
  purchaseDate: string;
  isWinner?: boolean;
}

const TicketWrapper = styled(Card)<{ isWinner?: boolean }>`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.lg};
  border: ${({ theme, isWinner }) => 
    isWinner ? `2px solid ${theme.colors.accent.yellow}` : 'none'
  };
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.03);
  }
  
  ${({ isWinner }) =>
    isWinner &&
    `
    &:before {
      content: 'WINNER';
      position: absolute;
      top: 10px;
      right: -30px;
      background-color: #FFD700;
      color: #000;
      padding: 5px 40px;
      transform: rotate(45deg);
      font-weight: bold;
      font-size: 0.8rem;
    }
  `}
`;

const TicketHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const TicketNumber = styled.h3`
  margin: 0;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const TicketDate = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
  };
`;

const TicketImage = styled.div`
  background-color: ${({ theme }) => theme.colors.complementary.lightGreen};
  height: 120px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: ${({ theme }) => theme.colors.base.white};
`;

const TicketStatus = styled.div<{ isWinner?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme, isWinner }) => 
    isWinner ? theme.colors.accent.yellow : theme.colors.complementary.darkGreen
  };
  color: ${({ theme, isWinner }) => 
    isWinner ? theme.colors.base.black : theme.colors.base.white
  };
  text-align: center;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: 600;
`;

const TicketCard: React.FC<TicketCardProps> = ({ 
  ticketId, 
  purchaseDate, 
  isWinner = false 
}) => {
  return (
    <TicketWrapper 
      isWinner={isWinner}
      hoverable
    >
      <TicketHeader>
        <TicketNumber>Ticket #{ticketId}</TicketNumber>
        <TicketDate>{purchaseDate}</TicketDate>
      </TicketHeader>
      
      <TicketImage>
        🎫
      </TicketImage>
      
      <TicketStatus isWinner={isWinner}>
        {isWinner ? '¡Ganador!' : 'Activo'}
      </TicketStatus>
    </TicketWrapper>
  );
};

export default TicketCard;