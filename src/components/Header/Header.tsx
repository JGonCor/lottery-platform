import React, { useState } from 'react';
import styled from 'styled-components';

// Safe motion import with fallback
let motion: any, AnimatePresence: any;
try {
  const framerMotion = require('framer-motion');
  motion = framerMotion.motion;
  AnimatePresence = framerMotion.AnimatePresence;
} catch (error) {
  // Fallback to regular HTML elements if framer-motion fails
  motion = {
    div: 'div',
    button: 'button',
    header: 'header'
  };
  AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
}
import { Link, useLocation } from 'react-router-dom';
import Button from '../UI/Button';
import WalletConnectionModal from '../UI/WalletConnectionModal';
import useWeb3 from '../../hooks/useWeb3';
import { formatAddress } from '../../utils/web3';
import { ThemeMode } from '../../theme/theme';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.background};
  box-shadow: 0 2px 10px ${({ theme }) => theme.colors.shadow};
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Logo = styled(motion.div)`
  display: flex;
  align-items: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`;

const LogoIcon = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  margin-right: ${({ theme }) => theme.spacing.sm};
  font-size: 2rem;
`;

const NavContainer = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-right: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)<{ active?: boolean }>`
  color: ${({ theme, active }) => active ? theme.colors.primary : theme.colors.text};
  font-weight: ${({ active }) => active ? '600' : '400'};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: ${({ theme }) => theme.transition};
  text-decoration: none;

  &:hover {
    background-color: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
    };
  }
`;

const AccountInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
`;

const AccountAddress = styled.span`
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NetworkBadge = styled.div<{ isCorrectNetwork: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background-color: ${({ theme, isCorrectNetwork }) => 
    isCorrectNetwork ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'
  };
  color: ${({ theme, isCorrectNetwork }) => 
    isCorrectNetwork ? theme.colors.primary : '#ff0000'
  };
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 0.8rem;
  font-weight: 500;
`;

const NetworkDot = styled.div<{ isCorrectNetwork: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ isCorrectNetwork }) => 
    isCorrectNetwork ? '#00ff00' : '#ff0000'
  };
`;

const ThemeToggle = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  padding: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ theme }) => theme.transition};
  
  &:hover {
    background-color: ${({ theme }) => 
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
    };
    border-radius: ${({ theme }) => theme.borderRadius.circle};
  }
`;

interface HeaderProps {
  toggleTheme: () => void;
  currentTheme?: ThemeMode;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, currentTheme = 'light' }) => {
  const {
    account,
    active,
    loading,
    isConnecting,
    error,
    networkError,
    connectWallet,
    disconnectWallet,
    switchToCorrectNetwork,
    networkInfo
  } = useWeb3();
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const location = useLocation();

  // Handle wallet connection
  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  // Handle network switch
  const handleSwitchNetwork = async () => {
    try {
      await switchToCorrectNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };
  
  // Handle wallet disconnect
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      // The useWeb3 hook will handle cleanup
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <HeaderContainer>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Logo
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LogoIcon>🎯</LogoIcon>
          <span>Lottery</span>
        </Logo>
      </Link>

      <NavContainer>
        <NavLinks>
          <NavLink to="/" active={location.pathname === '/'}>
            Inicio
          </NavLink>
          <NavLink to="/how-to-play" active={location.pathname === '/how-to-play'}>
            Cómo Jugar
          </NavLink>
          <NavLink to="/winners" active={location.pathname === '/winners'}>
            Ganadores
          </NavLink>
          <NavLink to="/faq" active={location.pathname === '/faq'}>
            FAQ
          </NavLink>

        </NavLinks>
        <ThemeToggle onClick={toggleTheme} whileTap={{ scale: 0.9 }}>
          {currentTheme === 'dark' ? '☀️' : '🌙'}
        </ThemeToggle>

        {active && account ? (
          <>
            <NetworkBadge isCorrectNetwork={networkInfo.isCorrectNetwork}>
              <NetworkDot isCorrectNetwork={networkInfo.isCorrectNetwork} />
              {networkInfo.isCorrectNetwork ? (
                networkInfo.currentNetwork
              ) : (
                <span onClick={handleSwitchNetwork} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                  Red Incorrecta - Cambiar
                </span>
              )}
            </NetworkBadge>
            
            {networkError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: '#f59e0b15',
                  color: '#d97706',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  border: '1px solid #d9770630'
                }}
              >
                ⚠️ Red
              </motion.div>
            )}
            
            <AccountInfo>
              <span>👤</span>
              <AccountAddress>{formatAddress(account)}</AccountAddress>
            </AccountInfo>
            
            <Button
              variant="outline"
              size="small"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Desconectando..." : "Desconectar"}
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleConnectWallet}
            disabled={loading || isConnecting}
          >
            {loading || isConnecting ? "Conectando..." : "Conectar Billetera"}
          </Button>
        )}
      </NavContainer>
      
      <AnimatePresence>
        {showWalletModal && (
          <WalletConnectionModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
          />
        )}
      </AnimatePresence>
    </HeaderContainer>
  );
};

export default Header;