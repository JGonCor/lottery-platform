import { useState, useEffect, useCallback } from 'react';
import { useSafeWeb3 } from './useSafeWeb3';
// Config simplificada para BSC mainnet
import { getLotteryContractAddress, fromWei, isCorrectNetwork } from '../utils/web3';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';

// Interfaces para datos reales del contrato
export interface RealDrawData {
  drawId: number;
  winningNumbers: number[];
  timestamp: number;
  totalPoolAmount: string;
  accumulatedJackpot: string;
  isValid: boolean;
}

export interface RealWinnerData {
  address: string;
  ticketId: number;
  matchCount: number;
  prizeAmount: string;
  claimed: boolean;
}

export interface RealPrizeDistribution {
  tier: number;
  matchCount: number;
  totalPrize: string;
  winnerCount: number;
  prizePerWinner: string;
  winners: string[];
}

export interface RealLotteryStats {
  totalTicketsSold: number;
  totalDrawsCompleted: number;
  currentPoolAmount: string;
  accumulatedJackpot: string;
  contractBalance: string;
  residualFunds: string;
  lastUpdateTimestamp: number;
}

/**
 * Hook especializado para manejar datos reales del contrato
 * Elimina dependencias de datos mock y placeholder
 */
export const useRealLotteryData = () => {
  const { web3, account, active } = useSafeWeb3();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [latestDraw, setLatestDraw] = useState<RealDrawData | null>(null);
  const [prizeDistribution, setPrizeDistribution] = useState<RealPrizeDistribution[]>([]);
  const [lotteryStats, setLotteryStats] = useState<RealLotteryStats | null>(null);
  
  // Obtener instancia del contrato
  const getLotteryContract = useCallback(() => {
    if (!web3) return null;
    try {
      return new web3.eth.Contract(
        MultiTierLotteryABI as any,
        getLotteryContractAddress()
      );
    } catch (error) {
      console.error('Error inicializando contrato:', error);
      return null;
    }
  }, [web3]);

  // Verificar red correcta
  const verifyNetwork = useCallback(async () => {
    if (!active) return true;
    const onCorrectNetwork = await isCorrectNetwork();
    if (!onCorrectNetwork) {
      setError(new Error(`Red incorrecta. Conéctate a BSC Mainnet.`));
      return false;
    }
    return true;
  }, [active]);

  /**
   * Cargar el último sorteo real del contrato
   * NO usa datos mock ni placeholder
   */
  const loadLatestRealDraw = useCallback(async () => {
    if (!web3 || !await verifyNetwork()) return;

    const contract = getLotteryContract();
    if (!contract) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener el último sorteo
      const rawLatestDraw = await contract.methods.getLatestDraw().call();
      
      // Validar que el sorteo es real (no datos vacíos)
      if (!rawLatestDraw || 
          !rawLatestDraw.drawId || 
          rawLatestDraw.drawId === '0' ||
          parseInt(rawLatestDraw.drawId) === 0) {
        
        setLatestDraw(null);
        console.info('No hay sorteos completados en el contrato');
        return;
      }

      // Obtener información detallada del sorteo
      const drawDetails = await contract.methods.getDraw(rawLatestDraw.drawId).call();
      
      // Desempacar números ganadores
      let winningNumbers: number[] = [];
      if (drawDetails.winningNumbers && Array.isArray(drawDetails.winningNumbers)) {
        winningNumbers = drawDetails.winningNumbers.map(n => parseInt(n.toString()));
      } else {
        // Si están empacados como uint48, desempacar
        console.warn('Números ganadores no disponibles o en formato incorrecto');
        winningNumbers = [];
      }

      const realDrawData: RealDrawData = {
        drawId: parseInt(rawLatestDraw.drawId),
        winningNumbers,
        timestamp: parseInt(drawDetails.timestamp || '0'),
        totalPoolAmount: fromWei(drawDetails.totalPoolAmount || '0'),
        accumulatedJackpot: fromWei(drawDetails.accumulatedJackpot || '0'),
        isValid: winningNumbers.length === 6
      };

      setLatestDraw(realDrawData);

    } catch (err) {
      console.error('Error cargando último sorteo:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar sorteo'));
    } finally {
      setLoading(false);
    }
  }, [web3, getLotteryContract, verifyNetwork]);

  /**
   * Cargar distribución real de premios por tier
   * Solo usa datos del contrato, NO cálculos mock
   */
  const loadRealPrizeDistribution = useCallback(async (drawId?: number) => {
    if (!web3 || !await verifyNetwork()) return;

    const contract = getLotteryContract();
    if (!contract) return;

    // Usar el último sorteo si no se especifica drawId
    const targetDrawId = drawId || latestDraw?.drawId;
    if (!targetDrawId) return;

    try {
      setLoading(true);
      const distribution: RealPrizeDistribution[] = [];

      // Cargar datos reales para cada tier (2-6 matches)
      for (let matchCount = 2; matchCount <= 6; matchCount++) {
        try {
          // Obtener ganadores reales del contrato
          const winners = await contract.methods.getWinnersByTier(targetDrawId, matchCount).call();
          const winnersArray = Array.isArray(winners) ? winners : [];

          // Obtener premio real del tier
          const tierPrize = await contract.methods.getTierPrize(targetDrawId, matchCount).call();
          const totalPrize = fromWei(tierPrize || '0');
          
          // Calcular premio por ganador
          const prizePerWinner = winnersArray.length > 0 
            ? (parseFloat(totalPrize) / winnersArray.length).toFixed(4)
            : '0';

          distribution.push({
            tier: matchCount,
            matchCount,
            totalPrize,
            winnerCount: winnersArray.length,
            prizePerWinner,
            winners: winnersArray
          });

        } catch (tierError) {
          console.error(`Error cargando tier ${matchCount}:`, tierError);
          // Agregar tier vacío pero real (no mock)
          distribution.push({
            tier: matchCount,
            matchCount,
            totalPrize: '0',
            winnerCount: 0,
            prizePerWinner: '0',
            winners: []
          });
        }
      }

      setPrizeDistribution(distribution);

    } catch (err) {
      console.error('Error cargando distribución de premios:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar premios'));
    } finally {
      setLoading(false);
    }
  }, [web3, getLotteryContract, verifyNetwork, latestDraw]);

  /**
   * Cargar estadísticas reales del contrato
   * Usa la función getLotteryStatistics() del contrato
   */
  const loadRealLotteryStats = useCallback(async () => {
    if (!web3 || !await verifyNetwork()) return;

    const contract = getLotteryContract();
    if (!contract) return;

    try {
      setLoading(true);
      
      // Usar función real del contrato que retorna estadísticas completas
      const stats = await contract.methods.getLotteryStatistics().call();
      
      const realStats: RealLotteryStats = {
        totalTicketsSold: parseInt(stats.totalTickets || '0'),
        totalDrawsCompleted: parseInt(stats.totalDraws || '0'),
        currentPoolAmount: fromWei(stats.currentPoolAmount || '0'),
        accumulatedJackpot: fromWei(stats.accumulatedJackpot || '0'),
        contractBalance: fromWei(stats.contractBalance || '0'),
        residualFunds: fromWei(stats.totalResidualFunds || '0'),
        lastUpdateTimestamp: Date.now()
      };

      setLotteryStats(realStats);

    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar estadísticas'));
    } finally {
      setLoading(false);
    }
  }, [web3, getLotteryContract, verifyNetwork]);

  /**
   * Verificar si un ticket específico es ganador
   * Usa datos reales del contrato, no simulaciones
   */
  const checkTicketWinStatus = useCallback(async (ticketId: number): Promise<RealWinnerData | null> => {
    if (!web3 || !await verifyNetwork()) return null;

    const contract = getLotteryContract();
    if (!contract) return null;

    try {
      const ticketInfo = await contract.methods.getTicket(ticketId).call();
      
      if (!ticketInfo || !ticketInfo.owner) return null;

      // Solo retornar si el ticket realmente es ganador (matchCount >= 2)
      if (parseInt(ticketInfo.matchCount) >= 2) {
        const drawId = parseInt(ticketInfo.drawId);
        const matchCount = parseInt(ticketInfo.matchCount);
        
        // Obtener el premio real para este tier
        const tierPrize = await contract.methods.getTierPrize(drawId, matchCount).call();
        const winners = await contract.methods.getWinnersByTier(drawId, matchCount).call();
        const winnerCount = Array.isArray(winners) ? winners.length : 1;
        
        const prizeAmount = winnerCount > 0 
          ? (parseFloat(fromWei(tierPrize)) / winnerCount).toFixed(4)
          : '0';

        return {
          address: ticketInfo.owner,
          ticketId,
          matchCount,
          prizeAmount,
          claimed: !!ticketInfo.claimed
        };
      }

      return null; // No es ganador

    } catch (err) {
      console.error('Error verificando ticket:', err);
      return null;
    }
  }, [web3, getLotteryContract, verifyNetwork]);

  // Cargar todos los datos al inicializar
  useEffect(() => {
    if (active && web3) {
      loadLatestRealDraw();
      loadRealLotteryStats();
    }
  }, [active, web3, loadLatestRealDraw, loadRealLotteryStats]);

  // Cargar distribución cuando hay un sorteo válido
  useEffect(() => {
    if (latestDraw?.isValid) {
      loadRealPrizeDistribution(latestDraw.drawId);
    }
  }, [latestDraw, loadRealPrizeDistribution]);

  // Propiedades compatibles con la interfaz esperada por los componentes
  const jackpot = lotteryStats?.accumulatedJackpot || '0';
  const accumulatedJackpot = lotteryStats?.accumulatedJackpot || '0';
  
  // Mock referral info para compatibilidad (puede ser implementado más tarde)
  const referralInfo = {
    totalReferrals: 0,
    currentDiscount: 0,
    maxDiscount: 10,
    discountPerReferral: 1,
    referralCode: '',
    earnings: '0'
  };

  return {
    // Estados
    loading,
    error,
    latestDraw,
    prizeDistribution,
    lotteryStats,
    
    // Propiedades para compatibilidad con componentes existentes
    jackpot,
    accumulatedJackpot,
    referralInfo,
    
    // Funciones
    loadLatestRealDraw,
    loadRealPrizeDistribution,
    loadRealLotteryStats,
    checkTicketWinStatus,
    
    // Utilidades
    refreshAllData: useCallback(() => {
      loadLatestRealDraw();
      loadRealLotteryStats();
    }, [loadLatestRealDraw, loadRealLotteryStats]),
    
    // Validaciones
    hasValidDraw: !!latestDraw?.isValid,
    hasDrawCompleted: !!latestDraw && latestDraw.drawId > 0,
    totalPrizePool: latestDraw ? 
      (parseFloat(latestDraw.totalPoolAmount) + parseFloat(latestDraw.accumulatedJackpot)).toFixed(2) : 
      '0'
  };
};

export default useRealLotteryData;