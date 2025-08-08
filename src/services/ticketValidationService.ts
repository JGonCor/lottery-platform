/**
 * Ticket Validation Service
 * Handles precise number storage, validation, and prize calculation for lottery tickets
 */

import { ethers } from 'ethers';

export interface TicketNumbers {
  numbers: number[];
  isValid: boolean;
  errors: string[];
}

export interface PrizeValidation {
  isWinner: boolean;
  matchCount: number;
  exactMatches: number[];
  prizeAmount: string;
  tier: number;
  validationDetails: {
    ticketNumbers: number[];
    winningNumbers: number[];
    matchedPositions: boolean[];
    requiresExactOrder: boolean;
  };
}

export interface TicketStorage {
  ticketId: string;
  ownerAddress: string;
  numbers: number[];
  purchaseTimestamp: number;
  drawId: number;
  transactionHash: string;
  pricepaid: string;
  discountApplied: number;
  referrerAddress?: string;
}

class TicketValidationService {
  private readonly MIN_NUMBER = 1;
  private readonly MAX_NUMBER = 49;
  private readonly NUMBERS_PER_TICKET = 6;
  private readonly STORAGE_KEY = 'lottery_tickets';

  /**
   * Validate ticket numbers according to lottery rules
   */
  validateTicketNumbers(numbers: number[]): TicketNumbers {
    const validation: TicketNumbers = {
      numbers: [...numbers],
      isValid: false,
      errors: []
    };

    // Check array length
    if (numbers.length !== this.NUMBERS_PER_TICKET) {
      validation.errors.push(`Must select exactly ${this.NUMBERS_PER_TICKET} numbers`);
      return validation;
    }

    // Check each number is within valid range
    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      
      if (!Number.isInteger(num)) {
        validation.errors.push(`Number at position ${i + 1} must be an integer`);
        continue;
      }

      if (num < this.MIN_NUMBER || num > this.MAX_NUMBER) {
        validation.errors.push(`Number ${num} must be between ${this.MIN_NUMBER} and ${this.MAX_NUMBER}`);
      }
    }

    // Check for duplicates
    const uniqueNumbers = [...new Set(numbers)];
    if (uniqueNumbers.length !== numbers.length) {
      validation.errors.push('All numbers must be unique (no duplicates allowed)');
    }

    // Sort numbers for consistency (lottery uses sorted order)
    validation.numbers = [...numbers].sort((a, b) => a - b);
    validation.isValid = validation.errors.length === 0;

    return validation;
  }

  /**
   * Store ticket data securely in localStorage with validation
   */
  storeTicket(ticketData: TicketStorage): boolean {
    try {
      // Validate ticket data before storing
      const numberValidation = this.validateTicketNumbers(ticketData.numbers);
      if (!numberValidation.isValid) {
        console.error('Cannot store invalid ticket:', numberValidation.errors);
        return false;
      }

      // Validate required fields
      if (!ticketData.ownerAddress || !ethers.utils.isAddress(ticketData.ownerAddress)) {
        console.error('Invalid owner address');
        return false;
      }

      if (!ticketData.ticketId || ticketData.ticketId.trim() === '') {
        console.error('Invalid ticket ID');
        return false;
      }

      // Get existing tickets
      const existingTickets = this.getStoredTickets();
      
      // Check for duplicate ticket ID
      if (existingTickets.some(ticket => ticket.ticketId === ticketData.ticketId)) {
        console.error('Ticket ID already exists');
        return false;
      }

      // Add timestamp if not provided
      if (!ticketData.purchaseTimestamp) {
        ticketData.purchaseTimestamp = Date.now();
      }

      // Store sorted numbers for consistency
      ticketData.numbers = numberValidation.numbers;

      // Add to existing tickets
      existingTickets.push(ticketData);

      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingTickets));
      
      return true;
    } catch (error) {
      console.error('Error storing ticket:', error);
      return false;
    }
  }

  /**
   * Retrieve all stored tickets for a user
   */
  getUserTickets(userAddress: string): TicketStorage[] {
    try {
      const allTickets = this.getStoredTickets();
      return allTickets.filter(ticket => 
        ticket.ownerAddress.toLowerCase() === userAddress.toLowerCase()
      );
    } catch (error) {
      console.error('Error retrieving user tickets:', error);
      return [];
    }
  }

  /**
   * Get all stored tickets
   */
  private getStoredTickets(): TicketStorage[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading stored tickets:', error);
      return [];
    }
  }

  /**
   * Validate prize for a ticket against winning numbers (EXACT ORDER matching like PancakeSwap)
   */
  validatePrizeExactOrder(ticketNumbers: number[], winningNumbers: number[]): PrizeValidation {
    const validation: PrizeValidation = {
      isWinner: false,
      matchCount: 0,
      exactMatches: [],
      prizeAmount: '0',
      tier: 0,
      validationDetails: {
        ticketNumbers: [...ticketNumbers].sort((a, b) => a - b),
        winningNumbers: [...winningNumbers].sort((a, b) => a - b),
        matchedPositions: new Array(6).fill(false),
        requiresExactOrder: true
      }
    };

    // Ensure both arrays are sorted for comparison
    const sortedTicket = [...ticketNumbers].sort((a, b) => a - b);
    const sortedWinning = [...winningNumbers].sort((a, b) => a - b);

    // Count exact matches in sorted order
    let matches = 0;
    const exactMatches: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      if (sortedTicket[i] === sortedWinning[i]) {
        matches++;
        exactMatches.push(sortedTicket[i]);
        validation.validationDetails.matchedPositions[i] = true;
      }
    }

    validation.matchCount = matches;
    validation.exactMatches = exactMatches;

    // Determine if winner based on match count (minimum 2 matches for any prize)
    if (matches >= 2) {
      validation.isWinner = true;
      validation.tier = matches;
    }

    return validation;
  }

  /**
   * Validate prize with any-order matching (alternative method)
   */
  validatePrizeAnyOrder(ticketNumbers: number[], winningNumbers: number[]): PrizeValidation {
    const validation: PrizeValidation = {
      isWinner: false,
      matchCount: 0,
      exactMatches: [],
      prizeAmount: '0',
      tier: 0,
      validationDetails: {
        ticketNumbers: [...ticketNumbers],
        winningNumbers: [...winningNumbers],
        matchedPositions: new Array(6).fill(false),
        requiresExactOrder: false
      }
    };

    // Count matches in any order
    const matchedNumbers: number[] = [];
    const winningSet = new Set(winningNumbers);
    
    ticketNumbers.forEach((number, index) => {
      if (winningSet.has(number)) {
        matchedNumbers.push(number);
        validation.validationDetails.matchedPositions[index] = true;
      }
    });

    validation.matchCount = matchedNumbers.length;
    validation.exactMatches = matchedNumbers;

    // Determine if winner
    if (matchedNumbers.length >= 2) {
      validation.isWinner = true;
      validation.tier = matchedNumbers.length;
    }

    return validation;
  }

  /**
   * Calculate prize amount based on tier and pool distribution
   */
  calculatePrizeAmount(tier: number, totalPool: string, winnerCount: number): string {
    const pool = parseFloat(totalPool);
    
    // Prize distribution percentages (as per contract)
    const prizePercentages = {
      6: 40, // 40% for 6 matches (jackpot)
      5: 20, // 20% for 5 matches
      4: 15, // 15% for 4 matches
      3: 10, // 10% for 3 matches
      2: 5   // 5% for 2 matches
    };

    const percentage = prizePercentages[tier as keyof typeof prizePercentages] || 0;
    const tierPrize = (pool * percentage) / 100;
    const prizePerWinner = winnerCount > 0 ? tierPrize / winnerCount : 0;

    return prizePerWinner.toFixed(6);
  }

  /**
   * Generate unique ticket ID
   */
  generateTicketId(userAddress: string, numbers: number[], timestamp: number): string {
    const numbersString = numbers.sort((a, b) => a - b).join('-');
    const dataString = `${userAddress}-${numbersString}-${timestamp}`;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataString)).slice(0, 16);
  }

  /**
   * Validate ticket against blockchain data
   */
  async validateTicketOnChain(
    ticketId: string, 
    contractInstance: ethers.Contract
  ): Promise<{
    isValid: boolean;
    onChainData: any;
    localData: TicketStorage | null;
    discrepancies: string[];
  }> {
    const validation = {
      isValid: false,
      onChainData: null,
      localData: null,
      discrepancies: [] as string[]
    };

    try {
      // Get local ticket data
      const allTickets = this.getStoredTickets();
      const localTicket = allTickets.find(t => t.ticketId === ticketId);
      
      if (!localTicket) {
        validation.discrepancies.push('Ticket not found in local storage');
        return validation;
      }

      validation.localData = localTicket;

      // Get on-chain ticket data (this would require the actual ticket ID from contract)
      // For now, we'll simulate this check
      try {
        const onChainTicket = await contractInstance.getTicket(ticketId);
        validation.onChainData = onChainTicket;

        // Compare local vs on-chain data
        if (onChainTicket.owner.toLowerCase() !== localTicket.ownerAddress.toLowerCase()) {
          validation.discrepancies.push('Owner address mismatch');
        }

        // Compare numbers (would need to unpack from contract)
        // This is a simplified comparison
        const onChainNumbers = onChainTicket.numbers; // Assuming unpacked
        if (JSON.stringify(onChainNumbers.sort()) !== JSON.stringify(localTicket.numbers.sort())) {
          validation.discrepancies.push('Numbers mismatch');
        }

        validation.isValid = validation.discrepancies.length === 0;

      } catch (contractError) {
        validation.discrepancies.push('Ticket not found on blockchain');
      }

    } catch (error) {
      validation.discrepancies.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Clean up old tickets (older than 90 days)
   */
  cleanupOldTickets(): number {
    try {
      const allTickets = this.getStoredTickets();
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      const activeTickets = allTickets.filter(ticket => 
        ticket.purchaseTimestamp > cutoffTime
      );

      const removedCount = allTickets.length - activeTickets.length;
      
      if (removedCount > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeTickets));
      }

      return removedCount;
    } catch (error) {
      console.error('Error cleaning up old tickets:', error);
      return 0;
    }
  }

  /**
   * Export tickets for backup
   */
  exportTickets(userAddress: string): string {
    const userTickets = this.getUserTickets(userAddress);
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      userAddress,
      ticketCount: userTickets.length,
      tickets: userTickets
    }, null, 2);
  }

  /**
   * Import tickets from backup
   */
  importTickets(backupData: string): {
    success: boolean;
    importedCount: number;
    errors: string[];
  } {
    const result = {
      success: false,
      importedCount: 0,
      errors: [] as string[]
    };

    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.tickets || !Array.isArray(backup.tickets)) {
        result.errors.push('Invalid backup format');
        return result;
      }

      let imported = 0;
      
      for (const ticket of backup.tickets) {
        if (this.storeTicket(ticket)) {
          imported++;
        } else {
          result.errors.push(`Failed to import ticket ${ticket.ticketId}`);
        }
      }

      result.importedCount = imported;
      result.success = imported > 0;

    } catch (error) {
      result.errors.push(`Import error: ${error.message}`);
    }

    return result;
  }

  /**
   * Get ticket statistics for a user
   */
  getUserTicketStats(userAddress: string): {
    totalTickets: number;
    totalSpent: string;
    averageDiscount: number;
    ticketsByDraw: { [drawId: number]: number };
    monthlyPurchases: { month: string; tickets: number; spent: string }[];
  } {
    const tickets = this.getUserTickets(userAddress);
    
    const totalSpent = tickets.reduce((sum, ticket) => sum + parseFloat(ticket.pricepaid), 0);
    const totalDiscounts = tickets.reduce((sum, ticket) => sum + ticket.discountApplied, 0);
    const averageDiscount = tickets.length > 0 ? totalDiscounts / tickets.length : 0;

    // Group by draw
    const ticketsByDraw: { [drawId: number]: number } = {};
    tickets.forEach(ticket => {
      ticketsByDraw[ticket.drawId] = (ticketsByDraw[ticket.drawId] || 0) + 1;
    });

    // Monthly stats
    const monthlyStats: { [month: string]: { tickets: number; spent: number } } = {};
    tickets.forEach(ticket => {
      const date = new Date(ticket.purchaseTimestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { tickets: 0, spent: 0 };
      }
      
      monthlyStats[monthKey].tickets++;
      monthlyStats[monthKey].spent += parseFloat(ticket.pricepaid);
    });

    const monthlyPurchases = Object.keys(monthlyStats).map(month => ({
      month,
      tickets: monthlyStats[month].tickets,
      spent: monthlyStats[month].spent.toFixed(2)
    }));

    return {
      totalTickets: tickets.length,
      totalSpent: totalSpent.toFixed(2),
      averageDiscount,
      ticketsByDraw,
      monthlyPurchases
    };
  }
}

// Export singleton instance
export const ticketValidationService = new TicketValidationService();
export default ticketValidationService;