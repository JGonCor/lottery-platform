/**
 * Blockchain Data Service
 * Fetches real lottery data from the blockchain contracts
 */

import { ethers } from 'ethers';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';
import { config, getContractAddress } from '../config/environment';

// Las direcciones y RPC se toman del environment centralizado (.env)

export interface DrawData {
  drawId: number;
  winningNumbers: number[];
  timestamp: number;
  totalPoolAmount: string;
  accumulatedJackpot: string;
  isCompleted: boolean;
}

export interface WinnerData {
  address: string;
  ticketId: number;
  matchCount: number;
  prizeAmount: string;
  claimed: boolean;
  drawId: number;
}

export interface TierInfo {
  tier: number;
  matchCount: number;
  totalPrize: string;
  prizePerWinner: string;
  winnerCount: number;
  winners: string[];
}

export interface LotteryStats {
  totalTicketsSold: number;
  totalDrawsCompleted: number;
  currentPoolAmount: string;
  accumulatedJackpot: string;
  contractBalance: string;
  totalPrizesDistributed: string;
}

export interface TicketData {
  ticketId: number;
  owner: string;
  numbers: number[];
  drawId: number;
  matchCount: number;
  claimed: boolean;
  prizeAmount: string;
}

class BlockchainDataService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private isTestnet: boolean;

  constructor(isTestnet: boolean = false) { // Solo mainnet
    this.isTestnet = isTestnet;
    const rpcUrl = process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
    const contractAddress = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, MultiTierLotteryABI as any, this.provider);
  }

  /**
   * Get the latest completed draw data
   */
  async getLatestDraw(): Promise<DrawData | null> {
    try {
      const latestDraw = await this.contract.getLatestDraw();
      
      if (!latestDraw || latestDraw.drawId === 0) {
        return null;
      }

      return {
        drawId: Number(latestDraw.drawId ?? latestDraw.drawId_ ?? 0),
        winningNumbers: Array.isArray(latestDraw.winningNumbers)
          ? latestDraw.winningNumbers.map((n: any) => Number(n))
          : this.unpackNumbers(latestDraw.packedWinningNumbers ?? 0),
        timestamp: Number(latestDraw.timestamp ?? 0),
        totalPoolAmount: ethers.formatUnits(latestDraw.totalPoolAmount ?? 0, 18),
        accumulatedJackpot: ethers.formatUnits(latestDraw.accumulatedJackpot ?? 0, 18),
        isCompleted: true
      };
    } catch (error) {
      console.error('Error fetching latest draw:', error);
      return null;
    }
  }

  /**
   * Get specific draw data by ID
   */
  async getDraw(drawId: number): Promise<DrawData | null> {
    try {
      const draw = await this.contract.getDraw(drawId);
      
      return {
        drawId: Number(draw.drawId ?? draw.drawId_ ?? 0),
        winningNumbers: Array.isArray(draw.winningNumbers) ? draw.winningNumbers.map((n: any) => Number(n)) : [],
        timestamp: Number(draw.timestamp ?? 0),
        totalPoolAmount: ethers.formatUnits(draw.totalPoolAmount ?? 0, 18),
        accumulatedJackpot: ethers.formatUnits(draw.accumulatedJackpot ?? 0, 18),
        isCompleted: true
      };
    } catch (error) {
      console.error(`Error fetching draw ${drawId}:`, error);
      return null;
    }
  }

  /**
   * Get winners for a specific draw and tier
   */
  async getWinnersByTier(drawId: number, matchCount: number): Promise<string[]> {
    try {
      return await this.contract.getWinnersByTier(drawId, matchCount);
    } catch (error) {
      console.error(`Error fetching winners for draw ${drawId}, tier ${matchCount}:`, error);
      return [];
    }
  }

  /**
   * Get prize amount for a specific tier in a draw
   */
  async getTierPrize(drawId: number, matchCount: number): Promise<string> {
    try {
      const prize = await this.contract.getTierPrize(drawId, matchCount);
      return ethers.formatUnits(prize ?? 0, 18);
    } catch (error) {
      console.error(`Error fetching tier prize for draw ${drawId}, tier ${matchCount}:`, error);
      return '0';
    }
  }

  /**
   * Get complete prize distribution for a draw
   */
  async getPrizeDistribution(drawId: number): Promise<TierInfo[]> {
    const tiers: TierInfo[] = [];
    
    // Check all tiers (2-6 matches)
    for (let matchCount = 2; matchCount <= 6; matchCount++) {
      try {
        const winners = await this.getWinnersByTier(drawId, matchCount);
        const totalPrize = await this.getTierPrize(drawId, matchCount);
        const prizePerWinner = winners.length > 0 
          ? (parseFloat(totalPrize) / winners.length).toFixed(6)
          : '0';

        tiers.push({
          tier: matchCount,
          matchCount,
          totalPrize,
          prizePerWinner,
          winnerCount: winners.length,
          winners
        });
      } catch (error) {
        console.error(`Error fetching tier ${matchCount} for draw ${drawId}:`, error);
      }
    }

    return tiers;
  }

  /**
   * Get lottery statistics
   */
  async getLotteryStatistics(): Promise<LotteryStats> {
    try {
      const stats = await this.contract.getLotteryStatistics();
      
      return {
        totalTicketsSold: Number(stats.totalTickets ?? 0),
        totalDrawsCompleted: Number(stats.totalDraws ?? 0),
        currentPoolAmount: ethers.formatUnits(stats.currentPoolAmount ?? 0, 18),
        accumulatedJackpot: ethers.formatUnits(stats.accumulatedJackpot ?? 0, 18),
        contractBalance: ethers.formatUnits(stats.contractBalance ?? 0, 18),
        totalPrizesDistributed: this.calculateTotalPrizesDistributed(stats)
      };
    } catch (error) {
      console.error('Error fetching lottery statistics:', error);
      return {
        totalTicketsSold: 0,
        totalDrawsCompleted: 0,
        currentPoolAmount: '0',
        accumulatedJackpot: '0',
        contractBalance: '0',
        totalPrizesDistributed: '0'
      };
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userAddress: string): Promise<TicketData[]> {
    try {
      const ticketIds = await this.contract.getPlayerTickets(userAddress);
      const tickets: TicketData[] = [];

      for (const ticketId of ticketIds) {
        try {
          const ticket = await this.contract.getTicket(ticketId);
          
          tickets.push({
            ticketId: ticketId.toNumber(),
            owner: ticket.owner,
            numbers: ticket.numbers,
            drawId: ticket.drawId,
            matchCount: ticket.matchCount,
            claimed: ticket.claimed,
            prizeAmount: ticket.matchCount >= 2 ? await this.calculateTicketPrize(ticketId, ticket.matchCount, ticket.drawId) : '0'
          });
        } catch (error) {
          console.error(`Error fetching ticket ${ticketId}:`, error);
        }
      }

      return tickets;
    } catch (error) {
      console.error(`Error fetching tickets for user ${userAddress}:`, error);
      return [];
    }
  }

  /**
   * Calculate prize for a specific ticket
   */
  private async calculateTicketPrize(ticketId: number, matchCount: number, drawId: number): Promise<string> {
    if (matchCount < 2) return '0';

    try {
      const totalPrize = await this.getTierPrize(drawId, matchCount);
      const winners = await this.getWinnersByTier(drawId, matchCount);
      
      if (winners.length === 0) return '0';
      
      const prizePerWinner = parseFloat(totalPrize) / winners.length;
      return prizePerWinner.toFixed(6);
    } catch (error) {
      console.error(`Error calculating prize for ticket ${ticketId}:`, error);
      return '0';
    }
  }

  /**
   * Get historical draws (last N draws)
   */
  async getHistoricalDraws(count: number = 10): Promise<DrawData[]> {
    try {
      const stats = await this.getLotteryStatistics();
      const totalDraws = stats.totalDrawsCompleted;
      const draws: DrawData[] = [];

      const startDrawId = Math.max(0, totalDraws - count);
      
      for (let i = totalDraws - 1; i >= startDrawId; i--) {
        const draw = await this.getDraw(i);
        if (draw) {
          draws.push(draw);
        }
      }

      return draws;
    } catch (error) {
      console.error('Error fetching historical draws:', error);
      return [];
    }
  }

  /**
   * Get current lottery state
   */
  async getLotteryState(): Promise<{
    state: 'OPEN' | 'CALCULATING';
    timeUntilNextDraw: number;
    currentPool: string;
    ticketPrice: string;
  }> {
    try {
      const [state, timeLeft, pool, price] = await Promise.all([
        this.contract.getLotteryState(),
        this.contract.getTimeUntilNextDraw(),
        this.contract.getCurrentPool(),
        this.contract.getTicketPrice()
      ]);

      return {
        state: Number(state) === 0 ? 'OPEN' : 'CALCULATING',
        timeUntilNextDraw: Number(timeLeft ?? 0),
        currentPool: ethers.formatUnits(pool ?? 0, 18),
        ticketPrice: ethers.formatUnits(price ?? 0, 18)
      };
    } catch (error) {
      console.error('Error fetching lottery state:', error);
      return {
        state: 'OPEN',
        timeUntilNextDraw: 0,
        currentPool: '0',
        ticketPrice: '5'
      };
    }
  }

  /**
   * Monitor for new draws using events
   */
  async subscribeToDrawEvents(
    onNewDraw: (drawData: DrawData) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // Listen for LotteryDrawCompleted events
      this.contract.on('LotteryDrawCompleted', async (drawId, winningNumbers, accumulatedJackpot, event) => {
        try {
          const draw = await this.getDraw(drawId.toNumber());
          if (draw) {
            onNewDraw(draw);
          }
        } catch (error) {
          onError(new Error(`Error processing new draw event: ${error.message}`));
        }
      });
    } catch (error) {
      onError(new Error(`Error subscribing to draw events: ${error.message}`));
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents(): void {
    this.contract.removeAllListeners();
  }

  /**
   * Helper function to unpack numbers from packed format
   */
  private unpackNumbers(packed: any): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < 6; i++) {
      const number = (packed >> (i * 8)) & 0xFF;
      numbers.push(number);
    }
    return numbers;
  }

  /**
   * Helper function to calculate total prizes distributed
   */
  private calculateTotalPrizesDistributed(stats: any): string {
    // This would need to be calculated based on historical data
    // For now, we'll return a placeholder calculation
    const totalPool = parseFloat(ethers.formatUnits(stats.currentPoolAmount ?? 0, 18));
    const estimatedDistributed = totalPool * Number(stats.totalDraws ?? 0) * 0.9; // 90% estimado
    return estimatedDistributed.toFixed(2);
  }

  /**
   * Validate if a draw is legitimate by checking blockchain data
   */
  async validateDraw(drawId: number): Promise<{
    isValid: boolean;
    errors: string[];
    blockchainData: any;
  }> {
    const validation = {
      isValid: false,
      errors: [] as string[],
      blockchainData: null as any
    };

    try {
      // Get draw data from contract
      const draw = await this.getDraw(drawId);
      if (!draw) {
        validation.errors.push('Draw not found on blockchain');
        return validation;
      }

      // Validate winning numbers are within range (1-49)
      for (const number of draw.winningNumbers) {
        if (number < 1 || number > 49) {
          validation.errors.push(`Invalid winning number: ${number}`);
        }
      }

      // Check for duplicate numbers
      const uniqueNumbers = [...new Set(draw.winningNumbers)];
      if (uniqueNumbers.length !== 6) {
        validation.errors.push('Duplicate winning numbers detected');
      }

      // Get transaction details from blockchain
      const filter = this.contract.filters.LotteryDrawCompleted(drawId);
      const events = await this.contract.queryFilter(filter);
      
      if (events.length === 0) {
        validation.errors.push('No draw completion event found');
      } else {
        validation.blockchainData = {
          transactionHash: events[0].transactionHash,
          blockNumber: events[0].blockNumber,
          timestamp: (await this.provider.getBlock(events[0].blockNumber)).timestamp
        };
      }

      validation.isValid = validation.errors.length === 0;

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }
}

// Export singleton instances for testnet and mainnet
// Singleton que elige red según environment (prod=>mainnet, dev=>testnet)
export const dataService = new BlockchainDataService();
export default dataService;