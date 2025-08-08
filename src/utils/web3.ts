import Web3 from 'web3';
import { initializeConnector } from '@web3-react/core';
import { MetaMask } from '@web3-react/metamask';
// Configuración simplificada para BSC mainnet

// Añadir tipado para window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      disconnect?: () => Promise<void>;
      close?: () => Promise<void>;
    };
  }
}

// Configuración para BSC usando el config centralizado
export const CHAIN_IDS = {
  BSC_MAINNET: 56,
  BSC_TESTNET: 97
};

// Configuración de RPC usando el config centralizado
export const RPC_URLS = {
  [CHAIN_IDS.BSC_MAINNET]: 'https://bsc-dataseed.binance.org/',
  [CHAIN_IDS.BSC_TESTNET]: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
};

// Usar configuración dinámica basada en el entorno (lazy loading)
export const getActiveChainId = () => {
  try {
    return 56; // BSC Mainnet
  } catch (error) {
    console.warn('Error getting chain ID:', error);
    return 56; // BSC Mainnet por defecto
  }
};

export const getActiveRpcUrl = () => {
  try {
    return process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
  } catch (error) {
    console.warn('Error getting RPC URL:', error);
    return 'https://bsc-dataseed.binance.org/';
  }
};

// Para compatibilidad con código existente
export const ACTIVE_CHAIN_ID = getActiveChainId();
export const ACTIVE_RPC_URL = getActiveRpcUrl();

// Inicializar el conector MetaMask correctamente
export const [metaMaskConnector, metaMaskHooks] = initializeConnector<MetaMask>(
  (actions) => new MetaMask({ actions })
);

// Crear un array de conectores válido para Web3ReactProvider
export const connectors: [MetaMask, any][] = [
  [metaMaskConnector, metaMaskHooks]
];

// Obtener una instancia de Web3
export const getWeb3 = () => {
  // Verificar si estamos en un navegador con soporte para web3
  if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
    try {
      const web3 = new Web3(window.ethereum as any || getActiveRpcUrl());
      return web3;
    } catch (error) {
      console.error('Error al inicializar Web3:', error);
      // Fallback a RPC público
      return new Web3(getActiveRpcUrl());
    }
  } else {
    // Entorno sin soporte web3 (servidor, navegador viejo)
    console.warn('No se detectó proveedor Web3, usando proveedor de fallback');
    return new Web3(getActiveRpcUrl());
  }
};

// Direcciones de contratos usando la configuración centralizada (lazy loading)
export const getLotteryContractAddress = () => {
  return process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
};

export const getUsdtContractAddress = () => {
  return process.env.REACT_APP_USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
};

// Para compatibilidad con código existente
export const LOTTERY_CONTRACT_ADDRESS = getLotteryContractAddress();
export const USDT_CONTRACT_ADDRESS = getUsdtContractAddress();

// Configuración del contrato usando el config
export const getTicketPrice = () => {
  try {
    return process.env.REACT_APP_TICKET_PRICE || '5';
  } catch (error) {
    console.warn('Error getting ticket price:', error);
    return '5';
  }
};

export const TICKET_PRICE_USDT = getTicketPrice();

// Helpers para trabajar con valores en wei
export const toWei = (amount: string | number | unknown, decimals: number = 18): string => {
  try {
    // Validar que amount sea un valor válido
    if (amount === null || amount === undefined) {
      console.warn('toWei recibió un valor nulo o indefinido');
      return '0';
    }
    
    // Convertir a string para manejar múltiples tipos
    const amountStr = String(amount);
    
    // Validar que sea un número válido
    if (!/^-?\d*\.?\d+$/.test(amountStr)) {
      console.warn(`toWei recibió un valor no numérico: ${amountStr}`);
      return '0';
    }
    
    return Web3.utils.toWei(amountStr, decimals === 18 ? 'ether' : 'mwei');
  } catch (error) {
    console.error('Error al convertir a wei:', error);
    return '0';
  }
};

export const fromWei = (amount: string | number | unknown, decimals: number = 18): string => {
  try {
    // Validar que amount sea un valor válido
    if (amount === null || amount === undefined) {
      console.warn('fromWei recibió un valor nulo o indefinido');
      return '0';
    }
    
    // Convertir a string para manejar múltiples tipos
    const amountStr = String(amount);
    
    // Limpiar la cadena para asegurarnos de que sea un número válido
    const cleanAmount = amountStr.replace(/[^\d.]/g, '');
    if (cleanAmount === '' || isNaN(Number(cleanAmount))) {
      console.warn(`fromWei recibió un valor no numérico: ${amountStr}`);
      return '0';
    }
    
    return Web3.utils.fromWei(cleanAmount, decimals === 18 ? 'ether' : 'mwei');
  } catch (error) {
    console.error('Error al convertir desde wei:', error);
    return '0';
  }
};

// Función segura para convertir valores a enteros
export const safeParseInt = (value: unknown, defaultValue: number = 0): number => {
  try {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    
    if (typeof value === 'number') {
      return Math.floor(value);
    }
    
    const valueStr = String(value).trim();
    if (valueStr === '' || isNaN(Number(valueStr))) {
      return defaultValue;
    }
    
    return parseInt(valueStr, 10);
  } catch (error) {
    console.error('Error al convertir a entero:', error);
    return defaultValue;
  }
};

// Función para validar y limpiar direcciones Ethereum
export const cleanAddress = (address: unknown): string => {
  if (!address) return '';
  
  // Si es una cadena y tiene el formato 0x... con la longitud correcta
  if (typeof address === 'string' && /^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
    // Asegurar que tiene el prefijo 0x
    return address.startsWith('0x') ? address : `0x${address}`;
  }
  
  return '';
};

// Validación y cambio de redes
export const isCorrectNetwork = async (): Promise<boolean> => {
  if (!window.ethereum) return false;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16) === ACTIVE_CHAIN_ID;
  } catch (error) {
    console.error('Error al verificar la red:', error);
    return false;
  }
};

export const switchToSupportedNetwork = async (): Promise<boolean> => {
  if (!window.ethereum) return false;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${ACTIVE_CHAIN_ID.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    // Si la red no está agregada al metamask, intentamos agregarla
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${ACTIVE_CHAIN_ID.toString(16)}`,
              chainName: ACTIVE_CHAIN_ID === CHAIN_IDS.BSC_MAINNET ? 'Binance Smart Chain' : 'BSC Testnet',
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: [ACTIVE_RPC_URL],
              blockExplorerUrls: [
                ACTIVE_CHAIN_ID === CHAIN_IDS.BSC_MAINNET 
                  ? 'https://bscscan.com/' 
                  : 'https://testnet.bscscan.com/'
              ],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Error añadiendo la red:', addError);
        return false;
      }
    }
    console.error('Error cambiando de red:', switchError);
    return false;
  }
};

// Formatear direcciones para mostrar
export const formatAddress = (address: string | null | undefined): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Verificar si una dirección es válida
export const isValidAddress = (address: string | null | undefined): boolean => {
  if (!address) return false;
  return Web3.utils.isAddress(address);
};