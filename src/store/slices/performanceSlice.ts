// Placeholder performance slice - basic implementation
import { StateCreator } from 'zustand';

export interface PerformanceSlice {
  loadTimes: Record<string, number>;
  errorCount: number;
  recordLoadTime: (component: string, time: number) => void;
  incrementErrorCount: () => void;
}

export const createPerformanceSlice: StateCreator<PerformanceSlice> = (set, get) => ({
  loadTimes: {},
  errorCount: 0,
  
  recordLoadTime: (component, time) => {
    set({ loadTimes: { ...get().loadTimes, [component]: time } });
  },
  
  incrementErrorCount: () => set({ errorCount: get().errorCount + 1 }),
});
