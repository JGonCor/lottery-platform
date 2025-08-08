import React, { useState } from 'react';
import styled from 'styled-components';
import Card from './Card';
import Button from './Button';

const ReferralCard = styled(Card)`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}15, ${({ theme }) => theme.colors.accent.yellow}15);
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
`;

const ReferralTitle = styled.h3`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: 1.3rem;
  
  .icon {
    font-size: 1.5rem;
  }
`;

const ReferralStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const StatItem = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.yellow};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ReferralLink = styled.div`
  background-color: ${({ theme }) => theme.colors.cardBackground};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  margin: ${({ theme }) => theme.spacing.lg} 0;
  position: relative;
`;

const LinkLabel = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-weight: 600;
`;

const LinkText = styled.div`
  font-family: monospace;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text};
  word-break: break-all;
  padding: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
`;

const ActionButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const DiscountInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.accent.yellow}20, transparent);
  border-left: 3px solid ${({ theme }) => theme.colors.accent.yellow};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const DiscountText = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const DiscountDetail = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

interface ShareReferralProps {
  totalReferrals: number;
  currentDiscount: number;
  maxDiscount: number;
  discountPerReferral: number;
}

const ShareReferral: React.FC<ShareReferralProps> = ({
  totalReferrals = 0,
  currentDiscount = 0,
  maxDiscount = 20,
  discountPerReferral = 2
}) => {
  const [copied, setCopied] = useState(false);

  // Mock referral data
  const referralCode = 'LUCKY2024-ABC123';
  const referralLink = `https://lottery-platform.vercel.app/?ref=${referralCode}`;
  const earnings = 45.25; // USDT earned from referrals

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'BSC Lottery Platform',
      text: '¡Únete a la lotería descentralizada más emocionante en BSC! Usa mi código de referido para obtener descuentos.',
      url: referralLink
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback - copy to clipboard
        handleCopyLink();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      handleCopyLink();
    }
  };

  const nextDiscountReferrals = Math.ceil((currentDiscount + discountPerReferral) / discountPerReferral) - Math.floor(currentDiscount / discountPerReferral);
  const referralsNeeded = Math.max(0, nextDiscountReferrals - (totalReferrals % Math.ceil(discountPerReferral)));

  return (
    <ReferralCard>
      <ReferralTitle>
        <span className="icon">🎁</span>
        Sistema de Referidos
      </ReferralTitle>

      <ReferralStats>
        <StatItem>
          <StatValue>{totalReferrals}</StatValue>
          <StatLabel>Referidos</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{currentDiscount}%</StatValue>
          <StatLabel>Descuento</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{earnings.toFixed(2)}</StatValue>
          <StatLabel>USDT Ganados</StatLabel>
        </StatItem>
      </ReferralStats>

      {currentDiscount < maxDiscount && (
        <DiscountInfo>
          <DiscountText>
            💡 ¡Refiere a {referralsNeeded} persona{referralsNeeded !== 1 ? 's' : ''} más para obtener {discountPerReferral}% de descuento adicional!
          </DiscountText>
          <DiscountDetail>
            Descuento máximo: {maxDiscount}% • Actual: {currentDiscount}%
          </DiscountDetail>
        </DiscountInfo>
      )}

      <ReferralLink>
        <LinkLabel>Tu enlace de referido:</LinkLabel>
        <LinkText>{referralLink}</LinkText>
      </ReferralLink>

      <ActionButtons>
        <Button 
          variant="secondary" 
          onClick={handleCopyLink}
          style={{ 
            backgroundColor: copied ? '#4CAF50' : undefined,
            color: copied ? 'white' : undefined
          }}
        >
          {copied ? '✓ ¡Copiado!' : '📋 Copiar'}
        </Button>
        <Button 
          variant="primary" 
          onClick={handleShare}
        >
          📤 Compartir
        </Button>
      </ActionButtons>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(33, 150, 243, 0.2)',
        textAlign: 'center',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>🎯 Cómo funciona:</strong>
        </div>
        <div style={{ opacity: 0.8 }}>
          • Comparte tu enlace • Tus referidos obtienen descuentos • Tú ganas comisiones y descuentos adicionales
        </div>
      </div>
    </ReferralCard>
  );
};

export default ShareReferral;