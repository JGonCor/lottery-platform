import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import useWeb3 from '../../hooks/useWeb3';

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
`;

const ModalContent = styled(motion.div)`
  background: ${({ theme }) => 
    theme.mode === 'dark' 
      ? 'linear-gradient(135deg, #1a1a2e, #16213e)' 
      : 'linear-gradient(135deg, #ffffff, #f8f9ff)'
  };
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.colors.primary}20;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.7;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
`;

const ModalTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  &::before {
    content: '🔗';
    font-size: 2rem;
  }
`;

const ConnectionStatus = styled.div<{ status: 'connecting' | 'error' | 'success' | 'networkError' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  font-weight: 500;
  
  ${({ status }) => {
    switch (status) {
      case 'connecting':
        return `
          background: #3b82f615;
          color: #2563eb;
          border: 1px solid #2563eb30;
        `;
      case 'error':
        return `
          background: #ef444415;
          color: #dc2626;
          border: 1px solid #dc262630;
        `;
      case 'success':
        return `
          background: #10b98115;
          color: #059669;
          border: 1px solid #05966930;
        `;
      case 'networkError':
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

const WalletOption = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.primary}20;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
  };
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}50;
    background: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
    };
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const WalletIcon = styled.div`
  width: 48px;
  height: 48px;
  margin-right: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: ${({ theme }) => theme.colors.primary}10;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const WalletInfo = styled.div`
  flex: 1;
`;

const WalletName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const WalletDescription = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.7;
`;

const WalletStatus = styled.div<{ installed?: boolean }>`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${({ installed }) => installed 
    ? `
        background: #10b98115;
        color: #059669;
        border: 1px solid #05966930;
      `
    : `
        background: #f59e0b15;
        color: #d97706;
        border: 1px solid #d9770630;
      `
  }
`;

const NetworkSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.primary}20;
`;

const NetworkTitle = styled.h3`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  
  &::before {
    content: '🌐';
    font-size: 1.3rem;
  }
`;

const NetworkInfo = styled.div`
  background: ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
  };
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const NetworkRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const NetworkLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const NetworkValue = styled.span<{ isCorrect?: boolean }>`
  font-weight: 600;
  color: ${({ isCorrect, theme }) => 
    isCorrect ? '#059669' : '#d97706'
  };
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const RetryInfo = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.md};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.7;
`;

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({ isOpen, onClose }) => {
  const {
    active,
    loading,
    isConnecting,
    error,
    networkError,
    connectionAttempts,
    connectWallet,
    switchToCorrectNetwork,
    networkInfo,
    targetNetwork,
    maxRetries
  } = useWeb3();

  const [showNetworkSection, setShowNetworkSection] = useState(false);

  useEffect(() => {
    if (active && !networkError) {
      // Close modal if successfully connected
      setTimeout(onClose, 1500);
    }
  }, [active, networkError, onClose]);

  useEffect(() => {
    if (active || networkError) {
      setShowNetworkSection(true);
    }
  }, [active, networkError]);

  const walletOptions = [
    {
      name: 'MetaMask',
      description: 'Conectar usando MetaMask',
      icon: '🦊',
      installed: !!window.ethereum?.isMetaMask,
      onClick: () => connectWallet()
    },
    {
      name: 'WalletConnect',
      description: 'Escanear con tu billetera móvil',
      icon: '📱',
      installed: false, // WalletConnect no implementado aún
      onClick: () => alert('WalletConnect será implementado pronto')
    }
  ];

  const getConnectionStatus = () => {
    if (isConnecting || loading) return 'connecting';
    if (error) return 'error';
    if (networkError) return 'networkError';
    if (active && !networkError) return 'success';
    return null;
  };

  const getStatusMessage = () => {
    if (isConnecting || loading) {
      return '🔄 Conectando billetera...';
    }
    if (error) {
      return `❌ ${error.message}`;
    }
    if (networkError) {
      return `⚠️ ${networkError}`;
    }
    if (active && !networkError) {
      return '✅ ¡Billetera conectada exitosamente!';
    }
    return null;
  };

  const handleRetry = () => {
    connectWallet();
  };

  const handleNetworkSwitch = async () => {
    try {
      await switchToCorrectNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <ModalContent
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <CloseButton onClick={onClose}>×</CloseButton>
        
        <ModalTitle>Conectar Billetera</ModalTitle>

        <AnimatePresence>
          {getConnectionStatus() && (
            <ConnectionStatus
              status={getConnectionStatus()!}
              as={motion.div}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {getStatusMessage()}
              {(isConnecting || loading) && (
                <div style={{ marginTop: '8px' }}>
                  <LoadingSpinner size="small" />
                </div>
              )}
            </ConnectionStatus>
          )}
        </AnimatePresence>

        {!active && (
          <div>
            {walletOptions.map((wallet) => (
              <WalletOption
                key={wallet.name}
                onClick={wallet.installed ? wallet.onClick : undefined}
                whileHover={{ scale: wallet.installed ? 1.02 : 1 }}
                whileTap={{ scale: wallet.installed ? 0.98 : 1 }}
                style={{ 
                  opacity: wallet.installed ? 1 : 0.6,
                  cursor: wallet.installed ? 'pointer' : 'not-allowed'
                }}
              >
                <WalletIcon>{wallet.icon}</WalletIcon>
                <WalletInfo>
                  <WalletName>{wallet.name}</WalletName>
                  <WalletDescription>{wallet.description}</WalletDescription>
                </WalletInfo>
                <WalletStatus installed={wallet.installed}>
                  {wallet.installed ? 'Instalado' : 'No Instalado'}
                </WalletStatus>
              </WalletOption>
            ))}

            {error && connectionAttempts > 0 && (
              <ActionButtons>
                <Button 
                  onClick={handleRetry} 
                  variant="primary" 
                  disabled={isConnecting}
                  style={{ flex: 1 }}
                >
                  {isConnecting ? 'Reintentando...' : 'Reintentar'}
                </Button>
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </Button>
              </ActionButtons>
            )}

            {connectionAttempts > 0 && connectionAttempts < maxRetries && (
              <RetryInfo>
                Intento {connectionAttempts} de {maxRetries}
              </RetryInfo>
            )}
          </div>
        )}

        <AnimatePresence>
          {showNetworkSection && (
            <NetworkSection
              as={motion.div}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <NetworkTitle>Información de Red</NetworkTitle>
              <NetworkInfo>
                <NetworkRow>
                  <NetworkLabel>Red Actual:</NetworkLabel>
                  <NetworkValue isCorrect={networkInfo.isCorrectNetwork}>
                    {networkInfo.currentNetwork}
                  </NetworkValue>
                </NetworkRow>
                <NetworkRow>
                  <NetworkLabel>Red Requerida:</NetworkLabel>
                  <NetworkValue isCorrect={true}>
                    {networkInfo.targetNetwork}
                  </NetworkValue>
                </NetworkRow>
                <NetworkRow>
                  <NetworkLabel>Estado:</NetworkLabel>
                  <NetworkValue isCorrect={networkInfo.isCorrectNetwork}>
                    {networkInfo.isCorrectNetwork ? 'Correcta' : 'Incorrecta'}
                  </NetworkValue>
                </NetworkRow>
              </NetworkInfo>

              {!networkInfo.isCorrectNetwork && (
                <ActionButtons>
                  <Button 
                    onClick={handleNetworkSwitch}
                    variant="primary"
                    style={{ flex: 1 }}
                  >
                    Cambiar a {targetNetwork.chainName}
                  </Button>
                </ActionButtons>
              )}
            </NetworkSection>
          )}
        </AnimatePresence>
      </ModalContent>
    </ModalOverlay>
  );
};

export default WalletConnectionModal;