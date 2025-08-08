// Placeholder transaction slice - basic implementation
import { StateCreator } from 'zustand';

export interface TransactionSlice {
  pendingTransactions: Array<{
    hash: string;
    type: string;
    timestamp: Date;
  }>;
  addTransaction: (hash: string, type: string) => void;
  removeTransaction: (hash: string) => void;
}

export const createTransactionSlice: StateCreator<TransactionSlice> = (set, get) => ({
  pendingTransactions: [],
  
  addTransaction: (hash, type) => {
    const transaction = {
      hash,
      type,
      timestamp: new Date(),
    };
    set({ pendingTransactions: [...get().pendingTransactions, transaction] });
  },
  
  removeTransaction: (hash) => {
    set({ pendingTransactions: get().pendingTransactions.filter(t => t.hash !== hash) });
  },
});
