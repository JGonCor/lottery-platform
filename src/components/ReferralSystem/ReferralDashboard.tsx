import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Card from '../UI/Card';
import Button from '../UI/Button';
import useWeb3 from '../../hooks/useWeb3';

const ReferralContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const DashboardTitle = styled.h1`
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  font-size: 2.5rem;
  font-weight: 700;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}15, transparent);
  border: 2px solid ${({ theme }) => theme.colors.primary}20;
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
`;

const ReferralLinkCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const LinkInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.cardBackground};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ReferralDashboard: React.FC = () => {
  const { active, account } = useWeb3();
  const [linkCopied, setLinkCopied] = useState(false);

  // Mock data para demostración
  const mockStats = {
    totalReferrals: 5,
    totalEarnings: '125.50',
    pendingRewards: '25.00',
    currentDiscount: '25%'
  };

  const referralLink = active && account 
    ? `https://lottery.bsc/ref/${account.slice(0, 8)}`
    : 'Conecta tu wallet para generar tu enlace';

  const copyToClipboard = async () => {
    if (!active) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  if (!active) {
    return (
      <ReferralContainer>
        <DashboardTitle>👥 Sistema de Referencias</DashboardTitle>
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔗</div>
          <h3>Conecta tu Wallet</h3>
          <p style={{ color: '#666', marginTop: '1rem' }}>
            Necesitas conectar tu wallet para acceder al sistema de referencias
          </p>
        </div>
      </ReferralContainer>
    );
  }

  return (
    <ReferralContainer>
      <DashboardTitle>👥 Dashboard de Referencias</DashboardTitle>
      
      <StatsGrid>
        <StatCard>
          <StatValue>{mockStats.totalReferrals}</StatValue>
          <StatLabel>Referencias Totales</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{mockStats.totalEarnings}</StatValue>
          <StatLabel>USDT Ganados</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{mockStats.pendingRewards}</StatValue>
          <StatLabel>Recompensas Pendientes</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>{mockStats.currentDiscount}</StatValue>
          <StatLabel>Descuento Actual</StatLabel>
        </StatCard>
      </StatsGrid>

      <ReferralLinkCard>
        <h3 style={{ marginBottom: '1rem', color: '#0FF000' }}>
          🔗 Tu Enlace de Referencia
        </h3>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Comparte este enlace y gana recompensas por cada usuario que se registre
        </p>
        
        <LinkInput 
          value={referralLink}
          readOnly 
        />
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Button 
            onClick={copyToClipboard}
            disabled={!active}
            style={{ background: linkCopied ? '#28a745' : undefined }}
          >
            {linkCopied ? '✅ Copiado!' : '📋 Copiar Enlace'}
          </Button>
          
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            💡 Gana 5% de comisión por cada compra de tus referidos
          </span>
        </div>
      </ReferralLinkCard>

      <Card style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#0FF000' }}>
          📊 Cómo Funciona
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>1️⃣</div>
            <h4>Comparte tu enlace</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Invita amigos usando tu enlace único
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>2️⃣</div>
            <h4>Ellos participan</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Tus referidos compran tickets de lotería
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>3️⃣</div>
            <h4>Tú ganas</h4>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Recibes comisiones y descuentos
            </p>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: '#fff3cd', 
          borderRadius: '8px',
          border: '1px solid #ffeeba'
        }}>
          <strong style={{ color: '#856404' }}>💰 Beneficios del Sistema:</strong>
          <ul style={{ marginTop: '0.5rem', color: '#856404' }}>
            <li>5% de comisión por cada compra de tickets</li>
            <li>Descuentos progresivos en tus propias compras</li>
            <li>Sin límite de referencias</li>
            <li>Pagos automáticos en USDT</li>
          </ul>
        </div>
      </Card>
    </ReferralContainer>
  );
};

export default ReferralDashboard;