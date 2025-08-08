import { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';

export interface LotteryTicket {
  id: string;
  numbers: number[];
  drawId: string;
  purchaseTime: number;
  transactionHash?: string;
  status: 'draft' | 'pending' | 'confirmed' | 'winning' | 'losing';
  isQuickPick: boolean;
  cost: string; // USDT amount
  matches?: number; // Number of matches with winning numbers
  prize?: string; // Prize amount if winning
}

export interface MatchResult {
  ticket: LotteryTicket;
  matches: number[];
  matchCount: number;
  prize: string;
  tier: number;
}

export interface TicketValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Lottery configuration
const LOTTERY_CONFIG = {
  numbersPerTicket: 6,
  minNumber: 1,
  maxNumber: 49,
  ticketCost: '2.00', // USDT
  maxTicketsPerPurchase: 10
};

// Storage keys
const TICKETS_STORAGE_KEY = 'lottery_tickets';
const DRAFT_TICKETS_KEY = 'lottery_draft_tickets';

export const useLotteryTickets = () => {
  const { account, active } = useWeb3React();
  
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [draftTickets, setDraftTickets] = useState<LotteryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique ticket ID
  const generateTicketId = useCallback((): string => {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Generate random numbers for Quick Pick
  const generateQuickPickNumbers = useCallback((): number[] => {
    const numbers: number[] = [];
    const { minNumber, maxNumber, numbersPerTicket } = LOTTERY_CONFIG;
    
    while (numbers.length < numbersPerTicket) {
      const randomNumber = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
      if (!numbers.includes(randomNumber)) {
        numbers.push(randomNumber);
      }
    }
    
    return numbers.sort((a, b) => a - b);
  }, []);

  // Validate ticket numbers
  const validateTicket = useCallback((numbers: number[]): TicketValidation => {
    const result: TicketValidation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const { minNumber, maxNumber, numbersPerTicket } = LOTTERY_CONFIG;

    // Check number count
    if (numbers.length !== numbersPerTicket) {
      result.errors.push(`Debes seleccionar exactamente ${numbersPerTicket} números`);
      result.isValid = false;
    }

    // Check for duplicates
    const uniqueNumbers = [...new Set(numbers)];
    if (uniqueNumbers.length !== numbers.length) {
      result.errors.push('No puedes seleccionar números duplicados');
      result.isValid = false;
    }

    // Check number range
    const invalidNumbers = numbers.filter(num => num < minNumber || num > maxNumber);
    if (invalidNumbers.length > 0) {
      result.errors.push(`Los números deben estar entre ${minNumber} y ${maxNumber}`);
      result.isValid = false;
    }

    // Check for common patterns (warnings only)
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    
    // Consecutive numbers warning
    let consecutiveCount = 1;
    let maxConsecutive = 1;
    for (let i = 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] === sortedNumbers[i - 1] + 1) {
        consecutiveCount++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      } else {
        consecutiveCount = 1;
      }
    }
    
    if (maxConsecutive >= 4) {
      result.warnings.push('Tienes muchos números consecutivos. Considera variar tu selección.');
    }

    // All even or all odd warning
    const evenCount = numbers.filter(num => num % 2 === 0).length;
    if (evenCount === 0) {
      result.warnings.push('Todos tus números son impares. Considera incluir algunos pares.');
    } else if (evenCount === numbers.length) {
      result.warnings.push('Todos tus números son pares. Considera incluir algunos impares.');
    }

    // High/low distribution warning
    const midPoint = Math.floor((minNumber + maxNumber) / 2);
    const lowNumbers = numbers.filter(num => num <= midPoint).length;
    if (lowNumbers <= 1) {
      result.warnings.push('La mayoría de tus números están en el rango alto. Considera balancear con números bajos.');
    } else if (lowNumbers >= numbersPerTicket - 1) {
      result.warnings.push('La mayoría de tus números están en el rango bajo. Considera balancear con números altos.');
    }

    return result;
  }, []);

  // Create new draft ticket
  const createDraftTicket = useCallback((numbers?: number[], isQuickPick = false): LotteryTicket => {
    const ticketNumbers = numbers || (isQuickPick ? generateQuickPickNumbers() : []);
    
    return {
      id: generateTicketId(),
      numbers: ticketNumbers,
      drawId: '', // Will be set when purchasing
      purchaseTime: Date.now(),
      status: 'draft',
      isQuickPick,
      cost: LOTTERY_CONFIG.ticketCost
    };
  }, [generateTicketId, generateQuickPickNumbers]);

  // Add draft ticket
  const addDraftTicket = useCallback((ticket?: LotteryTicket) => {
    const newTicket = ticket || createDraftTicket();
    setDraftTickets(prev => [...prev, newTicket]);
    return newTicket;
  }, [createDraftTicket]);

  // Update draft ticket
  const updateDraftTicket = useCallback((ticketId: string, updates: Partial<LotteryTicket>) => {
    setDraftTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, ...updates }
          : ticket
      )
    );
  }, []);

  // Remove draft ticket
  const removeDraftTicket = useCallback((ticketId: string) => {
    setDraftTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
  }, []);

  // Clear all draft tickets
  const clearDraftTickets = useCallback(() => {
    setDraftTickets([]);
  }, []);

  // Generate Quick Pick for existing draft ticket
  const generateQuickPickForTicket = useCallback((ticketId: string) => {
    const numbers = generateQuickPickNumbers();
    updateDraftTicket(ticketId, {
      numbers,
      isQuickPick: true
    });
  }, [generateQuickPickNumbers, updateDraftTicket]);

  // Update single number in ticket
  const updateTicketNumber = useCallback((ticketId: string, index: number, newNumber: number) => {
    setDraftTickets(prev => 
      prev.map(ticket => {
        if (ticket.id !== ticketId) return ticket;
        
        const newNumbers = [...ticket.numbers];
        newNumbers[index] = newNumber;
        
        return {
          ...ticket,
          numbers: newNumbers,
          isQuickPick: false // Manual edit, no longer quick pick
        };
      })
    );
  }, []);

  // Toggle number selection in ticket
  const toggleTicketNumber = useCallback((ticketId: string, number: number) => {
    setDraftTickets(prev => 
      prev.map(ticket => {
        if (ticket.id !== ticketId) return ticket;
        
        let newNumbers = [...ticket.numbers];
        const numberIndex = newNumbers.indexOf(number);
        
        if (numberIndex >= 0) {
          // Remove number
          newNumbers.splice(numberIndex, 1);
        } else {
          // Add number if not at limit
          if (newNumbers.length < LOTTERY_CONFIG.numbersPerTicket) {
            newNumbers.push(number);
            newNumbers.sort((a, b) => a - b);
          }
        }
        
        return {
          ...ticket,
          numbers: newNumbers,
          isQuickPick: false
        };
      })
    );
  }, []);

  // Check if ticket matches winning numbers
  const checkTicketMatches = useCallback((ticket: LotteryTicket, winningNumbers: number[]): MatchResult => {
    const matches = ticket.numbers.filter(num => winningNumbers.includes(num));
    const matchCount = matches.length;
    
    // Prize tiers (example structure)
    const prizeTiers = [
      { matches: 6, prize: '100000.00', tier: 1 }, // Jackpot
      { matches: 5, prize: '1000.00', tier: 2 },
      { matches: 4, prize: '100.00', tier: 3 },
      { matches: 3, prize: '10.00', tier: 4 },
      { matches: 2, prize: '2.00', tier: 5 }, // Free ticket
    ];
    
    const winningTier = prizeTiers.find(tier => tier.matches === matchCount);
    
    return {
      ticket,
      matches,
      matchCount,
      prize: winningTier?.prize || '0.00',
      tier: winningTier?.tier || 0
    };
  }, []);

  // Check all tickets against winning numbers
  const checkAllTickets = useCallback((winningNumbers: number[]) => {
    const results = tickets.map(ticket => checkTicketMatches(ticket, winningNumbers));
    
    // Update ticket statuses
    setTickets(prev => 
      prev.map(ticket => {
        const result = results.find(r => r.ticket.id === ticket.id);
        if (result && result.matchCount > 0) {
          return {
            ...ticket,
            status: 'winning' as const,
            matches: result.matchCount,
            prize: result.prize
          };
        } else {
          return {
            ...ticket,
            status: 'losing' as const,
            matches: 0
          };
        }
      })
    );
    
    return results.filter(r => r.matchCount > 0);
  }, [tickets, checkTicketMatches]);

  // Calculate total cost of draft tickets
  const calculateTotalCost = useCallback(() => {
    const validTickets = draftTickets.filter(ticket => 
      validateTicket(ticket.numbers).isValid
    );
    
    const totalCost = validTickets.length * parseFloat(LOTTERY_CONFIG.ticketCost);
    return {
      totalCost: totalCost.toFixed(2),
      validTickets: validTickets.length,
      totalTickets: draftTickets.length
    };
  }, [draftTickets, validateTicket]);

  // Get ticket statistics
  const getTicketStats = useCallback(() => {
    const totalTickets = tickets.length;
    const winningTickets = tickets.filter(t => t.status === 'winning').length;
    const totalPrizes = tickets
      .filter(t => t.prize)
      .reduce((sum, t) => sum + parseFloat(t.prize || '0'), 0);
    const totalSpent = tickets.reduce((sum, t) => sum + parseFloat(t.cost), 0);
    
    return {
      totalTickets,
      winningTickets,
      totalPrizes: totalPrizes.toFixed(2),
      totalSpent: totalSpent.toFixed(2),
      winRate: totalTickets > 0 ? (winningTickets / totalTickets * 100).toFixed(1) : '0.0'
    };
  }, [tickets]);

  // Load tickets from localStorage
  const loadTickets = useCallback(() => {
    if (!account) return;
    
    try {
      const storedTickets = localStorage.getItem(`${TICKETS_STORAGE_KEY}_${account}`);
      const storedDrafts = localStorage.getItem(`${DRAFT_TICKETS_KEY}_${account}`);
      
      if (storedTickets) {
        const parsedTickets = JSON.parse(storedTickets);
        setTickets(parsedTickets);
      }
      
      if (storedDrafts) {
        const parsedDrafts = JSON.parse(storedDrafts);
        setDraftTickets(parsedDrafts);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      setError('Error al cargar tickets guardados');
    }
  }, [account]);

  // Save tickets to localStorage
  const saveTickets = useCallback(() => {
    if (!account) return;
    
    try {
      localStorage.setItem(`${TICKETS_STORAGE_KEY}_${account}`, JSON.stringify(tickets));
      localStorage.setItem(`${DRAFT_TICKETS_KEY}_${account}`, JSON.stringify(draftTickets));
    } catch (error) {
      console.error('Error saving tickets:', error);
    }
  }, [account, tickets, draftTickets]);

  // Auto-save tickets when they change
  useEffect(() => {
    saveTickets();
  }, [saveTickets]);

  // Load tickets when account changes
  useEffect(() => {
    if (account && active) {
      loadTickets();
    } else {
      setTickets([]);
      setDraftTickets([]);
    }
  }, [account, active, loadTickets]);

  // Convert draft tickets to purchased tickets
  const confirmTicketPurchase = useCallback((drawId: string, transactionHash: string) => {
    const validDraftTickets = draftTickets.filter(ticket => 
      validateTicket(ticket.numbers).isValid
    );
    
    const confirmedTickets = validDraftTickets.map(draft => ({
      ...draft,
      drawId,
      transactionHash,
      status: 'confirmed' as const,
      purchaseTime: Date.now()
    }));
    
    setTickets(prev => [...prev, ...confirmedTickets]);
    clearDraftTickets();
    
    return confirmedTickets;
  }, [draftTickets, validateTicket, clearDraftTickets]);

  return {
    // Ticket data
    tickets,
    draftTickets,
    isLoading,
    error,
    
    // Draft ticket management
    addDraftTicket,
    updateDraftTicket,
    removeDraftTicket,
    clearDraftTickets,
    
    // Number selection
    generateQuickPickForTicket,
    updateTicketNumber,
    toggleTicketNumber,
    
    // Validation
    validateTicket,
    
    // Matching and results
    checkTicketMatches,
    checkAllTickets,
    
    // Statistics
    calculateTotalCost,
    getTicketStats,
    
    // Purchase confirmation
    confirmTicketPurchase,
    
    // Utilities
    generateQuickPickNumbers,
    createDraftTicket,
    
    // Configuration
    config: LOTTERY_CONFIG
  };
};

export default useLotteryTickets;