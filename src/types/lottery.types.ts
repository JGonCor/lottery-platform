// Tipos TypeScript centralizados para la aplicación de lotería

export interface LotteryConfig {
  ticketPrice: string;
  maxNumbers: number;
  numbersPerTicket: number;
  drawIntervalHours: number;
}

export interface UserWallet {
  address: string;
  isConnected: boolean;
  networkId: number;
  balance: {
    bnb: string;
    usdt: string;
  };
}

export interface LotteryTicket {
  id: number;
  numbers: number[];
  purchaseDate: string;
  drawId?: number;
  isWinner?: boolean;
  matchCount?: number;
  claimed?: boolean;
  prizeAmount?: string;
}

export interface DrawResult {
  drawId: number;
  winningNumbers: number[];
  drawDate: string;
  totalPrizePool: string;
  accumulatedJackpot: string;
  blockNumber: number;
  transactionHash: string;
}

export interface PrizeTier {
  matchCount: number;
  winners: number;
  prizePerWinner: string;
  totalPrize: string;
  percentage: number;
}

export interface ReferralData {
  totalReferrals: number;
  currentDiscount: number;
  maxDiscount: number;
  discountPerReferral: number;
  referralCode?: string;
  referredBy?: string;
}

export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
}

export interface Web3Error {
  code: number;
  message: string;
  data?: any;
}

// Estados de carga
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: number;
}

// Configuración de red
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
