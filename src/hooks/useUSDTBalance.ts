import { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

// USDT Contract ABI (minimal required functions)
const USDT_ABI: AbiItem[] = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: 'remaining', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  }
];

// Contract addresses for different networks
const USDT_CONTRACTS = {
  mainnet: '0x55d398326f99059fF775485246999027B3197955', // BSC Mainnet USDT
  testnet: '0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684'  // BSC Testnet USDT
};

// Get USDT contract address based on environment
const getUSDTContractAddress = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? USDT_CONTRACTS.mainnet : USDT_CONTRACTS.testnet;
};

export interface TransactionState {
  hash?: string;
  status: 'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed';
  confirmations: number;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

export interface USDTBalance {
  balance: string; // Raw balance in wei
  balanceFormatted: string; // Formatted balance for display
  decimals: number;
  isLoading: boolean;
  error?: string;
  lastUpdated: number;
}

export interface PaymentValidation {
  isValid: boolean;
  hasEnoughBalance: boolean;
  hasEnoughAllowance: boolean;
  requiredAmount: string;
  availableBalance: string;
  currentAllowance: string;
  errors: string[];
}

export const useUSDTBalance = () => {
  const { account, library, active } = useWeb3React<Web3>();
  
  const [balance, setBalance] = useState<USDTBalance>({
    balance: '0',
    balanceFormatted: '0.00',
    decimals: 18,
    isLoading: false,
    lastUpdated: 0
  });
  
  const [transactions, setTransactions] = useState<Map<string, TransactionState>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const contractAddress = getUSDTContractAddress();

  // Get USDT contract instance
  const getUSDTContract = useCallback(() => {
    if (!library || !active) return null;
    
    try {
      return new library.eth.Contract(USDT_ABI, contractAddress);
    } catch (error) {
      console.error('Error creating USDT contract instance:', error);
      return null;
    }
  }, [library, active, contractAddress]);

  // Format USDT amount from wei to readable format
  const formatUSDTAmount = useCallback((amountWei: string, decimals = 18): string => {
    try {
      if (!library) return '0.00';
      
      const amount = library.utils.fromWei(amountWei, 'ether');
      const formatted = parseFloat(amount).toFixed(2);
      return formatted;
    } catch (error) {
      console.error('Error formatting USDT amount:', error);
      return '0.00';
    }
  }, [library]);

  // Convert USDT amount to wei
  const parseUSDTAmount = useCallback((amount: string, decimals = 18): string => {
    try {
      if (!library) return '0';
      return library.utils.toWei(amount, 'ether');
    } catch (error) {
      console.error('Error parsing USDT amount:', error);
      return '0';
    }
  }, [library]);

  // Fetch USDT balance
  const fetchBalance = useCallback(async (showLoading = true) => {
    if (!account || !library || !active) {
      setBalance(prev => ({
        ...prev,
        balance: '0',
        balanceFormatted: '0.00',
        isLoading: false,
        error: 'Wallet not connected'
      }));
      return;
    }

    const contract = getUSDTContract();
    if (!contract) {
      setBalance(prev => ({
        ...prev,
        error: 'Failed to create contract instance',
        isLoading: false
      }));
      return;
    }

    if (showLoading) {
      setBalance(prev => ({ ...prev, isLoading: true, error: undefined }));
    }

    try {
      // Get balance and decimals in parallel
      const [balanceWei, decimals] = await Promise.all([
        contract.methods.balanceOf(account).call(),
        contract.methods.decimals().call()
      ]);

      const balanceFormatted = formatUSDTAmount(balanceWei.toString(), parseInt(decimals));

      setBalance({
        balance: balanceWei.toString(),
        balanceFormatted,
        decimals: parseInt(decimals),
        isLoading: false,
        lastUpdated: Date.now()
      });

      console.log('✅ USDT Balance updated:', {
        address: account,
        balance: balanceFormatted,
        raw: balanceWei.toString()
      });

    } catch (error: any) {
      console.error('❌ Error fetching USDT balance:', error);
      setBalance(prev => ({
        ...prev,
        error: error.message || 'Failed to fetch balance',
        isLoading: false
      }));
    }
  }, [account, library, active, getUSDTContract, formatUSDTAmount]);

  // Get USDT allowance for a spender
  const getAllowance = useCallback(async (spenderAddress: string): Promise<string> => {
    if (!account || !library || !active) return '0';

    const contract = getUSDTContract();
    if (!contract) return '0';

    try {
      const allowance = await contract.methods.allowance(account, spenderAddress).call();
      return allowance.toString();
    } catch (error) {
      console.error('Error fetching USDT allowance:', error);
      return '0';
    }
  }, [account, library, active, getUSDTContract]);

  // Approve USDT spending
  const approveUSDT = useCallback(async (
    spenderAddress: string,
    amount: string
  ): Promise<string> => {
    if (!account || !library || !active) {
      throw new Error('Wallet not connected');
    }

    const contract = getUSDTContract();
    if (!contract) {
      throw new Error('Failed to create contract instance');
    }

    try {
      console.log('🔄 Approving USDT spending:', {
        spender: spenderAddress,
        amount: formatUSDTAmount(amount),
        raw: amount
      });

      const transaction = await contract.methods
        .approve(spenderAddress, amount)
        .send({ 
          from: account,
          gas: 100000 // Standard gas limit for approve
        });

      console.log('✅ USDT approval transaction sent:', transaction.transactionHash);
      
      // Track transaction
      setTransactions(prev => new Map(prev.set(transaction.transactionHash, {
        hash: transaction.transactionHash,
        status: 'confirming',
        confirmations: 0
      })));

      return transaction.transactionHash;
    } catch (error: any) {
      console.error('❌ Error approving USDT:', error);
      throw new Error(error.message || 'Failed to approve USDT');
    }
  }, [account, library, active, getUSDTContract, formatUSDTAmount]);

  // Validate payment before transaction
  const validatePayment = useCallback(async (
    requiredAmount: string,
    spenderAddress?: string
  ): Promise<PaymentValidation> => {
    const result: PaymentValidation = {
      isValid: false,
      hasEnoughBalance: false,
      hasEnoughAllowance: false,
      requiredAmount,
      availableBalance: balance.balance,
      currentAllowance: '0',
      errors: []
    };

    if (!account || !active) {
      result.errors.push('Wallet not connected');
      return result;
    }

    if (!library) {
      result.errors.push('Web3 library not available');
      return result;
    }

    try {
      // Check balance
      const requiredAmountBN = library.utils.toBN(requiredAmount);
      const availableBalanceBN = library.utils.toBN(balance.balance);
      
      result.hasEnoughBalance = availableBalanceBN.gte(requiredAmountBN);
      
      if (!result.hasEnoughBalance) {
        const shortfall = formatUSDTAmount(
          requiredAmountBN.sub(availableBalanceBN).toString()
        );
        result.errors.push(`Insufficient balance. Need ${shortfall} more USDT`);
      }

      // Check allowance if spender is provided
      if (spenderAddress) {
        const allowance = await getAllowance(spenderAddress);
        result.currentAllowance = allowance;
        
        const allowanceBN = library.utils.toBN(allowance);
        result.hasEnoughAllowance = allowanceBN.gte(requiredAmountBN);
        
        if (!result.hasEnoughAllowance) {
          const shortfall = formatUSDTAmount(
            requiredAmountBN.sub(allowanceBN).toString()
          );
          result.errors.push(`Insufficient allowance. Need to approve ${shortfall} more USDT`);
        }
      } else {
        result.hasEnoughAllowance = true; // Not required
      }

      result.isValid = result.hasEnoughBalance && result.hasEnoughAllowance;

    } catch (error: any) {
      console.error('Error validating payment:', error);
      result.errors.push(error.message || 'Validation failed');
    }

    return result;
  }, [account, active, library, balance.balance, getAllowance, formatUSDTAmount]);

  // Monitor transaction status
  const monitorTransaction = useCallback(async (txHash: string) => {
    if (!library) return;

    const updateTxState = (updates: Partial<TransactionState>) => {
      setTransactions(prev => {
        const current = prev.get(txHash) || { status: 'pending' as const, confirmations: 0 };
        return new Map(prev.set(txHash, { ...current, ...updates }));
      });
    };

    try {
      updateTxState({ status: 'pending' });

      const receipt = await library.eth.getTransactionReceipt(txHash);
      
      if (receipt) {
        const currentBlock = await library.eth.getBlockNumber();
        const confirmations = Math.max(0, currentBlock - receipt.blockNumber);

        if (receipt.status) {
          updateTxState({
            status: confirmations >= 3 ? 'confirmed' : 'confirming',
            confirmations,
            gasUsed: receipt.gasUsed?.toString(),
            effectiveGasPrice: receipt.effectiveGasPrice?.toString()
          });

          // Refresh balance after successful transaction
          if (confirmations >= 1) {
            setTimeout(() => fetchBalance(false), 2000);
          }
        } else {
          updateTxState({
            status: 'failed',
            error: 'Transaction failed'
          });
        }
      }
    } catch (error: any) {
      console.error('Error monitoring transaction:', error);
      updateTxState({
        status: 'failed',
        error: error.message || 'Failed to monitor transaction'
      });
    }
  }, [library, fetchBalance]);

  // Refresh balance with loading state
  const refreshBalance = useCallback(async () => {
    setIsRefreshing(true);
    await fetchBalance(true);
    setIsRefreshing(false);
  }, [fetchBalance]);

  // Auto-fetch balance when account changes
  useEffect(() => {
    fetchBalance(true);
  }, [fetchBalance]);

  // Auto-refresh balance periodically
  useEffect(() => {
    if (!active || !account) return;

    const interval = setInterval(() => {
      fetchBalance(false); // Silent refresh
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [active, account, fetchBalance]);

  // Monitor pending transactions
  useEffect(() => {
    const pendingTxs = Array.from(transactions.entries())
      .filter(([_, tx]) => ['pending', 'confirming'].includes(tx.status));

    if (pendingTxs.length === 0) return;

    const interval = setInterval(() => {
      pendingTxs.forEach(([hash]) => {
        monitorTransaction(hash);
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [transactions, monitorTransaction]);

  return {
    // Balance data
    balance,
    isRefreshing,
    
    // Actions
    refreshBalance,
    fetchBalance,
    
    // Payment validation
    validatePayment,
    
    // USDT operations
    approveUSDT,
    getAllowance,
    
    // Transaction monitoring
    transactions,
    monitorTransaction,
    
    // Utilities
    formatUSDTAmount,
    parseUSDTAmount,
    contractAddress,
    
    // Contract instance
    getUSDTContract
  };
};

export default useUSDTBalance;