// Utilidades para el contrato - Solo mainnet
export const getLotteryContractAddress = (): string => {
  return process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
};

export const getUsdtContractAddress = (): string => {
  return process.env.REACT_APP_USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
};

export const isCorrectNetwork = async (): Promise<boolean> => {
  try {
    if (typeof window.ethereum !== 'undefined') {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainId, 16) === 56; // BSC Mainnet
    }
    return false;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};

export const fromWei = (value: string | number, decimals: number = 18): string => {
  if (!value) return '0';
  const valueStr = value.toString();
  const divisor = Math.pow(10, decimals);
  return (parseFloat(valueStr) / divisor).toString();
};

export const toWei = (value: string | number, decimals: number = 18): string => {
  if (!value) return '0';
  const valueStr = value.toString();
  const multiplier = Math.pow(10, decimals);
  return (parseFloat(valueStr) * multiplier).toString();
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getExplorerUrl = (txHash?: string, address?: string): string => {
  const baseUrl = 'https://bscscan.com/';
  
  if (txHash) {
    return `${baseUrl}tx/${txHash}`;
  }
  
  if (address) {
    return `${baseUrl}address/${address}`;
  }
  
  return baseUrl;
};
