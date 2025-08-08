// Performance optimization utilities
import { lazy, ComponentType } from 'react';

// Create a lazy-loaded component with error boundary
export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  componentName?: string
) => {
  const LazyComponent = lazy(importFunc);
  
  // Set display name for debugging (TypeScript workaround)
  if (componentName && typeof LazyComponent === 'object') {
    (LazyComponent as any).displayName = `Lazy(${componentName})`;
  }
  
  return LazyComponent;
};

// Simple debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
};

// Simple throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Memory optimization helpers
export const memoizeSimple = <Args extends unknown[], Return>(
  fn: (...args: Args) => Return
): ((...args: Args) => Return) => {
  const cache = new Map<string, Return>();
  
  return (...args: Args): Return => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Bundle size optimization
export const preloadRoute = (routeComponent: () => Promise<any>) => {
  const componentImport = routeComponent();
  return componentImport;
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
  }
};

export default {
  createLazyComponent,
  debounce,
  throttle,
  memoizeSimple,
  preloadRoute,
  measurePerformance,
};