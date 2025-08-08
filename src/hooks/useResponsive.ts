import { useState, useEffect, useCallback } from 'react';
import { breakpoints } from '../theme/responsive';

// Device detection types
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type BreakpointKey = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  breakpoint: BreakpointKey;
  isTouchDevice: boolean;
  pixelRatio: number;
}

// Custom hook for responsive design
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        deviceType: 'mobile' as DeviceType,
        screenWidth: 320,
        screenHeight: 568,
        orientation: 'portrait' as const,
        breakpoint: 'sm' as BreakpointKey,
        isTouchDevice: false,
        pixelRatio: 1,
      };
    }

    return getResponsiveState();
  });

  const getResponsiveState = useCallback((): ResponsiveState => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Determine device type based on screen width
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    
    let deviceType: DeviceType = 'mobile';
    if (isDesktop) deviceType = 'desktop';
    else if (isTablet) deviceType = 'tablet';

    // Determine current breakpoint
    let breakpoint: BreakpointKey = 'sm';
    if (width >= parseInt(breakpoints.xxl)) breakpoint = 'xxl';
    else if (width >= parseInt(breakpoints.xl)) breakpoint = 'xl';
    else if (width >= parseInt(breakpoints.lg)) breakpoint = 'lg';
    else if (width >= parseInt(breakpoints.md)) breakpoint = 'md';

    // Detect touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Get pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;

    return {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      screenWidth: width,
      screenHeight: height,
      orientation,
      breakpoint,
      isTouchDevice,
      pixelRatio,
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setState(getResponsiveState());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial measurement
    setState(getResponsiveState());

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [getResponsiveState]);

  return state;
};

// Hook for media query matching
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
};

// Hook for breakpoint-specific values
export const useBreakpointValue = <T>(values: Partial<Record<BreakpointKey, T>>): T | undefined => {
  const { breakpoint } = useResponsive();
  
  // Return the value for current breakpoint or the closest smaller one
  const breakpointOrder: BreakpointKey[] = ['sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
};

// Hook for container queries (experimental)
export const useContainerQuery = (containerRef: React.RefObject<HTMLElement>, query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Check if container queries are supported
    if ('container' in document.documentElement.style) {
      // Use ResizeObserver as fallback for container queries
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const width = entry.contentRect.width;
          // Parse simple width queries like "(min-width: 400px)"
          const match = query.match(/min-width:\s*(\d+)px/);
          if (match) {
            const minWidth = parseInt(match[1]);
            setMatches(width >= minWidth);
          }
        }
      });

      observer.observe(container);
      return () => observer.disconnect();
    }
  }, [containerRef, query]);

  return matches;
};

// Hook for safe area insets (iOS devices with notches)
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
      });
    };

    // Set CSS custom properties for safe area insets
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
};

// Hook for reduced motion preference
export const useReducedMotion = (): boolean => {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
};

// Hook for color scheme preference
export const useColorSchemePreference = (): 'light' | 'dark' | null => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');
  
  if (prefersDark) return 'dark';
  if (prefersLight) return 'light';
  return null;
};

// Hook for high contrast preference
export const useHighContrast = (): boolean => {
  return useMediaQuery('(prefers-contrast: high)');
};

// Hook for hover capability detection
export const useHoverCapability = (): boolean => {
  return useMediaQuery('(hover: hover) and (pointer: fine)');
};

// Hook for network information (experimental)
export const useNetworkInfo = () => {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
  });

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  return networkInfo;
};

// Hook for responsive font size
export const useResponsiveFontSize = (
  sizes: { mobile: string; tablet?: string; desktop?: string }
) => {
  const { deviceType } = useResponsive();
  
  switch (deviceType) {
    case 'desktop':
      return sizes.desktop || sizes.tablet || sizes.mobile;
    case 'tablet':
      return sizes.tablet || sizes.mobile;
    default:
      return sizes.mobile;
  }
};

// Hook for responsive spacing
export const useResponsiveSpacing = (
  spacing: { mobile: string; tablet?: string; desktop?: string }
) => {
  const { deviceType } = useResponsive();
  
  switch (deviceType) {
    case 'desktop':
      return spacing.desktop || spacing.tablet || spacing.mobile;
    case 'tablet':
      return spacing.tablet || spacing.mobile;
    default:
      return spacing.mobile;
  }
};