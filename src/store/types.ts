// Global store types for the lottery dApp
export interface User {
  address: string;
  usdtBalance: string;
  isConnected: boolean;
  chainId: number | null;
  networkName: string;
}

export interface LotteryTicket {
  id: string;
  numbers: number[];
  purchaseDate: string;
  isWinner: boolean;
  winningTier?: number;
  prizeAmount?: string;
  transactionHash: string;
}

export interface LotteryDraw {
  id: string;
  drawNumber: number;
  winningNumbers: number[];
  drawDate: string;
  jackpotAmount: string;
  totalWinners: Record<number, number>; // tier -> winner count
  status: 'pending' | 'active' | 'completed';
  nextDrawDate: string;
}

export interface ReferralInfo {
  totalReferrals: number;
  currentDiscount: number;
  maxDiscount: number;
  discountPerReferral: number;
  referralCode: string;
  referredBy?: string;
  earnings: string;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'ticket_purchase' | 'approval' | 'claim_prize';
  timestamp: number;
  confirmations: number;
  gasUsed?: string;
  errorMessage?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
  duration?: number;
}

export interface UIState {
  isMobile: boolean;
  isTablet: boolean;
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: {
    global: boolean;
    tickets: boolean;
    balance: boolean;
    approval: boolean;
  };
  modals: {
    buyTicket: boolean;
    claimPrize: boolean;
    shareReferral: boolean;
  };
}

export interface ConnectionState {
  isConnecting: boolean;
  isReconnecting: boolean;
  lastConnectionAttempt: number;
  connectionError: string | null;
  provider: string | null; // 'metamask' | 'walletconnect' | etc.
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  walletConnectionTime: number;
  transactionTime: Record<string, number>;
  apiResponseTimes: Record<string, number>;
}

// Store slices interfaces
export interface Web3Slice {
  user: User;
  connectionState: ConnectionState;
  isApproved: boolean;
  connectWallet: (provider?: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  approveUSDT: (amount: string) => Promise<string>;
  checkApproval: () => Promise<boolean>;
  updateBalance: () => Promise<void>;
}

export interface LotterySlice {
  currentDraw: LotteryDraw | null;
  userTickets: LotteryTicket[];
  jackpot: string;
  accumulatedJackpot: string;
  ticketPrice: string;
  winners: string[];
  timeUntilNextDraw: number;
  referralInfo: ReferralInfo;
  bulkDiscountTiers: Array<{ ticketCount: number; discountPercent: number }>;
  
  // Methods
  loadLotteryInfo: () => Promise<void>;
  loadUserTickets: () => Promise<void>;
  buyTicket: (numbers: number[]) => Promise<string>;
  buyMultipleTickets: (numbersArrays: number[][]) => Promise<string>;
  claimPrize: (ticketId: string) => Promise<string>;
  calculateDiscount: (ticketCount: number) => Promise<number>;
  generateReferralLink: () => string;
  registerReferral: (referrerAddress: string) => Promise<void>;
}

export interface NotificationSlice {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export interface TransactionSlice {
  transactions: TransactionStatus[];
  addTransaction: (tx: Omit<TransactionStatus, 'confirmations'>) => void;
  updateTransaction: (hash: string, updates: Partial<TransactionStatus>) => void;
  removeTransaction: (hash: string) => void;
  getTransactionStatus: (hash: string) => TransactionStatus | undefined;
}

export interface UISlice {
  ui: UIState;
  setMobile: (isMobile: boolean) => void;
  setTablet: (isTablet: boolean) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setLoading: (key: keyof UIState['loading'], loading: boolean) => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
}

export interface PerformanceSlice {
  metrics: PerformanceMetrics;
  startTimer: (key: string) => void;
  endTimer: (key: string) => void;
  recordMetric: (key: string, value: number) => void;
  getAverageMetric: (key: string) => number;
}

// Combined store type
export interface AppStore extends 
  Web3Slice, 
  LotterySlice, 
  NotificationSlice, 
  TransactionSlice, 
  UISlice, 
  PerformanceSlice {}