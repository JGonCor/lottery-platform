import React, { memo, Suspense, lazy, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useLottery } from '../../store';
import { LotterySpinner } from '../UI/LoadingSpinner';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import { getLotteryBasicData } from '../../utils/contractReader';
import { useMemoryOptimizedData } from '../../hooks/useMemoryOptimizedData';

// Lazy load components with chunk names
const BuyTicket = lazy(() => import(/* webpackChunkName: "buy-ticket" */ '../Tickets/BuyTicket'));
const UserTickets = lazy(() => import(/* webpackChunkName: "user-tickets" */ '../Tickets/UserTickets'));
const JackpotInfo = lazy(() => import(/* webpackChunkName: "jackpot-info" */ '../Tickets/JackpotInfo'));
const ShareReferral = lazy(() => import(/* webpackChunkName: "share-referral" */ '../UI/ShareReferral'));

const ContentContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const LoadingFallback = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.text};
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  min-height: 250px;
  flex-direction: column;
  gap: 1rem;
`;

const LoadingFallbackComponent: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingFallback>
    <LotterySpinner size="large" message={message || "Cargando datos de la lotería..."} />
  </LoadingFallback>
);

// Debug component to detect silent failures
const DebugInfo = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-size: 12px;
  z-index: 9999;
  max-width: 300px;
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
`;

interface RealTimeData {
  currentJackpot: string;
  accumulatedJackpot: string;
  ticketPrice: string;
  timeUntilNextDraw: number;
  totalTicketsSold: number;
  currentPoolAmount: string;
  isLoading: boolean;
  error: string | null;
}

const Home: React.FC = memo(() => {
  console.log('🏠 Home component rendering...');
  
  // Hook optimizado para manejo de memoria
  const {
    data: realTimeData,
    isLoading,
    error,
    safeSetData,
    safeSetLoading,
    safeSetError,
    executeWithTimeout,
    scheduleRetry,
    isComponentMounted
  } = useMemoryOptimizedData<RealTimeData>({
    currentJackpot: '0',
    accumulatedJackpot: '0',
    ticketPrice: '5',
    timeUntilNextDraw: 0,
    totalTicketsSold: 0,
    currentPoolAmount: '0',
    isLoading: true,
    error: null
  });

  // Hook de lotería para funciones de usuario
  const lotteryData = useLottery();
  const { referralInfo, loading: userDataLoading, error: userError } = lotteryData || {};
  
  // Fallback values para referrals
  const safeReferralInfo = referralInfo || {
    totalReferrals: 0,
    currentDiscount: 0,
    maxDiscount: 10,
    discountPerReferral: 1
  };

  // Cargar datos reales del contrato con gestión optimizada de memoria
  useEffect(() => {
    const loadRealTimeData = async () => {
      // Prevenir múltiples llamadas si el componente ya no está montado
      if (!isComponentMounted()) return;
      
      safeSetLoading(true);
      safeSetError(null);

      try {
        console.log('📊 Loading real-time lottery data...');
        
        // Ejecutar con timeout y abort signal
        const basicData = await executeWithTimeout(async (signal) => {
          return await getLotteryBasicData();
        }, 15000); // 15 segundos timeout

        console.log('🔍 getLotteryBasicData returned:', basicData);

        if (basicData && isComponentMounted()) {
          const newData: RealTimeData = {
            currentJackpot: basicData.jackpot || '0',
            accumulatedJackpot: basicData.accumulatedJackpot || '0',
            ticketPrice: basicData.ticketPrice || '5',
            timeUntilNextDraw: basicData.timeUntilNextDraw || 0,
            totalTicketsSold: Math.floor(Math.random() * 500) + 100, // Placeholder mejorado
            currentPoolAmount: basicData.jackpot || '0',
            isLoading: false,
            error: basicData.error
          };
          
          safeSetData(newData);
          safeSetLoading(false);
          
          console.log('✅ Real-time data loaded:', {
            jackpot: basicData.jackpot,
            accumulatedJackpot: basicData.accumulatedJackpot,
            error: basicData.error
          });

          // Programar siguiente actualización con delay progresivo
          scheduleRetry(() => loadRealTimeData(), 60000); // 60 segundos
        }
      } catch (error) {
        console.error('❌ Error loading real-time data:', error);
        
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        safeSetError(errorMsg);
        safeSetLoading(false);

        // Retry después de error con delay mayor
        scheduleRetry(() => loadRealTimeData(), 90000); // 90 segundos después de error
      }
    };

    // Cargar inmediatamente
    loadRealTimeData();

    // El cleanup se maneja automáticamente por useMemoryOptimizedData
  }, []); // Empty dependency array - solo cargar al montar

  console.log('🏠 Home component state:', {
    realTimeData,
    referralInfo: safeReferralInfo,
    userDataLoading: userDataLoading || false,
    userError: userError?.message || 'none',
  });
  
  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <DebugInfo>
          <div>RT Loading: {isLoading ? 'true' : 'false'}</div>
          <div>RT Error: {error || 'none'}</div>
          <div>Jackpot: {realTimeData.currentJackpot}</div>
          <div>Accumulated: {realTimeData.accumulatedJackpot}</div>
          <div>Pool: {realTimeData.currentPoolAmount}</div>
          <div>Time to Draw: {Math.floor(realTimeData.timeUntilNextDraw / 3600)}h</div>
          <div>Tickets Sold: {realTimeData.totalTicketsSold}</div>
          <div>Referrals: {safeReferralInfo.totalReferrals}</div>
          <div>Environment: {process.env.REACT_APP_ENVIRONMENT || 'production'}</div>
        </DebugInfo>
      )}
      
      <ErrorBoundary 
        fallback={
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: 'rgba(255, 82, 82, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            margin: '1rem 0'
          }}>
            <h3>Error cargando información del jackpot</h3>
            <p>Por favor recarga la página</p>
          </div>
        }
      >
        <Suspense fallback={<LoadingFallbackComponent message="Cargando información del jackpot..." />}>
          <JackpotInfo />
        </Suspense>
      </ErrorBoundary>
      
      <ContentContainer>
        <LeftColumn>
          <ErrorBoundary 
            fallback={
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}>
                <h3>Error en compra de tickets</h3>
                <p>Modo simulado activado</p>
              </div>
            }
          >
            <Suspense fallback={<LoadingFallbackComponent message="Cargando sistema de compra de tickets..." />}>
              <BuyTicket />
            </Suspense>
          </ErrorBoundary>
        </LeftColumn>
        
        <RightColumn>
          <ErrorBoundary 
            fallback={
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderRadius: '8px'
              }}>
                <h4>Tickets no disponibles</h4>
                <p>Conecta tu billetera para ver tickets</p>
              </div>
            }
          >
            <Suspense fallback={<LoadingFallbackComponent message="Cargando tus tickets..." />}>
              <UserTickets />
            </Suspense>
          </ErrorBoundary>
          
          <ErrorBoundary 
            fallback={
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px'
              }}>
                <h4>Sistema de referidos</h4>
                <p>Conecta tu billetera para acceder</p>
              </div>
            }
          >
            <Suspense fallback={<LoadingFallbackComponent message="Cargando sistema de referidos..." />}>
              <ShareReferral 
                totalReferrals={safeReferralInfo.totalReferrals}
                currentDiscount={safeReferralInfo.currentDiscount}
                maxDiscount={safeReferralInfo.maxDiscount}
                discountPerReferral={safeReferralInfo.discountPerReferral}
              />
            </Suspense>
          </ErrorBoundary>
        </RightColumn>
      </ContentContainer>
    </>
  );
});

export default Home;