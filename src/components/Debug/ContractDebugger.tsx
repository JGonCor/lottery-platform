import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { runContractDiagnostics, ContractDiagnostic, testContractMethod } from '../../utils/contractDiagnostics';
import Card from '../UI/Card';
import Button from '../UI/Button';

const DebugContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const DiagnosticCard = styled(Card)<{ status: 'success' | 'error' | 'warning' }>`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border-left: 4px solid ${({ status }) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#2196F3';
    }
  }};
`;

const DiagnosticHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const StatusIcon = styled.span<{ status: 'success' | 'error' | 'warning' }>`
  font-size: 1.2rem;
`;

const TestName = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const Message = styled.p`
  margin: ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Details = styled.pre`
  background: ${({ theme }) => theme.colors.cardBackground};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: 0.8rem;
  overflow-x: auto;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
`;

const ActionSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const QuickTestCard = styled(Card)`
  text-align: center;
`;

const QuickTestTitle = styled.h4`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const TestResult = styled.div<{ success?: boolean }>`
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ success }) => 
    success === true ? 'rgba(76, 175, 80, 0.1)' : 
    success === false ? 'rgba(244, 67, 54, 0.1)' : 
    'transparent'
  };
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid ${({ theme }) => theme.colors.primary}33;
  border-radius: 50%;
  border-top-color: ${({ theme }) => theme.colors.primary};
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ContractDebugger: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<ContractDiagnostic[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [quickTestResults, setQuickTestResults] = useState<{[key: string]: any}>({});
  const [quickTestLoading, setQuickTestLoading] = useState<{[key: string]: boolean}>({});

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await runContractDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async (testName: string, methodName: string, ...args: any[]) => {
    setQuickTestLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testContractMethod(methodName, ...args);
      setQuickTestResults(prev => ({ 
        ...prev, 
        [testName]: { success: true, data: result } 
      }));
    } catch (error) {
      setQuickTestResults(prev => ({ 
        ...prev, 
        [testName]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } 
      }));
    } finally {
      setQuickTestLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '🔍';
    }
  };

  return (
    <DebugContainer>
      <Title>🔍 Diagnóstico del Contrato de Lotería</Title>
      
      <ActionSection>
        <QuickTestCard>
          <QuickTestTitle>🎲 Información Básica</QuickTestTitle>
          <Button 
            variant="outline" 
            size="small"
            onClick={() => runQuickTest('ticketPrice', 'ticketPrice')}
            disabled={quickTestLoading.ticketPrice}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            {quickTestLoading.ticketPrice ? <LoadingSpinner /> : 'Precio del Ticket'}
          </Button>
          
          {quickTestResults.ticketPrice && (
            <TestResult success={quickTestResults.ticketPrice.success}>
              {quickTestResults.ticketPrice.success 
                ? `Precio: ${typeof quickTestResults.ticketPrice.data === 'string' 
                    ? quickTestResults.ticketPrice.data 
                    : JSON.stringify(quickTestResults.ticketPrice.data)} wei`
                : `Error: ${quickTestResults.ticketPrice.error}`
              }
            </TestResult>
          )}
        </QuickTestCard>

        <QuickTestCard>
          <QuickTestTitle>📊 Estadísticas</QuickTestTitle>
          <Button 
            variant="outline" 
            size="small"
            onClick={() => runQuickTest('stats', 'getLotteryStatistics')}
            disabled={quickTestLoading.stats}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            {quickTestLoading.stats ? <LoadingSpinner /> : 'Estadísticas'}
          </Button>
          
          {quickTestResults.stats && (
            <TestResult success={quickTestResults.stats.success}>
              {quickTestResults.stats.success 
                ? `Datos obtenidos ✅`
                : `Error: ${quickTestResults.stats.error}`
              }
            </TestResult>
          )}
        </QuickTestCard>
      </ActionSection>

      <Card style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'inherit' }}>Diagnósticos Completos</h3>
          <Button 
            variant="primary" 
            size="small"
            onClick={runDiagnostics}
            disabled={isRunning}
          >
            {isRunning ? <LoadingSpinner /> : 'Ejecutar Diagnósticos'}
          </Button>
        </div>
        
        {diagnostics.length === 0 && !isRunning && (
          <Message>Presiona "Ejecutar Diagnósticos" para verificar el contrato</Message>
        )}
      </Card>

      {diagnostics.map((diagnostic, index) => (
        <DiagnosticCard key={index} status={diagnostic.status}>
          <DiagnosticHeader>
            <StatusIcon status={diagnostic.status}>
              {getStatusIcon(diagnostic.status)}
            </StatusIcon>
            <TestName>{diagnostic.test}</TestName>
          </DiagnosticHeader>
          
          <Message>{diagnostic.message}</Message>
          
          {diagnostic.details && (
            <Details>
              {(() => {
                try {
                  return JSON.stringify(diagnostic.details, null, 2);
                } catch (error) {
                  return `Error displaying details: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
              })()}
            </Details>
          )}
        </DiagnosticCard>
      ))}

      {diagnostics.length > 0 && (
        <Card style={{ marginTop: '2rem', backgroundColor: 'rgba(33, 150, 243, 0.1)' }}>
          <h4 style={{ color: 'inherit', marginTop: 0 }}>📋 Resumen</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                {diagnostics.filter(d => d.status === 'success').length}
              </div>
              <div>Exitosos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>
                {diagnostics.filter(d => d.status === 'warning').length}
              </div>
              <div>Advertencias</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F44336' }}>
                {diagnostics.filter(d => d.status === 'error').length}
              </div>
              <div>Errores</div>
            </div>
          </div>
        </Card>
      )}
    </DebugContainer>
  );
};

export default ContractDebugger;
