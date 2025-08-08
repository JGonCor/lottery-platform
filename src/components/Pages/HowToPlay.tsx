import React from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import PrizeDistributionChart from '../Charts/PrizeDistributionChart';
import LotteryFlowDiagram from '../Charts/LotteryFlowDiagram';

const HowToPlayContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const StepCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const StepTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
`;

const StepNumber = styled.span`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.md};
  font-size: 1rem;
`;

const StepDescription = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.6;
`;

const ImportantNote = styled.div`
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 4px solid ${({ theme }) => theme.colors.accent.yellow};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const HowToPlay: React.FC = () => {
  return (
    <HowToPlayContainer>
      <PageTitle>How to Play USDT Lottery</PageTitle>
      
      <Card>
        <LotteryFlowDiagram />
      </Card>
      
      <StepCard>
        <StepTitle>
          <StepNumber>1</StepNumber>
          Connect Your Wallet
        </StepTitle>
        <StepDescription>
          First, you need to connect your BSC-compatible wallet (like MetaMask, Trust Wallet, etc.) to our platform. 
          Click the "Connect Wallet" button in the top right corner and select your wallet provider.
        </StepDescription>
        <StepDescription>
          Make sure your wallet is configured for Binance Smart Chain (BSC) and has USDT tokens (BEP-20) available.
        </StepDescription>
      </StepCard>
      
      <StepCard>
        <StepTitle>
          <StepNumber>2</StepNumber>
          Buy Lottery Tickets
        </StepTitle>
        <StepDescription>
          Each ticket costs 5 USDT. You can buy as many tickets as you want, as long as you have enough USDT in your wallet.
        </StepDescription>
        <StepDescription>
          The first time you buy a ticket, you'll need to approve the USDT spending for our lottery contract. This is a 
          one-time security step required by the blockchain.
        </StepDescription>
      </StepCard>
      
      <StepCard>
        <StepTitle>
          <StepNumber>3</StepNumber>
          Wait for the Draw
        </StepTitle>
        <StepDescription>
          The lottery draw happens automatically at regular intervals. You can see the countdown timer on the main page.
        </StepDescription>
        <StepDescription>
          All draws are conducted using Chainlink VRF (Verifiable Random Function) to ensure fair and transparent selection of winners.
        </StepDescription>
      </StepCard>
      
      <StepCard>
        <StepTitle>
          <StepNumber>4</StepNumber>
          Check Your Winnings
        </StepTitle>
        <StepDescription>
          After the draw, winning tickets are automatically identified. If you have a winning ticket, the prize amount 
          will be automatically transferred to your wallet.
        </StepDescription>
        <StepDescription>
          You can check your tickets and their status in the "Your Tickets" section.
        </StepDescription>
      </StepCard>
      
      <StepCard>
        <StepTitle>
          <StepNumber>5</StepNumber>
          Prize Distribution
        </StepTitle>
        <StepDescription>
          The lottery distributes prizes based on the number of matched numbers:
        </StepDescription>
        
        <PrizeDistributionChart />
        
        <StepDescription>
          All prizes are paid automatically to the winners' wallets after each draw.
          The more tickets sold, the bigger the prize pool!
        </StepDescription>
      </StepCard>
      
      <ImportantNote>
        <strong>Important:</strong> The prize distribution is designed to reward players at multiple levels:
        <ul>
          <li>6 numbers matched: 40% of the prize pool</li>
          <li>5 numbers matched: 20% of the prize pool</li>
          <li>4 numbers matched: 15% of the prize pool</li>
          <li>3 numbers matched: 10% of the prize pool</li>
          <li>2 numbers matched: 5% of the prize pool</li>
          <li>10% goes to the platform fee</li>
        </ul>
        The more tickets sold, the bigger the jackpot! Good luck!
      </ImportantNote>
    </HowToPlayContainer>
  );
};

export default HowToPlay;