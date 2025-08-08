import { useState, useCallback, useEffect } from 'react';
import { useSafeWeb3 } from './useSafeWeb3';

export interface SafeTicketInfo {
  id: number;
  purchaseDate: string;
  isWinner: boolean;
  numbers?: number[];
}

export interface SafeReferralInfo {
  totalReferrals: number;
  maxDiscount: number;
  discountPerReferral: number;
  currentDiscount: number;
  referralCode: string;
  earnings: string;
}

export interface SafeBulkDiscountTier {
  ticketCount: number;
  discountPercent: number;
}

export interface SafeLotteryState {
  loading: boolean;
  error: Error | null;
  jackpot: string;
  accumulatedJackpot: string;
  ticketPrice: string;
  tickets: SafeTicketInfo[];
  timeUntilNextDraw: number;
  isApproved: boolean;
  usdtBalance: string;
  winners: string[];
  referralInfo: SafeReferralInfo;
  bulkDiscountTiers: SafeBulkDiscountTier[];
  referrer: string;
}

// Mock data that simulates a real lottery state
const MOCK_STATE: SafeLotteryState = {
  loading: false,
  error: null,
  jackpot: '125750',
  accumulatedJackpot: '98420',
  ticketPrice: '5.00',
  tickets: [
    {
      id: 1,
      purchaseDate: new Date().toISOString(),
      isWinner: true,
      numbers: [7, 15, 23, 31, 42, 49]
    },
    {
      id: 2,
      purchaseDate: new Date(Date.now() - 86400000).toISOString(),
      isWinner: false,
      numbers: [3, 12, 18, 27, 35, 44]
    }
  ],
  timeUntilNextDraw: 3600 * 6, // 6 hours
  isApproved: false,
  usdtBalance: '150.75',
  winners: [
    '0x742d35cc6639c0532de5b4a9b4f72b4e4f3b5c2d',
    '0x8ba1f109551bd432803012645hac136c0c2bd4e1',
    '0x9c55a4f2d3b1a8c7e6f5d4e3b2a1c9d8e7f6a5b4'
  ],
  referralInfo: {
    totalReferrals: 3,
    maxDiscount: 20,
    discountPerReferral: 2,
    currentDiscount: 6,
    referralCode: 'LUCKY2024-ABC123',
    earnings: '45.25'
  },
  bulkDiscountTiers: [
    { ticketCount: 5, discountPercent: 5 },
    { ticketCount: 10, discountPercent: 10 },
    { ticketCount: 20, discountPercent: 15 }
  ],
  referrer: ''
};

/**
 * Safe lottery hook that never fails
 * Returns realistic mock data and handles all operations safely
 */
export const useSafeLottery = () => {
  const { active, account } = useSafeWeb3();
  const [state, setState] = useState<SafeLotteryState>(MOCK_STATE);

  // Simulate countdown timer
  useEffect(() => {
    if (state.timeUntilNextDraw <= 0) return;

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        timeUntilNextDraw: Math.max(0, prev.timeUntilNextDraw - 1)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.timeUntilNextDraw]);

  // Safe methods that simulate real functionality
  const loadLotteryInfo = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setState(prev => ({
      ...prev,
      loading: false,
      // Simulate small changes in jackpot
      jackpot: (parseInt(prev.jackpot) + Math.floor(Math.random() * 100)).toString()
    }));
  }, []);

  const loadUserTickets = useCallback(async () => {
    if (!active || !account) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    // Simulate loading user tickets
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setState(prev => ({ ...prev, loading: false }));
  }, [active, account]);

  const loadReferralInfo = useCallback(async () => {
    if (!active || !account) return;
    
    // Simulate loading referral info
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [active, account]);

  const approveUsdtSpending = useCallback(async (amount?: string): Promise<string> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Simulate approval transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        isApproved: true 
      }));
      
      return 'mock-approval-tx-hash';
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: new Error('Simulación de error de aprobación') 
      }));
      throw error;
    }
  }, []);

  const revokeUsdtApproval = useCallback(async (): Promise<string> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        isApproved: false 
      }));
      
      return 'mock-revoke-tx-hash';
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: new Error('Error simulado al revocar aprobación') 
      }));
      throw error;
    }
  }, []);

  const buyTicket = useCallback(async (numbers: number[]): Promise<string> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Simulate ticket purchase
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const newTicket: SafeTicketInfo = {
        id: Date.now(),
        purchaseDate: new Date().toISOString(),
        isWinner: false,
        numbers
      };
      
      setState(prev => ({
        ...prev,
        loading: false,
        tickets: [...prev.tickets, newTicket],
        usdtBalance: (parseFloat(prev.usdtBalance) - parseFloat(prev.ticketPrice)).toFixed(2)
      }));
      
      return 'mock-ticket-tx-hash';
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: new Error('Error simulado al comprar ticket') 
      }));
      throw error;
    }
  }, []);

  const buyMultipleTickets = useCallback(async (numbersArrays: number[][]): Promise<string> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newTickets: SafeTicketInfo[] = numbersArrays.map((numbers, index) => ({
        id: Date.now() + index,
        purchaseDate: new Date().toISOString(),
        isWinner: false,
        numbers
      }));
      
      setState(prev => ({
        ...prev,
        loading: false,
        tickets: [...prev.tickets, ...newTickets],
        usdtBalance: (parseFloat(prev.usdtBalance) - (parseFloat(prev.ticketPrice) * numbersArrays.length)).toFixed(2)
      }));
      
      return 'mock-multiple-tickets-tx-hash';
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: new Error('Error simulado al comprar múltiples tickets') 
      }));
      throw error;
    }
  }, []);

  const checkUsdtAllowance = useCallback(async () => {
    // Simulate checking allowance
    await new Promise(resolve => setTimeout(resolve, 200));
    return state.isApproved;
  }, [state.isApproved]);

  const addReferral = useCallback(async (referrerAddress: string) => {
    // Simulate adding referral
    await new Promise(resolve => setTimeout(resolve, 500));
    setState(prev => ({ 
      ...prev, 
      referrer: referrerAddress 
    }));
  }, []);

  const calculateDiscount = useCallback(async (ticketCount: number): Promise<number> => {
    // Calculate discount based on bulk discount tiers
    const tier = state.bulkDiscountTiers
      .reverse()
      .find(tier => ticketCount >= tier.ticketCount);
    
    return tier ? tier.discountPercent : 0;
  }, [state.bulkDiscountTiers]);

  const verifyNetwork = useCallback(async (): Promise<boolean> => {
    // Always return true for safe operation
    return true;
  }, []);

  return {
    // State
    ...state,
    
    // Methods
    loadLotteryInfo,
    loadUserTickets,
    loadReferralInfo,
    approveUsdtSpending,
    revokeUsdtApproval,
    buyTicket,
    buyMultipleTickets,
    checkUsdtAllowance,
    addReferral,
    calculateDiscount,
    verifyNetwork
  };
};

export default useSafeLottery;
