import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { createOptimizedLazy, OptimizedSuspense } from '../utils/optimizedLazyLoading';
import LoadingSpinner from './UI/LoadingSpinner';
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';

// Lazy load all route components with optimized loading
const Home = createOptimizedLazy(
  () => import(/* webpackChunkName: "page-home" */ './Pages/Home'),
  { chunkName: 'page-home', retryAttempts: 3 }
);

const HowToPlay = createOptimizedLazy(
  () => import(/* webpackChunkName: "page-howtoplay" */ './Pages/HowToPlay'),
  { chunkName: 'page-howtoplay', retryAttempts: 3 }
);

const FAQ = createOptimizedLazy(
  () => import(/* webpackChunkName: "page-faq" */ './Pages/FAQ'),
  { chunkName: 'page-faq', retryAttempts: 3 }
);

const Winners = createOptimizedLazy(
  () => import(/* webpackChunkName: "page-winners" */ './Pages/Winners'),
  { chunkName: 'page-winners', retryAttempts: 3 }
);

// Dashboard placeholder - lightweight inline component
const Dashboard = createOptimizedLazy(
  () => Promise.resolve({ 
    default: () => (
      <div style={{padding: '2rem', textAlign: 'center'}}>
        <h1>📊 Dashboard</h1>
        <p>Panel de control del usuario - En desarrollo</p>
      </div>
    )
  }),
  { chunkName: 'page-dashboard' }
);

// TicketHistory placeholder - lightweight inline component
const TicketHistory = createOptimizedLazy(
  () => Promise.resolve({ 
    default: () => (
      <div style={{padding: '2rem', textAlign: 'center'}}>
        <h1>🎫 Historial de Tickets</h1>
        <p>Historial de tickets - En desarrollo</p>
      </div>
    )
  }),
  { chunkName: 'page-tickets' }
);

// Debug component - only load in development
const ContractDebugger = createOptimizedLazy(
  () => import(/* webpackChunkName: "debug-tools" */ './Debug/SimpleContractTest'),
  { chunkName: 'debug-tools', retryAttempts: 2 }
);



// Styled components for loading states
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${({ theme }) => theme?.spacing?.xl || '2rem'};
`;

const LoadingText = styled.p`
  margin-top: ${({ theme }) => theme?.spacing?.md || '1rem'};
  color: ${({ theme }) => theme?.colors?.text || '#000000'};
  font-size: 1.1rem;
`;

const SkeletonLoader = styled.div`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme?.colors?.cardBackground || '#f5f5f5'} 25%,
    rgba(255, 255, 255, 0.1) 50%,
    ${({ theme }) => theme?.colors?.cardBackground || '#f5f5f5'} 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: ${({ theme }) => theme?.borderRadius?.md || '0.5rem'};
  
  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

// Loading component with skeleton screens
const RouteLoadingFallback: React.FC<{ routeName?: string }> = ({ routeName }) => (
  <LoadingContainer>
    <LoadingSpinner size="large" />
    <LoadingText>
      Loading {routeName || 'page'}...
    </LoadingText>
    
    {/* Skeleton content based on route */}
    <div style={{ width: '100%', maxWidth: '800px', marginTop: '2rem' }}>
      <SkeletonLoader style={{ height: '200px', marginBottom: '1rem' }} />
      <SkeletonLoader style={{ height: '100px', marginBottom: '1rem' }} />
      <SkeletonLoader style={{ height: '150px' }} />
    </div>
  </LoadingContainer>
);

// Route-specific loading components
const HomeLoading = () => <RouteLoadingFallback routeName="Lottery Home" />;
const HowToPlayLoading = () => <RouteLoadingFallback routeName="How to Play" />;
const FAQLoading = () => <RouteLoadingFallback routeName="FAQ" />;
const WinnersLoading = () => <RouteLoadingFallback routeName="Winners" />;
const DashboardLoading = () => <RouteLoadingFallback routeName="Dashboard" />;
const TicketHistoryLoading = () => <RouteLoadingFallback routeName="Ticket History" />;


// Main lazy routes component
const LazyRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<HomeLoading />}>
              <Home />
            </Suspense>
          }
        />
        
        <Route
          path="/how-to-play"
          element={
            <Suspense fallback={<HowToPlayLoading />}>
              <HowToPlay />
            </Suspense>
          }
        />
        
        <Route
          path="/faq"
          element={
            <Suspense fallback={<FAQLoading />}>
              <FAQ />
            </Suspense>
          }
        />
        
        <Route
          path="/winners"
          element={
            <Suspense fallback={<WinnersLoading />}>
              <Winners />
            </Suspense>
          }
        />
        
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<DashboardLoading />}>
              <Dashboard />
            </Suspense>
          }
        />
        
        <Route
          path="/tickets"
          element={
            <Suspense fallback={<TicketHistoryLoading />}>
              <TicketHistory />
            </Suspense>
          }
        />
        
        {/* Temporary debug route */}
        <Route
          path="/debug-contract"
          element={
            <Suspense fallback={<RouteLoadingFallback routeName="Contract Test" />}>
              <ContractDebugger />
            </Suspense>
          }
        />
        
        {/* 404 Route - Redirect to Home */}
        <Route
          path="*"
          element={
            <Suspense fallback={<HomeLoading />}>
              <Home />
            </Suspense>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

export default LazyRoutes;