import { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import { metaMaskConnector, getWeb3 } from '../utils/web3';
import Web3 from 'web3';

// BSC Network Configuration
const BSC_MAINNET = {
  chainId: '0x38', // 56 in hex
  chainName: 'Binance Smart Chain Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed1.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
};

const BSC_TESTNET = {
  chainId: '0x61', // 97 in hex
  chainName: 'Binance Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

// Get target network based on environment
const getTargetNetwork = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? BSC_MAINNET : BSC_TESTNET;
};

export interface ConnectionError extends Error {
  code?: number;
  reason?: string;
  details?: string;
}

export interface NetworkValidationResult {
  isValid: boolean;
  currentChainId?: string;
  targetChainId: string;
  needsSwitch: boolean;
}

export const useWeb3 = () => {
  const { isActive, account, provider, connector } = useWeb3React();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ConnectionError | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [chainId, setChainId] = useState<number | null>(null);
  
  const targetNetwork = getTargetNetwork();
  const maxRetries = 3;

  // Get chainId from provider (robusto a providers sin request)
  useEffect(() => {
    const fetchChainId = async () => {
      try {
        if (!isActive) return;
        if (window.ethereum?.request) {
          const id = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(parseInt(id as string, 16));
          return;
        }
        const anyProvider: any = provider as any;
        if (anyProvider?.request) {
          const id = await anyProvider.request({ method: 'eth_chainId' });
          setChainId(parseInt(id as string, 16));
          return;
        }
        // Fallback usando Web3
        const web3 = getWeb3();
        const idNum = await web3.eth.getChainId();
        setChainId(Number(idNum));
      } catch (err) {
        console.error('Error obteniendo chainId:', err);
      }
    };
    fetchChainId();
  }, [provider, isActive]);

  // Network validation and switching
  const validateAndSwitchNetwork = useCallback(async (): Promise<NetworkValidationResult> => {
    if (!window.ethereum) {
      throw new Error('No hay proveedor de Web3 disponible');
    }
    
    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const targetChainId = targetNetwork.chainId;
      
      const result: NetworkValidationResult = {
        isValid: currentChainId === targetChainId,
        currentChainId,
        targetChainId,
        needsSwitch: currentChainId !== targetChainId
      };
      
      if (!result.isValid) {
        setNetworkError(`Red incorrecta. Por favor, cambia a ${targetNetwork.chainName}`);
        
        try {
          // Try to switch to the correct network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
          
          setNetworkError(null);
          result.isValid = true;
          result.needsSwitch = false;
          
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added to MetaMask, try to add it
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [targetNetwork],
              });
              setNetworkError(null);
              result.isValid = true;
              result.needsSwitch = false;
            } catch (addError) {
              console.error('Error adding network:', addError);
              throw new Error(`No se pudo agregar la red ${targetNetwork.chainName}`);
            }
          } else {
            console.error('Error switching network:', switchError);
            throw new Error(`No se pudo cambiar a la red ${targetNetwork.chainName}`);
          }
        }
      } else {
        setNetworkError(null);
      }
      
      return result;
    } catch (error) {
      console.error('Network validation error:', error);
      throw error;
    }
  }, [targetNetwork]);

  // Enhanced wallet connection with comprehensive error handling
  const connectWallet = useCallback(async (retryCount = 0) => {
    console.log('🔗 Attempting wallet connection, retry count:', retryCount);
    
    if (isConnecting && retryCount === 0) {
      console.log('⏸️ Already connecting, skipping...');
      return; // Prevent multiple simultaneous connections
    }
    
    setIsConnecting(true);
    setLoading(true);
    setError(null);
    setNetworkError(null);
    
    try {
      console.log('🔍 Checking MetaMask installation...');
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask no está instalado. Por favor, instala MetaMask para continuar.');
      }
      
      console.log('✅ MetaMask found, checking accounts...');
      
      // Check if MetaMask is locked
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      console.log('📋 Current accounts:', accounts.length > 0 ? accounts.length : 'none');
      
      if (accounts.length === 0) {
        console.log('🔐 No accounts found, requesting access...');
        // Wallet is locked, request connection
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      console.log('🚀 Activating connector...');
      // Activate the connector
      await metaMaskConnector.activate();
      
      console.log('🌐 Validating network...');
      // Validate network after connection
      await validateAndSwitchNetwork();
      
      // Store successful connection
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('lastConnectionTime', Date.now().toString());
      
      setConnectionAttempts(0);
      console.log('✅ Wallet connected successfully');
      
    } catch (err: any) {
      console.error('❌ Wallet connection error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        data: err.data,
      });
      
      let connectionError: ConnectionError;
      
      if (err.code === 4001) {
        connectionError = {
          name: 'UserRejectedError',
          message: 'Conexión cancelada por el usuario',
          code: 4001,
          reason: 'User rejected the request'
        };
      } else if (err.code === -32002) {
        connectionError = {
          name: 'PendingRequestError',
          message: 'Ya hay una solicitud de conexión pendiente en MetaMask',
          code: -32002,
          reason: 'Already processing request'
        };
      } else if (err.message?.includes('MetaMask')) {
        connectionError = {
          name: 'MetaMaskError',
          message: 'Error de MetaMask: ' + err.message,
          details: err.message
        };
      } else {
        connectionError = {
          name: 'ConnectionError',
          message: err.message || 'Error desconocido al conectar la billetera',
          details: err.toString()
        };
      }
      
      setError(connectionError);
      setConnectionAttempts(prev => prev + 1);
      
      // Auto-retry logic for certain errors
      if (retryCount < maxRetries && (err.code === -32002 || err.message?.includes('network'))) {
        console.log(`🔄 Reintentando conexión (intento ${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => {
          connectWallet(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      localStorage.removeItem('walletConnected');
    } finally {
      setLoading(false);
      setIsConnecting(false);
      console.log('🏁 Connection attempt finished');
    }
  }, [isConnecting, validateAndSwitchNetwork]);

  const disconnectWallet = async () => {
    try {
      // Primero, desactivar la conexión a través de web3-react
      if (connector?.deactivate) {
        await connector.deactivate();
      } else if (connector?.resetState) {
        connector.resetState();
      }
      
      // Limpiar el estado de conexión en localStorage
      localStorage.removeItem('walletConnected');
      
      // Si es MetaMask, intentar métodos específicos de desconexión
      if (window.ethereum) {
        try {
          if (window.ethereum.isMetaMask && typeof window.ethereum.disconnect === 'function') {
            await window.ethereum.disconnect();
          }
          
          // Algunas billeteras soportan este método (Trust Wallet, etc)
          if (typeof window.ethereum.close === 'function') {
            await window.ethereum.close();
          }
        } catch (innerErr) {
          console.error('Error específico al desconectar provider:', innerErr);
        }
      }
      
      // Para proveedores que soportan EIP-1193
      if (provider && typeof provider !== 'undefined') {
        try {
          // Algunos proveedores tienen métodos de desconexión
          if (typeof provider.disconnect === 'function') {
            await provider.disconnect();
          }
          
          if (typeof provider.close === 'function') {
            await provider.close();
          }
        } catch (providerErr) {
          console.error('Error al cerrar el proveedor:', providerErr);
        }
      }
      
      // Revocar permiso específico para MetaMask (experimental)
      if (window.ethereum && window.ethereum.isMetaMask) {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
        } catch (revokeErr) {
          console.error('Error al revocar permisos:', revokeErr);
        }
      }
      // No recargar la página: dejar que React rehaga el render sin perder estado global
    } catch (err) {
      console.error('Error al desconectar wallet:', err);
      // Evitar recargas forzadas para no provocar pantallas en blanco
    }
  };
  
  // Enhanced auto-connect with better validation
  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;
      
      const wasConnected = localStorage.getItem('walletConnected') === 'true';
      const lastConnection = localStorage.getItem('lastConnectionTime');
      const connectionAge = lastConnection ? Date.now() - parseInt(lastConnection) : Infinity;
      
      // Only auto-connect if connected recently (within 24 hours)
      if (wasConnected && connectionAge < 24 * 60 * 60 * 1000) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            console.log('🔄 Auto-connecting to previously connected wallet...');
            await metaMaskConnector.activate();
              
            // Validate network after auto-connection
            setTimeout(() => {
              validateAndSwitchNetwork().catch(console.error);
            }, 1000);
          } else {
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('lastConnectionTime');
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('lastConnectionTime');
        }
      }
    };
    
    autoConnect();
  }, [validateAndSwitchNetwork]);
  
  // Listen for network changes
  useEffect(() => {
    if (window.ethereum && isActive) {
      const handleChainChanged = (chainId: string) => {
        console.log('🔄 Network changed to:', chainId);
        validateAndSwitchNetwork().catch(console.error);
      };
      
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('🔄 Accounts changed:', accounts);
        if (accounts.length === 0) {
          // User disconnected
          disconnectWallet();
        }
      };
      
      const handleDisconnect = () => {
        console.log('🔌 Wallet disconnected');
        disconnectWallet();
      };
      
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', handleDisconnect);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [isActive, validateAndSwitchNetwork]);

  // Get network info for display
  const getNetworkInfo = useCallback(() => {
    const currentChainId = chainId ? `0x${chainId.toString(16)}` : null;
    const isCorrectNetwork = currentChainId === targetNetwork.chainId;
    
    return {
      isCorrectNetwork,
      currentNetwork: isCorrectNetwork ? targetNetwork.chainName : 'Red Desconocida',
      targetNetwork: targetNetwork.chainName,
      currentChainId,
      targetChainId: targetNetwork.chainId
    };
  }, [chainId, targetNetwork]);
  
  // Force network switch
  const switchToCorrectNetwork = useCallback(async () => {
    try {
      await validateAndSwitchNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, [validateAndSwitchNetwork]);
  
  return {
    // Core Web3 data
    web3: provider ? new Web3(provider) : getWeb3(),
    account,
    active: isActive,
    chainId,
    
    // Connection state
    loading,
    isConnecting,
    error,
    networkError,
    connectionAttempts,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchToCorrectNetwork,
    
    // Network utilities
    networkInfo: getNetworkInfo(),
    validateAndSwitchNetwork,
    
    // Constants
    targetNetwork,
    maxRetries
  };
};

export default useWeb3;