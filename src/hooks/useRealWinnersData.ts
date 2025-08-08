import { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

// Lottery Contract ABI (minimal required for winners data)
const LOTTERY_ABI: AbiItem[] = [
  {
    constant: true,
    inputs: [{ name: 'drawId', type: 'uint256' }],
    name: 'getDrawResult',
    outputs: [
      { name: 'winningNumbers', type: 'uint8[6]' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'totalPool', type: 'uint256' },
      { name: 'isCompleted', type: 'bool' }
    ],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getCurrentDrawId',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'drawId', type: 'uint256' }],
    name: 'getDrawWinners',
    outputs: [
      { name: 'tier1Winners', type: 'address[]' },
      { name: 'tier2Winners', type: 'address[]' },
      { name: 'tier3Winners', type: 'address[]' },
      { name: 'tier4Winners', type: 'address[]' },
      { name: 'tier5Winners', type: 'address[]' }
    ],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'drawId', type: 'uint256' }],
    name: 'getDrawPrizes',
    outputs: [
      { name: 'tier1Prize', type: 'uint256' },
      { name: 'tier2Prize', type: 'uint256' },
      { name: 'tier3Prize', type: 'uint256' },
      { name: 'tier4Prize', type: 'uint256' },
      { name: 'tier5Prize', type: 'uint256' }
    ],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'drawId', type: 'uint256' }],
    name: 'getTotalTicketsSold',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'drawId', type: 'uint256' },
      { indexed: false, name: 'winningNumbers', type: 'uint8[6]' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'DrawCompleted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'drawId', type: 'uint256' },
      { indexed: true, name: 'winner', type: 'address' },
      { indexed: false, name: 'tier', type: 'uint8' },
      { indexed: false, name: 'prize', type: 'uint256' }
    ],
    name: 'PrizeWon',
    type: 'event'
  }
];

// Contract addresses
const LOTTERY_CONTRACTS = {
  mainnet: '0x1234567890123456789012345678901234567890', // Replace with actual BSC mainnet address
  testnet: '0x9876543210987654321098765432109876543210'  // Replace with actual BSC testnet address
};

export interface DrawResult {
  drawId: string;
  winningNumbers: number[];
  timestamp: number;
  totalPool: string;
  totalPoolFormatted: string;
  isCompleted: boolean;
  winners: WinnersByTier;
  prizes: PrizesByTier;
  totalTicketsSold: number;
  distributionPercentages: number[];
}

export interface WinnersByTier {
  tier1: string[]; // Jackpot winners
  tier2: string[]; // 5 numbers
  tier3: string[]; // 4 numbers
  tier4: string[]; // 3 numbers
  tier5: string[]; // 2 numbers
}

export interface PrizesByTier {
  tier1: string; // Individual prize amount
  tier2: string;
  tier3: string;
  tier4: string;
  tier5: string;
}

export interface WinnersStatistics {
  totalDraws: number;
  totalWinners: number;
  totalPrizesDistributed: string;
  biggestJackpot: string;
  mostRecentDraw: DrawResult | null;
  averageJackpot: string;
  topWinners: Array<{
    address: string;
    totalWon: string;
    winsCount: number;
  }>;
}

export interface Winner {
  address: string;
  drawId: string;
  tier: number;
  prize: string;
  prizeFormatted: string;
  timestamp: number;
  winningNumbers: number[];
  transactionHash?: string;
}

const getLotteryContractAddress = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? LOTTERY_CONTRACTS.mainnet : LOTTERY_CONTRACTS.testnet;
};

export const useRealWinnersData = () => {
  const { library, active } = useWeb3React<Web3>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [statistics, setStatistics] = useState<WinnersStatistics | null>(null);
  const [currentDrawId, setCurrentDrawId] = useState<string>('0');
  
  const contractAddress = getLotteryContractAddress();

  // Get contract instance
  const getLotteryContract = useCallback(() => {
    if (!library || !active) return null;
    
    try {
      return new library.eth.Contract(LOTTERY_ABI, contractAddress);
    } catch (error) {
      console.error('Error creating lottery contract instance:', error);
      return null;
    }
  }, [library, active, contractAddress]);

  // Format USDT amount from wei
  const formatUSDTAmount = useCallback((amountWei: string): string => {
    if (!library) return '0.00';
    
    try {
      const amount = library.utils.fromWei(amountWei, 'ether');
      return parseFloat(amount).toFixed(2);
    } catch (error) {
      console.error('Error formatting USDT amount:', error);
      return '0.00';
    }
  }, [library]);

  // Get current draw ID
  const getCurrentDrawId = useCallback(async (): Promise<string> => {
    const contract = getLotteryContract();
    if (!contract) return '0';

    try {
      const drawId = await contract.methods.getCurrentDrawId().call();
      return drawId.toString();
    } catch (error) {
      console.error('Error getting current draw ID:', error);
      throw new Error('Failed to get current draw ID');
    }
  }, [getLotteryContract]);

  // Get draw result
  const getDrawResult = useCallback(async (drawId: string): Promise<DrawResult | null> => {
    const contract = getLotteryContract();
    if (!contract || !library) return null;

    try {
      // Get basic draw data
      const drawData = await contract.methods.getDrawResult(drawId).call();
      
      if (!drawData.isCompleted) {
        return null; // Draw not completed yet
      }

      // Get winners, prizes, and ticket sales in parallel
      const [winnersData, prizesData, ticketsSold] = await Promise.all([
        contract.methods.getDrawWinners(drawId).call(),
        contract.methods.getDrawPrizes(drawId).call(),
        contract.methods.getTotalTicketsSold(drawId).call()
      ]);

      const winningNumbers = drawData.winningNumbers.map((num: any) => parseInt(num.toString()));
      const totalPoolFormatted = formatUSDTAmount(drawData.totalPool);

      const result: DrawResult = {
        drawId,
        winningNumbers,
        timestamp: parseInt(drawData.timestamp.toString()),
        totalPool: drawData.totalPool.toString(),
        totalPoolFormatted,
        isCompleted: drawData.isCompleted,
        winners: {
          tier1: winnersData.tier1Winners || [],
          tier2: winnersData.tier2Winners || [],
          tier3: winnersData.tier3Winners || [],
          tier4: winnersData.tier4Winners || [],
          tier5: winnersData.tier5Winners || []
        },
        prizes: {
          tier1: formatUSDTAmount(prizesData.tier1Prize),
          tier2: formatUSDTAmount(prizesData.tier2Prize),
          tier3: formatUSDTAmount(prizesData.tier3Prize),
          tier4: formatUSDTAmount(prizesData.tier4Prize),
          tier5: formatUSDTAmount(prizesData.tier5Prize)
        },
        totalTicketsSold: parseInt(ticketsSold.toString()),
        distributionPercentages: [50, 20, 15, 10, 5] // Example distribution
      };

      return result;
    } catch (error) {
      console.error(`Error getting draw result for draw ${drawId}:`, error);
      return null;
    }
  }, [getLotteryContract, library, formatUSDTAmount]);

  // Get historical draw results
  const getHistoricalDraws = useCallback(async (maxDraws = 10): Promise<DrawResult[]> => {
    const contract = getLotteryContract();
    if (!contract) return [];

    try {
      const currentId = await getCurrentDrawId();
      const currentIdNumber = parseInt(currentId);
      
      if (currentIdNumber === 0) return [];

      const drawPromises: Promise<DrawResult | null>[] = [];
      
      // Get the last maxDraws completed draws
      for (let i = Math.max(1, currentIdNumber - maxDraws + 1); i <= currentIdNumber; i++) {
        drawPromises.push(getDrawResult(i.toString()));
      }

      const results = await Promise.all(drawPromises);
      
      // Filter out null results and sort by draw ID (newest first)
      return results
        .filter((result): result is DrawResult => result !== null)
        .sort((a, b) => parseInt(b.drawId) - parseInt(a.drawId));
        
    } catch (error) {
      console.error('Error getting historical draws:', error);
      throw new Error('Failed to load historical draws');
    }
  }, [getLotteryContract, getCurrentDrawId, getDrawResult]);

  // Get individual winners list
  const getWinnersList = useCallback((draws: DrawResult[]): Winner[] => {
    const allWinners: Winner[] = [];

    draws.forEach(draw => {
      // Process each tier
      Object.entries(draw.winners).forEach(([tierKey, addresses]) => {
        const tierNumber = parseInt(tierKey.replace('tier', ''));
        const tierPrize = draw.prizes[tierKey as keyof PrizesByTier];

        addresses.forEach(address => {
          allWinners.push({
            address,
            drawId: draw.drawId,
            tier: tierNumber,
            prize: tierPrize,
            prizeFormatted: tierPrize,
            timestamp: draw.timestamp,
            winningNumbers: draw.winningNumbers
          });
        });
      });
    });

    // Sort by timestamp (newest first)
    return allWinners.sort((a, b) => b.timestamp - a.timestamp);
  }, []);

  // Calculate statistics
  const calculateStatistics = useCallback((draws: DrawResult[], winnersList: Winner[]): WinnersStatistics => {
    if (draws.length === 0) {
      return {
        totalDraws: 0,
        totalWinners: 0,
        totalPrizesDistributed: '0.00',
        biggestJackpot: '0.00',
        mostRecentDraw: null,
        averageJackpot: '0.00',
        topWinners: []
      };
    }

    const totalPrizesDistributed = winnersList.reduce((sum, winner) => {
      return sum + parseFloat(winner.prize);
    }, 0);

    const jackpots = draws
      .filter(draw => draw.winners.tier1.length > 0)
      .map(draw => parseFloat(draw.prizes.tier1));
    
    const biggestJackpot = jackpots.length > 0 ? Math.max(...jackpots) : 0;
    const averageJackpot = jackpots.length > 0 
      ? jackpots.reduce((sum, prize) => sum + prize, 0) / jackpots.length 
      : 0;

    // Calculate top winners
    const winnerTotals = new Map<string, { totalWon: number; winsCount: number }>();
    
    winnersList.forEach(winner => {
      const current = winnerTotals.get(winner.address) || { totalWon: 0, winsCount: 0 };
      winnerTotals.set(winner.address, {
        totalWon: current.totalWon + parseFloat(winner.prize),
        winsCount: current.winsCount + 1
      });
    });

    const topWinners = Array.from(winnerTotals.entries())
      .map(([address, data]) => ({
        address,
        totalWon: data.totalWon.toFixed(2),
        winsCount: data.winsCount
      }))
      .sort((a, b) => parseFloat(b.totalWon) - parseFloat(a.totalWon))
      .slice(0, 10);

    return {
      totalDraws: draws.length,
      totalWinners: winnersList.length,
      totalPrizesDistributed: totalPrizesDistributed.toFixed(2),
      biggestJackpot: biggestJackpot.toFixed(2),
      mostRecentDraw: draws[0] || null,
      averageJackpot: averageJackpot.toFixed(2),
      topWinners
    };
  }, []);

  // Load all winners data
  const loadWinnersData = useCallback(async (maxDraws = 20) => {
    if (!active || !library) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading real winners data from blockchain...');
      
      // Get current draw ID
      const currentId = await getCurrentDrawId();
      setCurrentDrawId(currentId);

      // Get historical draws
      const historicalDraws = await getHistoricalDraws(maxDraws);
      setDrawResults(historicalDraws);

      // Extract winners list
      const winnersList = getWinnersList(historicalDraws);
      setWinners(winnersList);

      // Calculate statistics
      const stats = calculateStatistics(historicalDraws, winnersList);
      setStatistics(stats);

      console.log('✅ Winners data loaded successfully:', {
        totalDraws: historicalDraws.length,
        totalWinners: winnersList.length,
        currentDrawId: currentId
      });

    } catch (err: any) {
      console.error('❌ Error loading winners data:', err);
      setError(err.message || 'Failed to load winners data');
    } finally {
      setLoading(false);
    }
  }, [active, library, getCurrentDrawId, getHistoricalDraws, getWinnersList, calculateStatistics]);

  // Get winners by draw ID
  const getWinnersByDraw = useCallback((drawId: string): Winner[] => {
    return winners.filter(winner => winner.drawId === drawId);
  }, [winners]);

  // Get specific draw result
  const getDrawById = useCallback((drawId: string): DrawResult | null => {
    return drawResults.find(draw => draw.drawId === drawId) || null;
  }, [drawResults]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadWinnersData();
  }, [loadWinnersData]);

  // Load data on mount and when wallet connects
  useEffect(() => {
    if (active && library) {
      loadWinnersData();
    } else {
      // Reset data when wallet disconnects
      setDrawResults([]);
      setWinners([]);
      setStatistics(null);
      setCurrentDrawId('0');
      setError(null);
    }
  }, [active, library, loadWinnersData]);

  return {
    // Data
    drawResults,
    winners,
    statistics,
    currentDrawId,
    
    // State
    loading,
    error,
    
    // Actions
    loadWinnersData,
    refreshData,
    
    // Utilities
    getWinnersByDraw,
    getDrawById,
    getDrawResult,
    
    // Contract info
    contractAddress,
    formatUSDTAmount
  };
};

export default useRealWinnersData;