import { colors } from './colors';
import { breakpoints, mediaQueries } from './responsive';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    background: string;
    text: string;
    cardBackground: string;
    shadow: string;
    base: {
      white: string;
      black: string;
    };
    complementary: {
      darkGreen: string;
      lightGreen: string;
    };
    accent: {
      yellow: string;
      blue: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    circle: string;
  };
  breakpoints: typeof breakpoints;
  mediaQueries: typeof mediaQueries;
  transition: string;
}

export const createTheme = (mode: ThemeMode): Theme => ({
  mode,
  colors: {
    primary: colors.primary,
    background: colors.theme[mode].background,
    text: colors.theme[mode].text,
    cardBackground: colors.theme[mode].cardBackground,
    shadow: colors.theme[mode].shadow,
    base: colors.base,
    complementary: colors.complementary,
    accent: colors.accent,
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    circle: '50%',
  },
  breakpoints,
  mediaQueries,
  transition: 'all 0.3s ease-in-out',
});