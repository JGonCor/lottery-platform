import { useEffect, useRef, useState } from 'react';
import { getRealtimeService, ConnectionStrategy } from '../services/realtimeService';
import { useAppStore } from '../store';

// Real-time hook for lottery updates
export const useRealtime = () => {
  const realtimeService = useRef(getRealtimeService({
    strategy: ConnectionStrategy.HYBRID,
    pollingInterval: 5000,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
  }));

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [connectionStrategy, setConnectionStrategy] = useState<ConnectionStrategy>(ConnectionStrategy.HYBRID);

  const {
    user,
    currentDraw,
    addNotification,
    loadLotteryInfo,
    loadUserTickets,
    updateBalance,
  } = useAppStore();

  useEffect(() => {
    const service = realtimeService.current;

    // Initialize real-time connection
    const initializeConnection = async () => {
      try {
        await service.initialize();
        setConnectionStatus(service.getConnectionStatus());
        setConnectionStrategy(service.getConnectionStrategy());
      } catch (error) {
        console.error('Failed to initialize real-time service:', error);
        addNotification({
          type: 'warning',
          title: 'Real-time Connection Failed',
          message: 'Using periodic updates instead',
          autoClose: true,
          duration: 5000,
        });
      }
    };

    initializeConnection();

    // Set up event listeners
    const handleConnectionStatus = (status: 'connected' | 'disconnected' | 'reconnecting') => {
      setConnectionStatus(status);
      
      if (status === 'connected') {
        addNotification({
          type: 'success',
          title: 'Real-time Connected',
          message: 'You will receive live updates',
          autoClose: true,
          duration: 3000,
        });
      } else if (status === 'disconnected') {
        addNotification({
          type: 'warning',
          title: 'Real-time Disconnected',
          message: 'Updates may be delayed',
          autoClose: true,
          duration: 5000,
        });
      }
    };

    const handleDrawUpdate = (draw: any) => {
      console.log('Draw updated:', draw);
      loadLotteryInfo();
      
      if (draw.status === 'completed') {
        addNotification({
          type: 'info',
          title: 'Draw Completed',
          message: `Draw #${draw.drawNumber} has finished!`,
          autoClose: true,
          duration: 10000,
        });
      }
    };

    const handleJackpotUpdate = (amount: string) => {
      console.log('Jackpot updated:', amount);
      loadLotteryInfo();
      
      // Notify of significant jackpot increases
      if (parseFloat(amount) > 100000) {
        addNotification({
          type: 'info',
          title: 'Jackpot Alert',
          message: `Jackpot has reached $${parseFloat(amount).toLocaleString()}!`,
          autoClose: true,
          duration: 8000,
        });
      }
    };

    const handleTicketPurchased = (ticket: any) => {
      console.log('Ticket purchased:', ticket);
      
      // If it's the current user's ticket
      if (user.isConnected && ticket.buyer?.toLowerCase() === user.address.toLowerCase()) {
        addNotification({
          type: 'success',
          title: 'Ticket Purchased',
          message: `Your ticket #${ticket.id} has been confirmed`,
          autoClose: true,
          duration: 5000,
        });
        
        // Refresh user data
        loadUserTickets();
        updateBalance();
      }
      
      // Update lottery info for jackpot changes
      loadLotteryInfo();
    };

    const handleWinnerAnnounced = (winners: any[]) => {
      console.log('Winners announced:', winners);
      loadLotteryInfo();
      loadUserTickets();
      
      // Check if current user is a winner
      if (user.isConnected) {
        const userWon = winners.some(winner => 
          winner.address?.toLowerCase() === user.address.toLowerCase()
        );
        
        if (userWon) {
          addNotification({
            type: 'success',
            title: 'Congratulations! 🎉',
            message: 'You are a winner! Check your tickets to claim your prize.',
            autoClose: false,
          });
        }
      }
      
      // General winner announcement
      addNotification({
        type: 'info',
        title: 'Winners Announced',
        message: `${winners.length} winner(s) in the latest draw!`,
        autoClose: true,
        duration: 8000,
      });
    };

    const handleError = (error: Error) => {
      console.error('Real-time service error:', error);
      addNotification({
        type: 'error',
        title: 'Real-time Error',
        message: 'Connection issue detected. Retrying...',
        autoClose: true,
        duration: 5000,
      });
    };

    // Register event listeners
    service.on('connection:status', handleConnectionStatus);
    service.on('draw:updated', handleDrawUpdate);
    service.on('jackpot:updated', handleJackpotUpdate);
    service.on('ticket:purchased', handleTicketPurchased);
    service.on('winner:announced', handleWinnerAnnounced);
    service.on('error', handleError);

    // Subscribe to relevant channels when user connects
    if (user.isConnected) {
      service.subscribeToUserUpdates(user.address);
      
      if (currentDraw) {
        service.subscribeToDrawUpdates(currentDraw.id);
      }
    }

    // Cleanup function
    return () => {
      service.off('connection:status', handleConnectionStatus);
      service.off('draw:updated', handleDrawUpdate);
      service.off('jackpot:updated', handleJackpotUpdate);
      service.off('ticket:purchased', handleTicketPurchased);
      service.off('winner:announced', handleWinnerAnnounced);
      service.off('error', handleError);
    };
  }, [user.isConnected, user.address, currentDraw?.id]);

  // Subscribe to new draw when it changes
  useEffect(() => {
    if (currentDraw && user.isConnected) {
      realtimeService.current.subscribeToDrawUpdates(currentDraw.id);
    }
  }, [currentDraw?.id, user.isConnected]);

  return {
    connectionStatus,
    connectionStrategy,
    isConnected: connectionStatus === 'connected',
    isReconnecting: connectionStatus === 'reconnecting',
    service: realtimeService.current,
  };
};

// Hook for draw countdown with real-time updates
export const useDrawCountdown = () => {
  const { timeUntilNextDraw } = useAppStore();
  const [displayTime, setDisplayTime] = useState(timeUntilNextDraw);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayTime(timeUntilNextDraw);

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start countdown if time is available
    if (timeUntilNextDraw > 0) {
      intervalRef.current = setInterval(() => {
        setDisplayTime(prev => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeUntilNextDraw]);

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return { days, hours, minutes, seconds: secs };
  };

  const timeComponents = formatTime(displayTime);
  const isDrawSoon = displayTime > 0 && displayTime <= 3600; // Less than 1 hour
  const isDrawNow = displayTime <= 60; // Less than 1 minute

  return {
    timeUntilNextDraw: displayTime,
    timeComponents,
    isDrawSoon,
    isDrawNow,
    formatTime,
  };
};

// Hook for live jackpot updates with animations
export const useLiveJackpot = () => {
  const { jackpot } = useAppStore();
  const [animatedJackpot, setAnimatedJackpot] = useState(jackpot);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (jackpot !== animatedJackpot) {
      setIsAnimating(true);
      
      const startValue = parseFloat(animatedJackpot) || 0;
      const endValue = parseFloat(jackpot) || 0;
      const difference = endValue - startValue;
      const duration = 2000; // 2 seconds animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (difference * easeOutCubic);
        
        setAnimatedJackpot(currentValue.toFixed(2));
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [jackpot, animatedJackpot]);

  return {
    jackpot: animatedJackpot,
    isAnimating,
    originalJackpot: jackpot,
  };
};