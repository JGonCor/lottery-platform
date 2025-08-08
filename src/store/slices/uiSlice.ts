// Placeholder UI slice - basic implementation
import { StateCreator } from 'zustand';

export interface UISlice {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  sidebarOpen: false,
  theme: 'light',
  
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setTheme: (theme) => set({ theme }),
});
