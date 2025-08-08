import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${({ theme }) => theme.spacing.xl};
  background-color: ${({ theme }) => theme.colors.cardBackground};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid #ff6b6b;
  margin: ${({ theme }) => theme.spacing.lg};
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  background-color: #ff6b6b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  &::before {
    content: '⚠';
    font-size: 2.5rem;
    color: white;
  }
`;

const ErrorTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  max-width: 600px;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-top: ${({ theme }) => theme.spacing.lg};
  max-width: 800px;
  width: 100%;
  
  summary {
    cursor: pointer;
    padding: ${({ theme }) => theme.spacing.sm};
    background-color: ${({ theme }) => theme.colors.background};
    border-radius: ${({ theme }) => theme.borderRadius.sm};
    color: ${({ theme }) => theme.colors.text};
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.cardBackground};
    }
  }
`;

const ErrorStack = styled.pre`
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const ActionButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: ${({ theme }) => theme.spacing.sm};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Send error to monitoring service (Sentry, LogRocket, etc.)
    try {
      if (process.env.REACT_APP_SENTRY_DSN) {
        // Example Sentry integration
        console.log('Reporting error to Sentry:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        });
      }

      // Send to custom error endpoint
      if (process.env.REACT_APP_ERROR_ENDPOINT) {
        fetch(process.env.REACT_APP_ERROR_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            errorInfo: {
              componentStack: errorInfo.componentStack,
            },
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: localStorage.getItem('user_address') || 'anonymous',
          }),
        }).catch(reportError => {
          console.warn('Failed to report error:', reportError);
        });
      }
    } catch (reportError) {
      console.warn('Error while reporting error:', reportError);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <ErrorContainer role="alert">
          <ErrorIcon />
          
          <ErrorTitle>
            Oops! Something went wrong
          </ErrorTitle>
          
          <ErrorMessage>
            We're sorry for the inconvenience. The application has encountered an unexpected error. 
            {isDevelopment && error && (
              <>
                <br /><br />
                <strong>Error:</strong> {error.message}
              </>
            )}
          </ErrorMessage>

          <ButtonGroup>
            <ActionButton onClick={this.handleReset}>
              Try Again
            </ActionButton>
            
            <ActionButton onClick={this.handleReload}>
              Reload Page
            </ActionButton>
            
            <ActionButton onClick={this.handleGoHome}>
              Go Home
            </ActionButton>
            
            <ActionButton onClick={this.handleClearStorage}>
              Clear Data & Reload
            </ActionButton>
          </ButtonGroup>

          {isDevelopment && error && errorInfo && (
            <ErrorDetails>
              <summary>
                Show technical details (Development Mode)
              </summary>
              
              <ErrorStack>
                <strong>Error Stack:</strong>
                {error.stack}
              </ErrorStack>
              
              <ErrorStack>
                <strong>Component Stack:</strong>
                {errorInfo.componentStack}
              </ErrorStack>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

// Hook for programmatic error handling
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // Report to monitoring service
    if (process.env.REACT_APP_ERROR_ENDPOINT) {
      fetch(process.env.REACT_APP_ERROR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(reportError => {
        console.warn('Failed to report error:', reportError);
      });
    }
  };

  return { handleError };
};

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;