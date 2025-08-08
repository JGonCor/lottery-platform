import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Simplified store just for theme and basic UI state
interface AppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

// Create a minimal, safe store
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
      
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
    }),
    {
      name: 'lottery-app-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Re-export hooks directly - these will be used by components
export { useSafeWeb3 as useWeb3 } from '../hooks/useSafeWeb3';
export { useLottery } from '../hooks/useLottery';

// Export types
export * from './types';