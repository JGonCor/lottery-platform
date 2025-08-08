import React, { useState, useEffect } from 'react';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { Web3ReactProvider } from '@web3-react/core';
import { BrowserRouter as Router } from 'react-router-dom';
import { createTheme, ThemeMode } from './theme/theme';
// Configuración simple para mainnet
const config = {
  chainId: 56,
  networkName: 'BSC Mainnet',
  appName: process.env.REACT_APP_APP_NAME || 'BSC Lottery Platform'
};
import { connectors } from './utils/web3';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Import lazy routes component
import LazyRoutes from './components/LazyRoutes';

import styled from 'styled-components';

// Global styles
const GlobalStyle = createGlobalStyle<{ theme: any }>`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.6;
    transition: ${({ theme }) => theme.transition};
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: ${({ theme }) => theme.transition};

    &:hover {
      text-decoration: underline;
    }
  }

  button {
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.primary}dd;
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

// Theme storage key
const THEME_STORAGE_KEY = 'lottery-theme';

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        return (savedTheme === 'dark' || savedTheme === 'light') 
          ? savedTheme 
          : 'light';
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    return 'light';
  });
  
  const theme = createTheme(themeMode);

  const toggleTheme = () => {
    setThemeMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // Guardar en localStorage para persistencia
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(THEME_STORAGE_KEY, newMode);
        }
      } catch (error) {
        console.warn('Cannot save theme to localStorage:', error);
      }
      return newMode;
    });
  };
  
  // Efecto para establecer el atributo data-theme en el documento y validar configuración
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', themeMode);
      
      // Establecer título dinámico
      document.title = config.appName;
    } catch (error) {
      console.error('App initialization error:', error);
      // Fallback title if config fails
      document.title = 'BSC Lottery Platform';
    }
  }, [themeMode]);

  return (
    <Web3ReactProvider connectors={connectors}>
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <GlobalStyle theme={theme} />
          <Router>
            <AppContainer>
              <Header toggleTheme={toggleTheme} currentTheme={themeMode} />
              
              <MainContent>
                <LazyRoutes />
              </MainContent>
              
              <Footer />
            </AppContainer>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </Web3ReactProvider>
  );
}

export default App;