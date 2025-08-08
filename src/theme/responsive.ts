// Mobile-first responsive design system for the lottery dApp

// Breakpoints using mobile-first approach
export const breakpoints = {
  // Mobile first - these are min-width breakpoints
  sm: '480px',    // Small phones landscape
  md: '768px',    // Tablets portrait
  lg: '1024px',   // Tablets landscape / small laptops
  xl: '1280px',   // Desktop
  xxl: '1536px',  // Large desktop
} as const;

// Media query helpers
export const mediaQueries = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  xxl: `@media (min-width: ${breakpoints.xxl})`,
  
  // Max-width queries for specific ranges
  maxSm: '@media (max-width: 479px)',
  maxMd: '@media (max-width: 767px)',
  maxLg: '@media (max-width: 1023px)',
  maxXl: '@media (max-width: 1279px)',
  
  // Specific device queries
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
  
  // Orientation queries
  landscape: '@media (orientation: landscape)',
  portrait: '@media (orientation: portrait)',
  
  // High DPI displays
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  
  // Touch vs pointer devices
  touch: '@media (hover: none) and (pointer: coarse)',
  pointer: '@media (hover: hover) and (pointer: fine)',
  
  // Reduced motion preference
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // Dark mode preference
  darkMode: '@media (prefers-color-scheme: dark)',
  lightMode: '@media (prefers-color-scheme: light)',
} as const;

// Container widths for different breakpoints
export const containerWidths = {
  sm: '100%',
  md: '750px',
  lg: '970px',
  xl: '1170px',
  xxl: '1320px',
} as const;

// Grid system
export const grid = {
  columns: 12,
  gutter: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  },
  container: {
    padding: {
      mobile: '16px',
      tablet: '24px',
      desktop: '32px',
    },
    maxWidth: '1200px',
  },
} as const;

// Spacing scale that works well across all screen sizes
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  xxl: '3rem',     // 48px
  xxxl: '4rem',    // 64px
  
  // Responsive spacing
  responsive: {
    xs: {
      mobile: '0.25rem',
      tablet: '0.375rem',
      desktop: '0.5rem',
    },
    sm: {
      mobile: '0.5rem',
      tablet: '0.75rem',
      desktop: '1rem',
    },
    md: {
      mobile: '1rem',
      tablet: '1.25rem',
      desktop: '1.5rem',
    },
    lg: {
      mobile: '1.5rem',
      tablet: '2rem',
      desktop: '2.5rem',
    },
    xl: {
      mobile: '2rem',
      tablet: '2.5rem',
      desktop: '3rem',
    },
  },
} as const;

// Typography scale optimized for mobile readability
export const typography = {
  fontSizes: {
    xs: {
      mobile: '0.75rem',   // 12px  
      tablet: '0.8125rem', // 13px
      desktop: '0.875rem', // 14px
    },
    sm: {
      mobile: '0.875rem',  // 14px
      tablet: '0.9375rem', // 15px
      desktop: '1rem',     // 16px
    },
    base: {
      mobile: '1rem',      // 16px
      tablet: '1.0625rem', // 17px
      desktop: '1.125rem', // 18px
    },
    lg: {
      mobile: '1.125rem',  // 18px
      tablet: '1.25rem',   // 20px
      desktop: '1.375rem', // 22px
    },
    xl: {
      mobile: '1.25rem',   // 20px
      tablet: '1.5rem',    // 24px
      desktop: '1.75rem',  // 28px
    },
    '2xl': {
      mobile: '1.5rem',    // 24px
      tablet: '2rem',      // 32px
      desktop: '2.5rem',   // 40px
    },
    '3xl': {
      mobile: '1.875rem',  // 30px
      tablet: '2.5rem',    // 40px
      desktop: '3rem',     // 48px
    },
    '4xl': {
      mobile: '2.25rem',   // 36px
      tablet: '3rem',      // 48px
      desktop: '3.75rem',  // 60px
    },
  },
  
  // Line heights optimized for readability
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  
  // Font weights
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Component-specific responsive utilities
export const components = {
  button: {
    height: {
      sm: {
        mobile: '32px',
        tablet: '36px',
        desktop: '40px',
      },
      md: {
        mobile: '40px',
        tablet: '44px',
        desktop: '48px',
      },
      lg: {
        mobile: '48px',
        tablet: '52px',
        desktop: '56px',
      },
    },
    padding: {
      sm: {
        mobile: '8px 16px',
        tablet: '10px 20px',
        desktop: '12px 24px',
      },
      md: {
        mobile: '12px 20px',
        tablet: '14px 24px',
        desktop: '16px 28px',
      },
      lg: {
        mobile: '16px 24px',
        tablet: '18px 28px',
        desktop: '20px 32px',
      },
    },
  },
  
  card: {
    padding: {
      mobile: '16px',
      tablet: '20px',
      desktop: '24px',
    },
    borderRadius: {
      mobile: '8px',
      tablet: '12px',
      desktop: '16px',
    },
  },
  
  modal: {
    width: {
      mobile: '95%',
      tablet: '80%',
      desktop: '60%',
    },
    maxWidth: {
      mobile: '400px',
      tablet: '600px',
      desktop: '800px',
    },
    padding: {
      mobile: '20px',
      tablet: '24px',
      desktop: '32px',
    },
  },
} as const;

// Touch target sizes (minimum 44px for accessibility)
export const touchTargets = {
  minimum: '44px',
  comfortable: '48px',
  large: '56px',
} as const;

// Safe area insets for devices with notches
export const safeArea = {
  top: 'env(safe-area-inset-top)',
  right: 'env(safe-area-inset-right)',
  bottom: 'env(safe-area-inset-bottom)',
  left: 'env(safe-area-inset-left)',
} as const;

// Utility functions for responsive design
export const getResponsiveValue = (
  values: { mobile: string; tablet?: string; desktop?: string },
  device: 'mobile' | 'tablet' | 'desktop' = 'mobile'
): string => {
  return values[device] || values.mobile;
};

export const createResponsiveProperty = (
  property: string,
  values: { mobile: string; tablet?: string; desktop?: string }
): string => {
  let css = `${property}: ${values.mobile};`;
  
  if (values.tablet) {
    css += `
      ${mediaQueries.md} {
        ${property}: ${values.tablet};
      }
    `;
  }
  
  if (values.desktop) {
    css += `
      ${mediaQueries.lg} {
        ${property}: ${values.desktop};
      }
    `;
  }
  
  return css;
};

// Fluid typography utility
export const createFluidTypography = (
  minSize: number,
  maxSize: number,
  minViewport: number = 320,
  maxViewport: number = 1200
): string => {
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const yAxisIntersection = -minViewport * slope + minSize;
  
  return `
    font-size: ${minSize}px;
    font-size: clamp(${minSize}px, ${yAxisIntersection}px + ${slope * 100}vw, ${maxSize}px);
  `;
};

// Container query utilities (for modern browsers)
export const containerQueries = {
  sm: '@container (min-width: 320px)',
  md: '@container (min-width: 480px)',
  lg: '@container (min-width: 768px)',
  xl: '@container (min-width: 1024px)',
} as const;

// Aspect ratio utilities
export const aspectRatios = {
  square: '1 / 1',
  landscape: '4 / 3',
  widescreen: '16 / 9',
  ultrawide: '21 / 9',
  portrait: '3 / 4',
  golden: '1.618 / 1',
} as const;

// Animation durations optimized for different screen sizes
export const animations = {
  duration: {
    fast: {
      mobile: '150ms',
      tablet: '200ms',
      desktop: '250ms',
    },
    normal: {
      mobile: '200ms',
      tablet: '250ms',
      desktop: '300ms',
    },
    slow: {
      mobile: '300ms',
      tablet: '400ms',
      desktop: '500ms',
    },
  },
  
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Export everything as a single responsive theme object
export const responsiveTheme = {
  breakpoints,
  mediaQueries,
  containerWidths,
  grid,
  spacing,
  typography,
  components,
  touchTargets,
  safeArea,
  containerQueries,
  aspectRatios,
  animations,
  
  // Utility functions
  getResponsiveValue,
  createResponsiveProperty,
  createFluidTypography,
} as const;