// Placeholder notification slice - basic implementation
import { StateCreator } from 'zustand';

export interface NotificationSlice {
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    timestamp: Date;
  }>;
  addNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeNotification: (id: string) => void;
}

export const createNotificationSlice: StateCreator<NotificationSlice> = (set, get) => ({
  notifications: [],
  
  addNotification: (message, type = 'info') => {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
    };
    set({ notifications: [...get().notifications, notification] });
  },
  
  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) });
  },
});
