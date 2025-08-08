import { useState, useRef, useCallback, useEffect } from 'react';

// Hook personalizado para manejar datos con cleanup automático de memoria
export function useMemoryOptimizedData<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Referencias para cleanup
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Función segura para actualizar estado
  const safeSetData = useCallback((newData: T) => {
    if (mountedRef.current) {
      setData(newData);
    }
  }, []);

  const safeSetLoading = useCallback((loading: boolean) => {
    if (mountedRef.current) {
      setIsLoading(loading);
    }
  }, []);

  const safeSetError = useCallback((errorMsg: string | null) => {
    if (mountedRef.current) {
      setError(errorMsg);
    }
  }, []);

  // Función para ejecutar operaciones async con timeout
  const executeWithTimeout = useCallback(async <R>(
    operation: (signal?: AbortSignal) => Promise<R>,
    timeoutMs: number = 10000
  ): Promise<R | null> => {
    if (!mountedRef.current) return null;

    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    
    return new Promise<R | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        reject(new Error('Operation timeout'));
      }, timeoutMs);

      operation(abortControllerRef.current?.signal)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            resolve(null);
          } else {
            reject(error);
          }
        });
    });
  }, []);

  // Función para programar retry con cleanup
  const scheduleRetry = useCallback((
    retryFn: () => void, 
    delayMs: number
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (mountedRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          retryFn();
        }
      }, delayMs);
    }
  }, []);

  // Cleanup automático al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    safeSetData,
    safeSetLoading,
    safeSetError,
    executeWithTimeout,
    scheduleRetry,
    isComponentMounted: () => mountedRef.current
  };
}
