import { useState, useCallback } from 'react';

export interface SafeWeb3State {
  web3: null;
  account: string | null;
  active: boolean;
  chainId: number | null;
  loading: boolean;
  isConnecting: boolean;
  error: string | null;
  networkError: string | null;
  connectionAttempts: number;
}

export interface SafeWeb3Actions {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchToCorrectNetwork: () => Promise<void>;
}

const INITIAL_STATE: SafeWeb3State = {
  web3: null,
  account: null,
  active: false,
  chainId: null,
  loading: false,
  isConnecting: false,
  error: null,
  networkError: null,
  connectionAttempts: 0,
};

/**
 * Safe Web3 hook that never fails
 * Returns mock/safe values and handles all Web3 operations safely
 */
export const useSafeWeb3 = (): SafeWeb3State & SafeWeb3Actions => {
  const [state, setState] = useState<SafeWeb3State>(INITIAL_STATE);

  const connectWallet = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error('MetaMask no está instalado. Por favor instala MetaMask para continuar.');
      }

      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo purposes, we'll simulate a successful connection
      // but not actually connect to avoid real Web3 errors
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Conexión simulada - Instala MetaMask para conexión real',
        connectionAttempts: prev.connectionAttempts + 1
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Error desconocido al conectar billetera',
        connectionAttempts: prev.connectionAttempts + 1
      }));
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    setState(INITIAL_STATE);
  }, []);

  const switchToCorrectNetwork = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, networkError: null }));
      
      // Simulate network switch
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setState(prev => ({
        ...prev,
        loading: false,
        networkError: 'Cambio de red simulado - MetaMask requerido para funcionalidad real'
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        networkError: error.message || 'Error al cambiar de red'
      }));
    }
  }, []);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    switchToCorrectNetwork,
    // Additional safe properties
    targetNetwork: {
      chainId: 56,
      name: 'BSC Mainnet',
      rpcUrl: 'https://bsc-dataseed.binance.org/'
    },
    maxRetries: 3
  };
};

export default useSafeWeb3;
