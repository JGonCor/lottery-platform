import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import Button from '../UI/Button';
import NumberSelector from './NumberSelector';
import useWeb3 from '../../hooks/useWeb3';
import { walletValidationService, WalletValidationResult, TransactionValidation } from '../../services/walletValidationService';
import { referralService } from '../../services/referralService';
import { ticketValidationService, TicketStorage } from '../../services/ticketValidationService';
import { toast } from 'react-toastify';

const BuyTicketContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const BuyTicketCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CardTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const ValidationSection = styled.div<{ status: 'success' | 'warning' | 'error' | 'info' }>`
  padding: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.md} 0;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme, status }) => {
    switch (status) {
      case 'success': return 'rgba(76, 175, 80, 0.1)';
      case 'warning': return 'rgba(255, 193, 7, 0.1)';
      case 'error': return 'rgba(255, 82, 82, 0.1)';
      default: return 'rgba(33, 150, 243, 0.1)';
    }
  }};
  border: 1px solid ${({ theme, status }) => {
    switch (status) {
      case 'success': return 'rgba(76, 175, 80, 0.3)';
      case 'warning': return 'rgba(255, 193, 7, 0.3)';
      case 'error': return 'rgba(255, 82, 82, 0.3)';
      default: return 'rgba(33, 150, 243, 0.3)';
    }
  }};
`;

const ValidationTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text};
`;

const ValidationList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing.md};
  
  li {
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    font-size: 0.9rem;
  }
`;

const TicketCountSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  justify-content: center;
`;

const TicketCountButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1.2rem;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TicketCountDisplay = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
`;

const PriceBreakdown = styled.div`
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  
  &:last-child {
    margin-bottom: 0;
    padding-top: ${({ theme }) => theme.spacing.sm};
    border-top: 1px solid ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    };
    font-weight: bold;
  }
`;

const ReferralInfo = styled.div`
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)'
  };
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.md} 0;
  font-size: 0.9rem;
`;

const NumbersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const TicketNumbers = styled.div`
  border: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const TicketTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
`;

interface EnhancedBuyTicketProps {
  onTicketPurchased?: (ticketId: string) => void;
}

const EnhancedBuyTicket: React.FC<EnhancedBuyTicketProps> = ({ onTicketPurchased }) => {
  const { account, active } = useWeb3();
  
  // State management
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedNumbers, setSelectedNumbers] = useState<number[][]>([]);
  const [walletValidation, setWalletValidation] = useState<WalletValidationResult | null>(null);
  const [transactionValidation, setTransactionValidation] = useState<TransactionValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [referralDiscount, setReferralDiscount] = useState({
    discountPercent: 0,
    discountAmount: 0,
    referralCount: 0
  });

  // Initialize number arrays when ticket count changes
  useEffect(() => {
    const newNumbers = Array(ticketCount).fill(null).map((_, index) => 
      selectedNumbers[index] || []
    );
    setSelectedNumbers(newNumbers);
  }, [ticketCount]);

  // Validate wallet when account changes
  useEffect(() => {
    if (active && account) {
      validateWallet();
      processReferralIfNeeded();
    }
  }, [active, account]);

  // Validate transaction when numbers or count changes
  useEffect(() => {
    if (walletValidation?.isValid && account) {
      validatePurchaseTransaction();
    }
  }, [selectedNumbers, ticketCount, walletValidation, account]);

  // Wallet validation
  const validateWallet = useCallback(async () => {
    if (!active || !account) return;

    setIsValidating(true);
    try {
      const validation = await walletValidationService.validateWalletConnection();
      setWalletValidation(validation);

      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
      }
    } catch (error) {
      console.error('Wallet validation failed:', error);
      toast.error('Error validating wallet connection');
    } finally {
      setIsValidating(false);
    }
  }, [active, account]);

  // Process referral if user came with referral code
  const processReferralIfNeeded = useCallback(async () => {
    if (!account) return;

    try {
      const referrerAddress = referralService.processReferralVisit(account);
      if (referrerAddress) {
        toast.info(`¡Referido detectado! Obtendrás descuentos cuando compres tickets.`);
      }
    } catch (error) {
      console.error('Error processing referral:', error);
    }
  }, [account]);

  // Transaction validation
  const validatePurchaseTransaction = useCallback(async () => {
    if (!account || !walletValidation?.isValid) return;

    try {
      const ticketPrice = 5; // USDT per ticket
      const totalAmount = (ticketPrice * ticketCount).toString();
      const contractAddress = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';

      const validation = await walletValidationService.validateTransaction(
        contractAddress,
        totalAmount,
        ticketCount
      );

      setTransactionValidation(validation);

      // Calculate referral discount
      if (account) {
        const discount = referralService.calculateReferralDiscount(account, ticketCount);
        setReferralDiscount(discount);
      }
    } catch (error) {
      console.error('Transaction validation failed:', error);
    }
  }, [account, walletValidation, ticketCount]);

  // Handle number selection
  const handleNumbersSelected = useCallback((ticketIndex: number, numbers: number[]) => {
    setSelectedNumbers(prev => {
      const newNumbers = [...prev];
      newNumbers[ticketIndex] = numbers;
      return newNumbers;
    });
  }, []);

  // Handle ticket count change
  const changeTicketCount = useCallback((delta: number) => {
    setTicketCount(prev => Math.max(1, Math.min(10, prev + delta)));
  }, []);

  // Switch to BSC network
  const handleNetworkSwitch = useCallback(async () => {
    try {
      const success = await walletValidationService.switchToBSCNetwork(true); // testnet
      if (success) {
        toast.success('Switched to BSC network successfully');
        setTimeout(validateWallet, 1000);
      }
    } catch (error) {
      toast.error('Failed to switch network');
    }
  }, [validateWallet]);

  // Purchase tickets
  const handlePurchase = useCallback(async () => {
    if (!account || !walletValidation?.isValid || !transactionValidation?.canProceed) {
      toast.error('Cannot proceed with purchase. Please check validations.');
      return;
    }

    // Validate all tickets have complete numbers
    const incompleteTickets = selectedNumbers.findIndex(numbers => numbers.length !== 6);
    if (incompleteTickets !== -1) {
      toast.error(`Ticket ${incompleteTickets + 1} needs 6 numbers selected`);
      return;
    }

    setIsPurchasing(true);
    try {
      // Validate each ticket's numbers
      for (let i = 0; i < selectedNumbers.length; i++) {
        const validation = ticketValidationService.validateTicketNumbers(selectedNumbers[i]);
        if (!validation.isValid) {
          toast.error(`Ticket ${i + 1}: ${validation.errors.join(', ')}`);
          setIsPurchasing(false);
          return;
        }
      }

      // Store tickets locally (this would normally call the smart contract)
      const purchasePromises = selectedNumbers.map((numbers, index) => {
        const ticketData: TicketStorage = {
          ticketId: ticketValidationService.generateTicketId(account, numbers, Date.now() + index),
          ownerAddress: account,
          numbers: numbers.sort((a, b) => a - b), // Store sorted for consistency
          purchaseTimestamp: Date.now(),
          drawId: 0, // Would get from contract
          transactionHash: '', // Would get from transaction
          pricepaid: (5 - (5 * referralDiscount.discountPercent / 100)).toFixed(6),
          discountApplied: referralDiscount.discountPercent,
          referrerAddress: referralService.getReferralData(account)?.referrerAddress
        };

        return ticketValidationService.storeTicket(ticketData);
      });

      const results = await Promise.all(purchasePromises);
      const successCount = results.filter(r => r).length;

      if (successCount === selectedNumbers.length) {
        // Validate referral purchase
        if (referralService.getReferralData(account)) {
          referralService.validateReferralPurchase(account, ticketCount * 5);
        }

        toast.success(`Successfully purchased ${successCount} ticket(s)!`);
        
        // Reset form
        setSelectedNumbers([]);
        setTicketCount(1);
        
        // Call callback if provided
        if (onTicketPurchased) {
          onTicketPurchased(`batch_${Date.now()}`);
        }
      } else {
        toast.error(`Only ${successCount} of ${selectedNumbers.length} tickets were purchased successfully`);
      }

    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error('Failed to purchase tickets. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [account, walletValidation, transactionValidation, selectedNumbers, referralDiscount, ticketCount, onTicketPurchased]);

  // Calculate total price
  const ticketPrice = 5; // USDT per ticket
  const subtotal = ticketPrice * ticketCount;
  const discountAmount = subtotal * (referralDiscount.discountPercent / 100);
  const totalPrice = subtotal - discountAmount;

  if (!active || !account) {
    return (
      <BuyTicketContainer>
        <BuyTicketCard>
          <CardTitle>Comprar Tickets de Lotería</CardTitle>
          <ValidationSection status="info">
            <ValidationTitle>Conecta tu billetera</ValidationTitle>
            <p>Para comprar tickets, necesitas conectar tu billetera primero.</p>
          </ValidationSection>
        </BuyTicketCard>
      </BuyTicketContainer>
    );
  }

  return (
    <BuyTicketContainer>
      <BuyTicketCard>
        <CardTitle>Comprar Tickets de Lotería</CardTitle>

        {/* Wallet Validation */}
        {isValidating && (
          <ValidationSection status="info">
            <ValidationTitle>Validando billetera...</ValidationTitle>
            <p>Verificando conexión, red y saldos...</p>
          </ValidationSection>
        )}

        {walletValidation && !walletValidation.isValid && (
          <ValidationSection status="error">
            <ValidationTitle>Problemas de validación</ValidationTitle>
            <ValidationList>
              {walletValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ValidationList>
            {walletValidation.errors.some(e => e.includes('network')) && (
              <Button onClick={handleNetworkSwitch} style={{ marginTop: '16px' }}>
                Cambiar a BSC Testnet
              </Button>
            )}
          </ValidationSection>
        )}

        {walletValidation && walletValidation.warnings.length > 0 && (
          <ValidationSection status="warning">
            <ValidationTitle>Advertencias</ValidationTitle>
            <ValidationList>
              {walletValidation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ValidationList>
          </ValidationSection>
        )}

        {/* Wallet Info */}
        {walletValidation?.isValid && (
          <ValidationSection status="success">
            <ValidationTitle>Billetera conectada</ValidationTitle>
            <p>
              <strong>Dirección:</strong> {walletValidation.walletInfo.address.slice(0, 6)}...{walletValidation.walletInfo.address.slice(-4)}<br />
              <strong>Red:</strong> {walletValidation.walletInfo.network}<br />
              <strong>Saldo USDT:</strong> {parseFloat(walletValidation.usdtInfo.balance).toFixed(2)} USDT<br />
              <strong>Saldo BNB:</strong> {parseFloat(walletValidation.walletInfo.balance).toFixed(4)} BNB
            </p>
          </ValidationSection>
        )}

        {/* Referral Info */}
        {referralDiscount.referralCount > 0 && (
          <ReferralInfo>
            <strong>🎉 Descuento por referidos activo!</strong><br />
            Referencias válidas: {referralDiscount.referralCount}<br />
            Descuento aplicado: {referralDiscount.discountPercent}%<br />
            Ahorro en esta compra: {referralDiscount.discountAmount.toFixed(2)} USDT
          </ReferralInfo>
        )}

        {/* Ticket Count Selector */}
        <TicketCountSelector>
          <TicketCountButton 
            onClick={() => changeTicketCount(-1)}
            disabled={ticketCount <= 1}
          >
            -
          </TicketCountButton>
          <TicketCountDisplay>{ticketCount} ticket{ticketCount > 1 ? 's' : ''}</TicketCountDisplay>
          <TicketCountButton 
            onClick={() => changeTicketCount(1)}
            disabled={ticketCount >= 10}
          >
            +
          </TicketCountButton>
        </TicketCountSelector>

        {/* Number Selectors */}
        <NumbersGrid>
          {Array(ticketCount).fill(null).map((_, index) => (
            <TicketNumbers key={index}>
              <TicketTitle>Ticket {index + 1}</TicketTitle>
              <NumberSelector
                onNumbersSelected={(numbers) => handleNumbersSelected(index, numbers)}
                selectedNumbers={selectedNumbers[index] || []}
                disabled={isPurchasing}
              />
            </TicketNumbers>
          ))}
        </NumbersGrid>

        {/* Price Breakdown */}
        <PriceBreakdown>
          <PriceRow>
            <span>Subtotal ({ticketCount} × {ticketPrice} USDT):</span>
            <span>{subtotal.toFixed(2)} USDT</span>
          </PriceRow>
          {referralDiscount.discountPercent > 0 && (
            <PriceRow>
              <span>Descuento ({referralDiscount.discountPercent}%):</span>
              <span>-{discountAmount.toFixed(2)} USDT</span>
            </PriceRow>
          )}
          <PriceRow>
            <span>Total a pagar:</span>
            <span>{totalPrice.toFixed(2)} USDT</span>
          </PriceRow>
        </PriceBreakdown>

        {/* Transaction Validation */}
        {transactionValidation && !transactionValidation.canProceed && (
          <ValidationSection status="error">
            <ValidationTitle>No se puede proceder con la compra</ValidationTitle>
            <ValidationList>
              {transactionValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ValidationList>
          </ValidationSection>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={
            !walletValidation?.isValid ||
            !transactionValidation?.canProceed ||
            selectedNumbers.some(numbers => numbers.length !== 6) ||
            isPurchasing
          }
          variant="primary"
          style={{ width: '100%', marginTop: '16px' }}
        >
          {isPurchasing 
            ? 'Comprando...' 
            : `Comprar ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''} por ${totalPrice.toFixed(2)} USDT`
          }
        </Button>

        {/* Refresh Button */}
        <Button
          onClick={validateWallet}
          variant="outline"
          style={{ width: '100%', marginTop: '8px' }}
          disabled={isValidating}
        >
          {isValidating ? 'Validando...' : 'Actualizar Validación'}
        </Button>
      </BuyTicketCard>
    </BuyTicketContainer>
  );
};

export default EnhancedBuyTicket;