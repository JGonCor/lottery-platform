/**
 * Sistema de caché inteligente para datos del contrato
 * Optimiza rendimiento para múltiples usuarios
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiryTime: number;
}

interface ContractEventCache {
  drawEvents: Map<number, CacheEntry<any>>;
  winnerEvents: Map<string, CacheEntry<any>>;
  prizeData: Map<string, CacheEntry<any>>;
  generalData: Map<string, CacheEntry<any>>;
}

class ContractCacheManager {
  private cache: ContractEventCache;
  private readonly DEFAULT_TTL = 30000; // 30 segundos
  private readonly DRAW_DATA_TTL = 300000; // 5 minutos para datos de sorteo
  private readonly WINNER_DATA_TTL = 600000; // 10 minutos para datos de ganadores
  
  constructor() {
    this.cache = {
      drawEvents: new Map(),
      winnerEvents: new Map(),
      prizeData: new Map(),
      generalData: new Map()
    };
    
    // Limpiar cache expirado cada minuto
    setInterval(() => this.cleanExpiredEntries(), 60000);
  }

  /**
   * Obtener datos con caché inteligente
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL,
    cacheType: keyof ContractEventCache = 'generalData'
  ): Promise<T> {
    const cache = this.cache[cacheType];
    const cached = cache.get(key);
    
    // Verificar si el cache es válido
    if (cached && Date.now() < cached.expiryTime) {
      return cached.data;
    }
    
    // Fetch nuevo dato y guardarlo en cache
    try {
      const freshData = await fetcher();
      
      cache.set(key, {
        data: freshData,
        timestamp: Date.now(),
        expiryTime: Date.now() + ttl
      });
      
      return freshData;
    } catch (error) {
      // En caso de error, usar cache expirado si existe
      if (cached) {
        console.warn(`Using expired cache for ${key} due to fetch error:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Invalidar cache específico
   */
  invalidate(key: string, cacheType: keyof ContractEventCache = 'generalData'): void {
    this.cache[cacheType].delete(key);
  }

  /**
   * Invalidar todo el cache de un tipo
   */
  invalidateType(cacheType: keyof ContractEventCache): void {
    this.cache[cacheType].clear();
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    
    Object.values(this.cache).forEach(cache => {
      for (const [key, entry] of cache.entries()) {
        if (now >= entry.expiryTime) {
          cache.delete(key);
        }
      }
    });
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats(): {
    drawEvents: number;
    winnerEvents: number; 
    prizeData: number;
    generalData: number;
    totalEntries: number;
  } {
    return {
      drawEvents: this.cache.drawEvents.size,
      winnerEvents: this.cache.winnerEvents.size,
      prizeData: this.cache.prizeData.size,
      generalData: this.cache.generalData.size,
      totalEntries: Object.values(this.cache).reduce((total, cache) => total + cache.size, 0)
    };
  }

  /**
   * Prefetch de datos críticos para mejor rendimiento
   */
  async prefetchCriticalData(contract: any): Promise<void> {
    if (!contract) return;

    const prefetchPromises = [
      // Datos que cambian poco
      this.get('ticketPrice', () => contract.methods.getTicketPrice().call(), this.DRAW_DATA_TTL),
      this.get('bulkDiscountTiers', () => contract.methods.getBulkDiscountTiers().call(), this.DRAW_DATA_TTL),
      this.get('referralDiscountInfo', () => contract.methods.getReferralDiscountInfo().call(), this.DRAW_DATA_TTL),
      
      // Datos que cambian más frecuentemente
      this.get('currentPool', () => contract.methods.getCurrentPool().call(), this.DEFAULT_TTL),
      this.get('accumulatedJackpot', () => contract.methods.getAccumulatedJackpot().call(), this.DEFAULT_TTL),
      this.get('timeUntilNextDraw', () => contract.methods.getTimeUntilNextDraw().call(), 10000) // 10 segundos
    ];

    try {
      await Promise.allSettled(prefetchPromises);
      console.info('Critical data prefetched successfully');
    } catch (error) {
      console.warn('Some prefetch operations failed:', error);
    }
  }

  /**
   * Batch fetch para múltiples datos
   */
  async batchFetch<T>(
    requests: Array<{
      key: string;
      fetcher: () => Promise<T>;
      ttl?: number;
      cacheType?: keyof ContractEventCache;
    }>
  ): Promise<T[]> {
    const promises = requests.map(req => 
      this.get(
        req.key, 
        req.fetcher, 
        req.ttl || this.DEFAULT_TTL,
        req.cacheType || 'generalData'
      )
    );

    return Promise.all(promises);
  }
}

// Instancia singleton del cache manager
export const contractCache = new ContractCacheManager();

/**
 * Hook para usar cache del contrato
 */
export const useContractCache = () => {
  return {
    get: contractCache.get.bind(contractCache),
    invalidate: contractCache.invalidate.bind(contractCache),
    invalidateType: contractCache.invalidateType.bind(contractCache),
    getStats: contractCache.getStats.bind(contractCache),
    prefetchCriticalData: contractCache.prefetchCriticalData.bind(contractCache),
    batchFetch: contractCache.batchFetch.bind(contractCache)
  };
};

/**
 * Utilidades para keys de cache comunes
 */
export const CacheKeys = {
  // Datos generales
  TICKET_PRICE: 'ticketPrice',
  CURRENT_POOL: 'currentPool',
  ACCUMULATED_JACKPOT: 'accumulatedJackpot',
  TIME_UNTIL_DRAW: 'timeUntilNextDraw',
  LOTTERY_STATE: 'lotteryState',
  
  // Datos de descuentos
  BULK_DISCOUNT_TIERS: 'bulkDiscountTiers',
  REFERRAL_DISCOUNT_INFO: 'referralDiscountInfo',
  
  // Datos de usuario
  userTickets: (address: string) => `userTickets_${address}`,
  userReferrals: (address: string) => `userReferrals_${address}`,
  userDiscount: (address: string, ticketCount: number) => `userDiscount_${address}_${ticketCount}`,
  
  // Datos de sorteos
  latestDraw: () => 'latestDraw',
  drawData: (drawId: number) => `drawData_${drawId}`,
  winnersByTier: (drawId: number, tier: number) => `winners_${drawId}_${tier}`,
  tierPrize: (drawId: number, tier: number) => `tierPrize_${drawId}_${tier}`,
  
  // Estadísticas
  LOTTERY_STATISTICS: 'lotteryStatistics'
};

export default contractCache;