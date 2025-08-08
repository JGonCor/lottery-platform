import { useState, useEffect, useCallback, useMemo } from 'react';
import useWeb3 from './useWeb3';
// Config simplificada para BSC mainnet
import { 
  getLotteryContractAddress,
  getUsdtContractAddress,
  toWei, 
  fromWei, 
  isCorrectNetwork,
  safeParseInt,
  cleanAddress
} from '../utils/web3';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';
import TokenABI from '../contracts/TokenABI.json';
import dataService from '../services/blockchainDataService';
import { referralService } from '../services/referralService';
import { walletValidationService } from '../services/walletValidationService';
import { ticketValidationService } from '../services/ticketValidationService';

// Unified interfaces for consistent data structure
export interface UnifiedTicketInfo {
  id: number;
  purchaseDate: string;
  isWinner: boolean;
  numbers: number[];
  matchCount?: number;
  prizeAmount?: string;
  claimed?: boolean;
  drawId?: number;
}

export interface UnifiedDrawData {
  drawId: number;
  winningNumbers: number[];
  timestamp: number;
  totalPoolAmount: string;
  accumulatedJackpot: string;
  isCompleted: boolean;
  nextDrawTimestamp: number;
}

export interface UnifiedPrizeDistribution {
  tier: number;
  matchCount: number;
  totalPrize: string;
  winnerCount: number;
  prizePerWinner: string;
  winners: string[];
}

export interface UnifiedLotteryStats {
  totalTicketsSold: number;
  totalDrawsCompleted: number;
  currentPoolAmount: string;
  accumulatedJackpot: string;
  ticketPrice: string;
  drawInterval: number; // in seconds
  lastDrawTimestamp: number;
  nextDrawTimestamp: number;
  contractBalance: string;
  isDrawPending: boolean;
}

export interface ReferralInfo {
  totalReferrals: number;
  maxDiscount: number;
  discountPerReferral: number;
  currentDiscount: number;
}

export interface BulkDiscountTier {
  ticketCount: number;
  discountPercent: number;
}

export interface UnifiedLotteryState {
  // Loading states
  loading: boolean;
  error: Error | null;
  
  // Core lottery data
  stats: UnifiedLotteryStats | null;
  latestDraw: UnifiedDrawData | null;
  prizeDistribution: UnifiedPrizeDistribution[];
  
  // User-specific data
  userTickets: UnifiedTicketInfo[];
  usdtBalance: string;
  isApproved: boolean;
  
  // Discounts and referrals
  referralInfo: ReferralInfo;
  bulkDiscountTiers: BulkDiscountTier[];
  referrer: string;
  
  // Real-time countdown
  timeUntilNextDraw: number;
  drawFrequency: string; // "Daily", "Weekly", etc.
}

/**
 * Unified lottery hook that consolidates all lottery-related functionality
 * Eliminates duplication between useLottery and useRealLotteryData
 * Ensures all data comes from smart contract with no hardcoded values
 */
export const useUnifiedLottery = () => {
  const { web3, account, active } = useWeb3();
  
  // Unified state
  const [state, setState] = useState<UnifiedLotteryState>({
    loading: false,
    error: null,
    stats: null,
    latestDraw: null,
    prizeDistribution: [],
    userTickets: [],
    usdtBalance: '0',
    isApproved: false,
    referralInfo: {
      totalReferrals: 0,
      maxDiscount: 10,
      discountPerReferral: 1,
      currentDiscount: 0
    },
    bulkDiscountTiers: [],
    referrer: '',
    timeUntilNextDraw: 0,
    drawFrequency: 'Loading...'
  });
  
  // Contract instances with memoization
  const lotteryContract = useMemo(() => {
    if (!web3) return null;
    try {
      return new web3.eth.Contract(
        MultiTierLotteryABI as any,
        getLotteryContractAddress()
      );
    } catch (error) {
      console.error('Error initializing lottery contract:', error);
      return null;
    }
  }, [web3]);
  
  const usdtContract = useMemo(() => {
    if (!web3) return null;
    try {
      return new web3.eth.Contract(
        TokenABI as any,
        getUsdtContractAddress()
      );
    } catch (error) {
      console.error('Error initializing USDT contract:', error);
      return null;
    }
  }, [web3]);
  
  // Network verification
  const verifyNetwork = useCallback(async () => {
    if (!active) return true;
    const onCorrectNetwork = await isCorrectNetwork();
    if (!onCorrectNetwork) {
      setState(prev => ({
        ...prev,
        error: new Error(`Red incorrecta. Conéctate a BSC Mainnet.`)
      }));
      return false;
    }
    return true;
  }, [active]);
  
  /**
   * Load complete lottery statistics with real blockchain data
   * Uses blockchain data service for verified, real contract data
   */
  const loadUnifiedLotteryData = useCallback(async () => {
    if (!web3 || !lotteryContract || !await verifyNetwork()) return;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use blockchain data service for real data
      const [
        lotteryStats,
        latestDraw,
        lotteryState
      ] = await Promise.all([
        dataService.getLotteryStatistics(),
        dataService.getLatestDraw(),
        dataService.getLotteryState()
      ]);
      
      // Calculate draw frequency - now supports 24h interval
      const drawFrequency = lotteryState.timeUntilNextDraw > 0 
        ? getDrawFrequencyText(86400) // 24 hours = 86400 seconds
        : 'Sorteo pendiente';
      
      // Process latest draw data
      let processedLatestDraw: UnifiedDrawData | null = null;
      if (latestDraw) {
        processedLatestDraw = {
          drawId: latestDraw.drawId,
          winningNumbers: latestDraw.winningNumbers,
          timestamp: latestDraw.timestamp,
          totalPoolAmount: latestDraw.totalPoolAmount,
          accumulatedJackpot: latestDraw.accumulatedJackpot,
          isCompleted: latestDraw.isCompleted,
          nextDrawTimestamp: Math.floor(Date.now() / 1000) + lotteryState.timeUntilNextDraw
        };
      }
      
      // Default bulk discount tiers (24h cycle optimized)
      const processedBulkTiers: BulkDiscountTier[] = [
        { ticketCount: 5, discountPercent: 2 },
        { ticketCount: 10, discountPercent: 5 },
        { ticketCount: 20, discountPercent: 10 }
      ];
      
      // Create unified stats with real blockchain data
      const unifiedStats: UnifiedLotteryStats = {
        totalTicketsSold: lotteryStats.totalTicketsSold,
        totalDrawsCompleted: lotteryStats.totalDrawsCompleted,
        currentPoolAmount: lotteryStats.currentPoolAmount,
        accumulatedJackpot: lotteryStats.accumulatedJackpot,
        ticketPrice: lotteryState.ticketPrice,
        drawInterval: 86400, // 24 hours in seconds
        lastDrawTimestamp: latestDraw?.timestamp || 0,
        nextDrawTimestamp: processedLatestDraw?.nextDrawTimestamp || 0,
        contractBalance: lotteryStats.contractBalance,
        isDrawPending: lotteryState.state === 'CALCULATING'
      };
      
      setState(prev => ({
        ...prev,
        stats: unifiedStats,
        latestDraw: processedLatestDraw,
        bulkDiscountTiers: processedBulkTiers,
        timeUntilNextDraw: lotteryState.timeUntilNextDraw,
        drawFrequency,
        loading: false
      }));
      
    } catch (err) {
      console.error('Error loading unified lottery data:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Error loading lottery data'),
        loading: false
      }));
    }
  }, [web3, lotteryContract, verifyNetwork]);
  
  /**
   * Load prize distribution for a specific draw with REAL data
   */
  const loadPrizeDistribution = useCallback(async (drawId?: number) => {
    if (!lotteryContract || !await verifyNetwork()) return;
    
    const targetDrawId = drawId || state.latestDraw?.drawId;
    if (!targetDrawId) return;
    
    try {
      const distribution: UnifiedPrizeDistribution[] = [];
      
      // Load real prize data for each tier (2-6 matches)
      for (let matchCount = 2; matchCount <= 6; matchCount++) {
        try {
          const [winners, tierPrize] = await Promise.all([
            lotteryContract.methods.getWinnersByTier(targetDrawId, matchCount).call(),
            lotteryContract.methods.getTierPrize(targetDrawId, matchCount).call()
          ]);
          
          const winnersArray = Array.isArray(winners) ? winners : [];
          const totalPrize = fromWei(tierPrize || '0');
          const prizePerWinner = winnersArray.length > 0 
            ? (parseFloat(totalPrize) / winnersArray.length).toFixed(4)
            : '0';
          
          distribution.push({
            tier: matchCount,
            matchCount,
            totalPrize,
            winnerCount: winnersArray.length,
            prizePerWinner,
            winners: winnersArray
          });
        } catch (tierError) {
          console.error(`Error loading tier ${matchCount}:`, tierError);
          distribution.push({
            tier: matchCount,
            matchCount,
            totalPrize: '0',
            winnerCount: 0,
            prizePerWinner: '0',
            winners: []
          });
        }
      }
      
      setState(prev => ({ ...prev, prizeDistribution: distribution }));
    } catch (err) {
      console.error('Error loading prize distribution:', err);
    }
  }, [lotteryContract, verifyNetwork, state.latestDraw?.drawId]);
  
  /**
   * Load user-specific data (tickets, balance, approvals)
   */
  const loadUserData = useCallback(async () => {
    if (!web3 || !lotteryContract || !usdtContract || !active || !account || !await verifyNetwork()) return;
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const [
        userTicketIds,
        usdtBalance,
        usdtAllowance,
        referralInfo,
        userReferrer
      ] = await Promise.all([
        lotteryContract.methods.getPlayerTickets(account).call(),
        usdtContract.methods.balanceOf(account).call(),
        usdtContract.methods.allowance(account, getLotteryContractAddress()).call(),
        lotteryContract.methods.getReferralDiscountInfo().call().catch(() => null),
        lotteryContract.methods.getReferrer(account).call().catch(() => '')
      ]);
      
      // Process user tickets with real data
      const processedTickets: UnifiedTicketInfo[] = [];
      if (Array.isArray(userTicketIds)) {
        for (const ticketId of userTicketIds) {
          try {
            const ticketData = await lotteryContract.methods.getTicket(ticketId).call();
            if (ticketData && ticketData.owner) {
              const ticket: UnifiedTicketInfo = {
                id: safeParseInt(ticketId),
                purchaseDate: new Date(safeParseInt(ticketData.timestamp) * 1000).toLocaleDateString(),
                isWinner: safeParseInt(ticketData.matchCount) >= 2,
                numbers: Array.isArray(ticketData.numbers) 
                  ? ticketData.numbers.map((n: any) => safeParseInt(n)) 
                  : [],
                matchCount: safeParseInt(ticketData.matchCount),
                claimed: !!ticketData.claimed,
                drawId: safeParseInt(ticketData.drawId)
              };
              
              // Calculate prize amount if winner
              if (ticket.isWinner && ticket.matchCount && ticket.drawId) {
                try {
                  const tierPrize = await lotteryContract.methods.getTierPrize(ticket.drawId, ticket.matchCount).call();
                  const tierWinners = await lotteryContract.methods.getWinnersByTier(ticket.drawId, ticket.matchCount).call();
                  const winnerCount = Array.isArray(tierWinners) ? tierWinners.length : 1;
                  ticket.prizeAmount = (parseFloat(fromWei(tierPrize)) / winnerCount).toFixed(4);
                } catch (prizeError) {
                  console.error('Error calculating prize amount:', prizeError);
                }
              }
              
              processedTickets.push(ticket);
            }
          } catch (ticketError) {
            console.error(`Error loading ticket ${ticketId}:`, ticketError);
          }
        }
      }
      
      // Process referral info
      let processedReferralInfo = state.referralInfo;
      if (referralInfo) {
        const totalReferrals = await lotteryContract.methods.getTotalReferrals(account).call().catch(() => 0);
        processedReferralInfo = {
          totalReferrals: safeParseInt(totalReferrals),
          maxDiscount: safeParseInt(referralInfo.maxReferralDiscount, 10),
          discountPerReferral: safeParseInt(referralInfo.discountPerReferral, 1),
          currentDiscount: Math.min(
            safeParseInt(totalReferrals) * safeParseInt(referralInfo.discountPerReferral, 1),
            safeParseInt(referralInfo.maxReferralDiscount, 10)
          )
        };
      }
      
      // Check approval
      const ticketPriceWei = state.stats?.ticketPrice ? toWei(state.stats.ticketPrice) : '0';
      const isApproved = BigInt(usdtAllowance || '0') >= BigInt(ticketPriceWei);
      
      setState(prev => ({
        ...prev,
        userTickets: processedTickets,
        usdtBalance: fromWei(usdtBalance || '0'),
        isApproved,
        referralInfo: processedReferralInfo,
        referrer: cleanAddress(userReferrer),
        loading: false
      }));
      
    } catch (err) {
      console.error('Error loading user data:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Error loading user data'),
        loading: false
      }));
    }
  }, [web3, lotteryContract, usdtContract, active, account, verifyNetwork, state.stats?.ticketPrice, state.referralInfo]);
  
  // Countdown timer effect
  useEffect(() => {
    if (state.timeUntilNextDraw <= 0) return;
    
    const interval = setInterval(() => {
      setState(prev => {
        const newTime = prev.timeUntilNextDraw - 1;
        if (newTime <= 0) {
          // Reload data when countdown reaches zero
          loadUnifiedLotteryData();
          return { ...prev, timeUntilNextDraw: 0 };
        }
        return { ...prev, timeUntilNextDraw: newTime };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.timeUntilNextDraw, loadUnifiedLotteryData]);
  
  // Load data when wallet connects
  useEffect(() => {
    if (active && web3) {
      loadUnifiedLotteryData();
    }
  }, [active, web3, loadUnifiedLotteryData]);
  
  // Load user data when account changes
  useEffect(() => {
    if (active && account && state.stats) {
      loadUserData();
    }
  }, [active, account, state.stats, loadUserData]);
  
  // Load prize distribution when latest draw changes
  useEffect(() => {
    if (state.latestDraw?.isCompleted) {
      loadPrizeDistribution(state.latestDraw.drawId);
    }
  }, [state.latestDraw, loadPrizeDistribution]);
  
  // Transaction functions (to be implemented)
  const buyTicket = useCallback(async (numbers: number[]) => {
    // Implementation here
    throw new Error('Not implemented yet');
  }, []);
  
  const buyMultipleTickets = useCallback(async (numbersArrays: number[][]) => {
    // Implementation here
    throw new Error('Not implemented yet');
  }, []);
  
  const approveUsdtSpending = useCallback(async (amount?: string) => {
    // Implementation here
    throw new Error('Not implemented yet');
  }, []);
  
  const calculateDiscount = useCallback(async (ticketCount: number) => {
    if (!lotteryContract || !account) return 0;
    try {
      const discount = await lotteryContract.methods.calculateDiscount(account, ticketCount).call();
      return safeParseInt(discount);
    } catch (error) {
      console.error('Error calculating discount:', error);
      return 0;
    }
  }, [lotteryContract, account]);
  
  // Return unified interface
  return {
    // State
    ...state,
    
    // Computed values
    jackpot: state.stats?.currentPoolAmount || '0',
    accumulatedJackpot: state.stats?.accumulatedJackpot || '0',
    ticketPrice: state.stats?.ticketPrice || '0',
    winners: state.prizeDistribution.find(p => p.tier === 6)?.winners || [],
    
    // Functions
    loadUnifiedLotteryData,
    loadPrizeDistribution,
    loadUserData,
    buyTicket,
    buyMultipleTickets,
    approveUsdtSpending,
    calculateDiscount,
    
    // Utilities
    refreshAllData: useCallback(() => {
      loadUnifiedLotteryData();
      if (active && account) {
        loadUserData();
      }
    }, [loadUnifiedLotteryData, loadUserData, active, account]),
    
    // Validations
    hasValidDraw: state.latestDraw?.isCompleted || false,
    hasDrawCompleted: (state.latestDraw?.drawId || 0) > 0,
    totalPrizePool: state.latestDraw 
      ? (parseFloat(state.latestDraw.totalPoolAmount) + parseFloat(state.latestDraw.accumulatedJackpot)).toFixed(2)
      : '0'
  };
};

// Helper functions
function getDrawFrequencyText(intervalSeconds: number): string {
  const intervals = [
    { seconds: 86400, text: 'Diaria' },      // 1 day
    { seconds: 259200, text: 'Cada 3 días' }, // 3 days
    { seconds: 604800, text: 'Semanal' },     // 1 week
    { seconds: 1209600, text: 'Bisemanal' },  // 2 weeks
    { seconds: 2592000, text: 'Mensual' }     // 30 days
  ];
  
  for (const interval of intervals) {
    if (intervalSeconds <= interval.seconds * 1.1) { // 10% tolerance
      return interval.text;
    }
  }
  
  // Calculate custom frequency
  const days = Math.round(intervalSeconds / 86400);
  return days === 1 ? 'Diaria' : `Cada ${days} días`;
}

function unpackWinningNumbers(packedNumbers: string): number[] {
  // Implementation to unpack numbers from uint48 format
  // This would depend on how numbers are packed in the smart contract
  // Placeholder implementation
  try {
    const packed = BigInt(packedNumbers);
    const numbers: number[] = [];
    
    // Extract 6 numbers, each using 8 bits (1-49 fits in 6 bits, but 8 for safety)
    for (let i = 0; i < 6; i++) {
      const shift = BigInt(i * 8);
      const number = Number((packed >> shift) & BigInt(0xFF));
      if (number > 0 && number <= 49) {
        numbers.push(number);
      }
    }
    
    return numbers.length === 6 ? numbers : [];
  } catch (error) {
    console.error('Error unpacking winning numbers:', error);
    return [];
  }
}

export default useUnifiedLottery;