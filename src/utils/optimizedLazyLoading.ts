import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Interfaz para opciones de lazy loading
interface LazyLoadOptions {
  retryAttempts?: number;
  retryDelay?: number;
  chunkName?: string;
}

// Función optimizada para lazy loading con retry
export function createOptimizedLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    chunkName
  } = options;

  const retry = (fn: Function, retriesLeft: number = retryAttempts, interval: number = retryDelay): Promise<any> => {
    return new Promise((resolve, reject) => {
      fn()
        .then(resolve)
        .catch((error: Error) => {
          if (retriesLeft === 0) {
            reject(error);
            return;
          }

          setTimeout(() => {
            retry(fn, retriesLeft - 1, interval).then(resolve, reject);
          }, interval);
        });
    });
  };

  return lazy(() => retry(importFn));
}

// Preload function para cargar componentes en el background
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): () => Promise<{ default: T }> {
  const componentImport = importFn();
  return () => componentImport;
}

// Cache para componentes ya cargados
const componentCache = new Map<string, ComponentType<any>>();

export function createCachedLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  cacheKey: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    if (componentCache.has(cacheKey)) {
      return { default: componentCache.get(cacheKey) as T };
    }

    const module = await importFn();
    componentCache.set(cacheKey, module.default);
    return module;
  });
}

// Función para crear un suspense wrapper optimizado
import React, { Suspense, ReactNode } from 'react';

interface OptimizedSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

export const OptimizedSuspense: React.FC<OptimizedSuspenseProps> = ({
  children,
  fallback,
  errorFallback
}) => {
  const defaultFallback = React.createElement('div', null, 'Loading...');
  const defaultErrorFallback = React.createElement('div', null, 'Error loading component');
  
  return React.createElement(
    Suspense,
    { fallback: fallback || defaultFallback },
    children
  );
};
