import { EventEmitter } from 'events';
// Configuración simplificada para BSC mainnet

// Real-time event types
export interface RealtimeEvents {
  'draw:updated': (draw: any) => void;
  'jackpot:updated': (amount: string) => void;
  'ticket:purchased': (ticket: any) => void;
  'winner:announced': (winners: any[]) => void;
  'connection:status': (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  'error': (error: Error) => void;
}

// Connection strategies
export enum ConnectionStrategy {
  WEBSOCKET_ONLY = 'websocket',
  POLLING_ONLY = 'polling',
  HYBRID = 'hybrid', // WebSocket with polling fallback
}

// Real-time service configuration
interface RealtimeConfig {
  strategy: ConnectionStrategy;
  websocketUrl?: string;
  pollingInterval: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  timeout: number;
}

class RealtimeService extends EventEmitter {
  private config: RealtimeConfig;
  private websocket: WebSocket | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private isReconnecting = false;
  private connectionStrategy: ConnectionStrategy;
  private lastDataTimestamp = 0;

  constructor(config: Partial<RealtimeConfig> = {}) {
    super();
    
    this.config = {
      strategy: ConnectionStrategy.HYBRID,
      websocketUrl: process.env.REACT_APP_WEBSOCKET_URL || 'wss://api.lottery-platform.com/ws',
      pollingInterval: 5000, // 5 seconds
      maxReconnectAttempts: 5,
      reconnectDelay: 2000, // 2 seconds
      heartbeatInterval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      ...config,
    };

    this.connectionStrategy = this.config.strategy;
    this.setupPerformanceMonitoring();
  }

  // Initialize the real-time connection
  public async initialize(): Promise<void> {
    console.log(`[RealtimeService] Initializing with strategy: ${this.connectionStrategy}`);

    switch (this.connectionStrategy) {
      case ConnectionStrategy.WEBSOCKET_ONLY:
        await this.initializeWebSocket();
        break;
      case ConnectionStrategy.POLLING_ONLY:
        this.initializePolling();
        break;
      case ConnectionStrategy.HYBRID:
        await this.initializeHybrid();
        break;
    }
  }

  // Hybrid approach: Try WebSocket first, fallback to polling
  private async initializeHybrid(): Promise<void> {
    try {
      await this.initializeWebSocket();
    } catch (error) {
      console.warn('[RealtimeService] WebSocket failed, falling back to polling:', error);
      this.connectionStrategy = ConnectionStrategy.POLLING_ONLY;
      this.initializePolling();
    }
  }

  // Initialize WebSocket connection
  private async initializeWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.config.websocketUrl) {
          throw new Error('WebSocket URL not configured');
        }

        this.websocket = new WebSocket(this.config.websocketUrl);
        
        const timeout = setTimeout(() => {
          this.websocket?.close();
          reject(new Error('WebSocket connection timeout'));
        }, this.config.timeout);

        this.websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('[RealtimeService] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connection:status', 'connected');
          this.startHeartbeat();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onclose = () => {
          clearTimeout(timeout);
          console.log('[RealtimeService] WebSocket disconnected');
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('connection:status', 'disconnected');
          
          if (!this.isReconnecting) {
            this.handleReconnection();
          }
        };

        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          console.error('[RealtimeService] WebSocket error:', error);
          this.emit('error', new Error('WebSocket connection error'));
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Initialize polling mechanism
  private initializePolling(): void {
    console.log('[RealtimeService] Starting polling mode');
    this.isConnected = true;
    this.emit('connection:status', 'connected');
    
    this.pollingTimer = setInterval(() => {
      this.pollForUpdates();
    }, this.config.pollingInterval);

    // Initial poll
    this.pollForUpdates();
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.lastDataTimestamp = Date.now();

      switch (data.type) {
        case 'draw_updated':
          this.emit('draw:updated', data.payload);
          break;
        case 'jackpot_updated':
          this.emit('jackpot:updated', data.payload.amount);
          break;
        case 'ticket_purchased':
          this.emit('ticket:purchased', data.payload);
          break;
        case 'winner_announced':
          this.emit('winner:announced', data.payload.winners);
          break;
        case 'heartbeat':
          // Handle heartbeat response
          break;
        default:
          console.warn('[RealtimeService] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[RealtimeService] Error parsing WebSocket message:', error);
      this.emit('error', new Error('Failed to parse WebSocket message'));
    }
  }

  // Poll for updates (fallback mechanism)
  private async pollForUpdates(): Promise<void> {
    try {
      const response = await fetch(`${process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/'}/lottery/updates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if data is newer than last received
      if (data.timestamp > this.lastDataTimestamp) {
        this.lastDataTimestamp = data.timestamp;
        
        if (data.draw) {
          this.emit('draw:updated', data.draw);
        }
        if (data.jackpot) {
          this.emit('jackpot:updated', data.jackpot);
        }
        if (data.winners) {
          this.emit('winner:announced', data.winners);
        }
      }

    } catch (error) {
      console.error('[RealtimeService] Polling error:', error);
      this.emit('error', new Error('Polling failed'));
    }
  }

  // Handle reconnection logic
  private async handleReconnection(): Promise<void> {
    if (this.isReconnecting || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[RealtimeService] Max reconnection attempts reached');
      
      // Fallback to polling if WebSocket fails completely
      if (this.connectionStrategy === ConnectionStrategy.WEBSOCKET_ONLY) {
        console.log('[RealtimeService] Falling back to polling mode');
        this.connectionStrategy = ConnectionStrategy.POLLING_ONLY;
        this.initializePolling();
      }
      return;
    }

    this.isReconnecting = true;
    this.emit('connection:status', 'reconnecting');
    
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`[RealtimeService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    setTimeout(async () => {
      try {
        this.reconnectAttempts++;
        await this.initializeWebSocket();
        this.isReconnecting = false;
      } catch (error) {
        console.error('[RealtimeService] Reconnection failed:', error);
        this.isReconnecting = false;
        this.handleReconnection(); // Try again
      }
    }, delay);
  }

  // Start heartbeat mechanism
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  // Stop heartbeat mechanism
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring(): void {
    // Monitor connection quality
    setInterval(() => {
      if (this.isConnected) {
        const timeSinceLastData = Date.now() - this.lastDataTimestamp;
        
        // If no data received for too long, consider connection stale
        if (timeSinceLastData > this.config.heartbeatInterval * 2) {
          console.warn('[RealtimeService] Stale connection detected');
          this.handleConnectionStale();
        }
      }
    }, this.config.heartbeatInterval);
  }

  // Handle stale connection
  private handleConnectionStale(): void {
    if (this.websocket) {
      this.websocket.close();
    }
  }

  // Subscribe to specific draw updates
  public subscribeToDrawUpdates(drawId: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'draw',
        drawId: drawId,
      }));
    }
  }

  // Subscribe to user-specific updates
  public subscribeToUserUpdates(userAddress: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'user',
        address: userAddress,
      }));
    }
  }

  // Get connection status
  public getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    if (this.isReconnecting) return 'reconnecting';
    return this.isConnected ? 'connected' : 'disconnected';
  }

  // Get connection strategy
  public getConnectionStrategy(): ConnectionStrategy {
    return this.connectionStrategy;
  }

  // Destroy the service
  public destroy(): void {
    console.log('[RealtimeService] Destroying service');
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.stopHeartbeat();
    this.removeAllListeners();
    this.isConnected = false;
    this.isReconnecting = false;
  }

  // Send message through WebSocket
  public sendMessage(message: any): boolean {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
}

// Singleton instance
let realtimeServiceInstance: RealtimeService | null = null;

export const getRealtimeService = (config?: Partial<RealtimeConfig>): RealtimeService => {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new RealtimeService(config);
  }
  return realtimeServiceInstance;
};

export const destroyRealtimeService = (): void => {
  if (realtimeServiceInstance) {
    realtimeServiceInstance.destroy();
    realtimeServiceInstance = null;
  }
};

export { RealtimeService, ConnectionStrategy };