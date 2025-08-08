import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { useUSDTBalance, PaymentValidation } from '../../hooks/useUSDTBalance';
import { useWeb3React } from '@web3-react/core';

const BalanceCard = styled(motion.div)`
  background: linear-gradient(135deg, 
    ${({ theme }) => theme.colors.primary}08, 
    ${({ theme }) => theme.colors.secondary}05
  );
  border: 2px solid ${({ theme }) => theme.colors.primary}20;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  position: relative;
  overflow: hidden;
`;

const GlowEffect = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, ${({ theme }) => theme.colors.primary}10 0%, transparent 70%);
  pointer-events: none;
  animation: glow-pulse 4s ease-in-out infinite;
  
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.05); }
  }
`;

const BalanceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  position: relative;
  z-index: 1;
`;

const BalanceTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  &::before {
    content: '💰';
    font-size: 1.4rem;
  }
`;

const RefreshButton = styled(Button)`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  font-size: 0.8rem;
  min-width: auto;
`;

const BalanceAmount = styled.div`
  position: relative;
  z-index: 1;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Amount = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 1;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Currency = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  opacity: 0.8;
`;

const LastUpdated = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StatusIndicator = styled.div<{ status: 'loading' | 'success' | 'error' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  position: relative;
  z-index: 1;
  
  ${({ status }) => {
    switch (status) {
      case 'loading':
        return `
          background: #3b82f615;
          color: #2563eb;
          border: 1px solid #2563eb30;
        `;
      case 'success':
        return `
          background: #10b98115;
          color: #059669;
          border: 1px solid #05966930;
        `;
      case 'error':
        return `
          background: #ef444415;
          color: #dc2626;
          border: 1px solid #dc262630;
        `;
      case 'warning':
        return `
          background: #f59e0b15;
          color: #d97706;
          border: 1px solid #d9770630;
        `;
      default:
        return '';
    }
  }}
`;

const ValidationSection = styled(motion.div)`
  position: relative;
  z-index: 1;
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.primary}20;
`;

const ValidationTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1rem;
  font-weight: 600;
`;

const ValidationResult = styled.div<{ isValid: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  ${({ isValid }) => isValid
    ? `
        background: #10b98115;
        color: #059669;
        border: 1px solid #05966930;
      `
    : `
        background: #ef444415;
        color: #dc2626;
        border: 1px solid #dc262630;
      `
  }
`;

const ValidationDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
  font-size: 0.9rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ValidationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs};
  background: rgba(0, 0, 0, 0.05);
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

const ErrorList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const ErrorItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: 0.85rem;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &::before {
    content: '⚠️';
    font-size: 0.9rem;
  }
`;

const TransactionSection = styled.div`
  position: relative;
  z-index: 1;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const TransactionList = styled.div`
  max-height: 200px;
  overflow-y: auto;
`;

const TransactionItem = styled(motion.div)<{ status: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 0.85rem;
  
  ${({ status, theme }) => {
    switch (status) {
      case 'pending':
        return `background: #3b82f615; border-left: 3px solid #2563eb;`;
      case 'confirming':
        return `background: #f59e0b15; border-left: 3px solid #d97706;`;
      case 'confirmed':
        return `background: #10b98115; border-left: 3px solid #059669;`;
      case 'failed':
        return `background: #ef444415; border-left: 3px solid #dc2626;`;
      default:
        return `background: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};`;
    }
  }}
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
  position: relative;
  z-index: 1;
`;

interface USDTBalanceCardProps {
  showValidation?: boolean;
  validationAmount?: string;
  spenderAddress?: string;
  onValidationChange?: (validation: PaymentValidation) => void;
  compact?: boolean;
}

const USDTBalanceCard: React.FC<USDTBalanceCardProps> = ({
  showValidation = false,
  validationAmount,
  spenderAddress,
  onValidationChange,
  compact = false
}) => {
  const { active } = useWeb3React();
  const {
    balance,
    isRefreshing,
    refreshBalance,
    validatePayment,
    transactions,
    formatUSDTAmount
  } = useUSDTBalance();

  const [validation, setValidation] = useState<PaymentValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate payment when amount or spender changes
  useEffect(() => {
    if (!showValidation || !validationAmount || !active) {
      setValidation(null);
      return;
    }

    const performValidation = async () => {
      setIsValidating(true);
      try {
        const result = await validatePayment(validationAmount, spenderAddress);
        setValidation(result);
        onValidationChange?.(result);
      } catch (error) {
        console.error('Validation error:', error);
        setValidation({
          isValid: false,
          hasEnoughBalance: false,
          hasEnoughAllowance: false,
          requiredAmount: validationAmount || '0',
          availableBalance: balance.balance,
          currentAllowance: '0',
          errors: ['Validation failed']
        });
      } finally {
        setIsValidating(false);
      }
    };

    performValidation();
  }, [validationAmount, spenderAddress, active, validatePayment, onValidationChange, balance.balance, showValidation]);

  const getBalanceStatus = () => {
    if (balance.isLoading || isRefreshing) return 'loading';
    if (balance.error) return 'error';
    if (parseFloat(balance.balanceFormatted) === 0) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    const status = getBalanceStatus();
    switch (status) {
      case 'loading':
        return 'Cargando...';
      case 'error':
        return 'Error al cargar';
      case 'warning':
        return 'Sin saldo';
      case 'success':
        return 'Balance actualizado';
      default:
        return '';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  const pendingTransactions = Array.from(transactions.entries())
    .filter(([_, tx]) => ['pending', 'confirming'].includes(tx.status))
    .slice(0, 3); // Show only last 3 pending transactions

  if (!active) {
    return (
      <BalanceCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlowEffect />
        <BalanceHeader>
          <BalanceTitle>Balance USDT</BalanceTitle>
        </BalanceHeader>
        <LoadingState>
          <div style={{ textAlign: 'center', opacity: 0.7 }}>
            Conecta tu billetera para ver tu balance de USDT
          </div>
        </LoadingState>
      </BalanceCard>
    );
  }

  return (
    <BalanceCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlowEffect />
      
      <BalanceHeader>
        <BalanceTitle>Balance USDT</BalanceTitle>
        <RefreshButton
          variant="outline"
          size="small"
          onClick={refreshBalance}
          disabled={balance.isLoading || isRefreshing}
        >
          {isRefreshing ? '🔄' : '↻'}
        </RefreshButton>
      </BalanceHeader>

      <StatusIndicator status={getBalanceStatus()}>
        {getStatusText()}
      </StatusIndicator>

      {balance.isLoading ? (
        <LoadingState>
          <LoadingSpinner size="small" />
        </LoadingState>
      ) : (
        <BalanceAmount>
          <Amount>
            {balance.balanceFormatted}
            <Currency>USDT</Currency>
          </Amount>
          {balance.lastUpdated > 0 && (
            <LastUpdated>
              🕒 Actualizado {formatTime(balance.lastUpdated)}
            </LastUpdated>
          )}
          {balance.error && (
            <div style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '8px' }}>
              ⚠️ {balance.error}
            </div>
          )}
        </BalanceAmount>
      )}

      {/* Payment Validation Section */}
      <AnimatePresence>
        {showValidation && validationAmount && (
          <ValidationSection
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ValidationTitle>Validación de Pago</ValidationTitle>
            
            {isValidating ? (
              <ValidationResult isValid={false}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LoadingSpinner size="small" />
                  Validando pago...
                </div>
              </ValidationResult>
            ) : validation ? (
              <>
                <ValidationResult isValid={validation.isValid}>
                  {validation.isValid ? '✅ Pago válido' : '❌ Pago inválido'}
                </ValidationResult>
                
                <ValidationDetails>
                  <ValidationItem>
                    <span>Monto requerido:</span>
                    <strong>{formatUSDTAmount(validation.requiredAmount)} USDT</strong>
                  </ValidationItem>
                  <ValidationItem>
                    <span>Balance disponible:</span>
                    <strong>{formatUSDTAmount(validation.availableBalance)} USDT</strong>
                  </ValidationItem>
                  {spenderAddress && (
                    <ValidationItem>
                      <span>Allowance actual:</span>
                      <strong>{formatUSDTAmount(validation.currentAllowance)} USDT</strong>
                    </ValidationItem>
                  )}
                </ValidationDetails>
                
                {validation.errors.length > 0 && (
                  <ErrorList>
                    {validation.errors.map((error, index) => (
                      <ErrorItem key={index}>{error}</ErrorItem>
                    ))}
                  </ErrorList>
                )}
              </>
            ) : null}
          </ValidationSection>
        )}
      </AnimatePresence>

      {/* Recent Transactions */}
      {!compact && pendingTransactions.length > 0 && (
        <TransactionSection>
          <ValidationTitle>Transacciones Pendientes</ValidationTitle>
          <TransactionList>
            {pendingTransactions.map(([hash, tx]) => (
              <TransactionItem
                key={hash}
                status={tx.status}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {tx.status === 'pending' ? '⏳ Pendiente' : 
                     tx.status === 'confirming' ? `⏳ Confirmando (${tx.confirmations}/3)` : 
                     'Procesando'}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                    {hash.slice(0, 10)}...{hash.slice(-8)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {tx.status === 'confirming' && (
                    <div style={{ fontSize: '0.75rem' }}>
                      {tx.confirmations}/3 confirmaciones
                    </div>
                  )}
                </div>
              </TransactionItem>
            ))}
          </TransactionList>
        </TransactionSection>
      )}
    </BalanceCard>
  );
};

export default USDTBalanceCard;