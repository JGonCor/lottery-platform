import React, { useState } from 'react';
import styled from 'styled-components';
import Card from '../UI/Card';
import Button from '../UI/Button';

const TestContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  text-align: center;
`;

const TestCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const TestTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const TestResult = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing.md};
  background-color: ${({ type }) => {
    switch (type) {
      case 'success': return 'rgba(76, 175, 80, 0.1)';
      case 'error': return 'rgba(244, 67, 54, 0.1)';
      default: return 'rgba(33, 150, 243, 0.1)';
    }
  }};
  border: 1px solid ${({ type }) => {
    switch (type) {
      case 'success': return 'rgba(76, 175, 80, 0.3)';
      case 'error': return 'rgba(244, 67, 54, 0.3)';
      default: return 'rgba(33, 150, 243, 0.3)';
    }
  }};
`;

const CodeBlock = styled.pre`
  background: ${({ theme }) => theme.colors.cardBackground};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  overflow-x: auto;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => 
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
`;

const SimpleContractTest: React.FC = () => {
  const [testResults, setTestResults] = useState<{[key: string]: any}>({});
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});

  const contractAddress = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
  const usdtAddress = process.env.REACT_APP_USDT_CONTRACT_ADDRESS || '';

  const runBasicTest = async (testName: string) => {
    setIsLoading(prev => ({ ...prev, [testName]: true }));
    
    try {
      // Simple Web3 connection test
      const Web3 = (await import('web3')).default;
      const web3 = new Web3('https://bsc-dataseed.binance.org/');
      
      let result: any = {};
      
      switch (testName) {
        case 'connection':
          const blockNumber = await web3.eth.getBlockNumber();
          result = {
            success: true,
            message: `Conectado a BSC - Bloque: ${blockNumber.toString()}`,
            data: { blockNumber: blockNumber.toString() }
          };
          break;
          
        case 'contract':
          const code = await web3.eth.getCode(contractAddress);
          const hasContract = code !== '0x' && code !== '0x0';
          result = {
            success: hasContract,
            message: hasContract 
              ? `Contrato encontrado en ${contractAddress.slice(0, 10)}...`
              : `No hay contrato en ${contractAddress.slice(0, 10)}...`,
            data: { 
              address: contractAddress,
              hasCode: hasContract,
              codeLength: code.length 
            }
          };
          break;
          
        case 'usdt':
          try {
            const TokenABI = [
              {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},
              {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
              {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}
            ];
            
            const usdtContract = new web3.eth.Contract(TokenABI, usdtAddress);
            const name = await usdtContract.methods.name().call();
            const symbol = await usdtContract.methods.symbol().call();
            const decimals = await usdtContract.methods.decimals().call();
            
            result = {
              success: true,
              message: `USDT Contract: ${name} (${symbol})`,
              data: { 
                name: name.toString(),
                symbol: symbol.toString(),
                decimals: decimals.toString(),
                address: usdtAddress 
              }
            };
          } catch (usdtError) {
            result = {
              success: false,
              message: `Error con USDT: ${usdtError instanceof Error ? usdtError.message : 'Unknown'}`,
              data: { error: usdtError }
            };
          }
          break;
          
        case 'owner':
          try {
            // Try to get owner using simple ABI
            const simpleABI = [
              {"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"}
            ];
            
            const contract = new web3.eth.Contract(simpleABI, contractAddress);
            const owner = await contract.methods.owner().call();
            
            result = {
              success: true,
              message: `Owner encontrado: ${owner.toString().slice(0, 10)}...`,
              data: { owner: owner.toString() }
            };
          } catch (ownerError) {
            result = {
              success: false,
              message: `No se pudo obtener owner: ${ownerError instanceof Error ? ownerError.message : 'Unknown'}`,
              data: { error: ownerError }
            };
          }
          break;
          
        case 'lottery-methods':
          try {
            // Test métodos CORRECTOS según el ABI real del contrato
            const lotteryABI = [
              {"constant":true,"inputs":[],"name":"getTicketPrice","outputs":[{"name":"","type":"uint256"}],"type":"function"},
              {"constant":true,"inputs":[],"name":"getAccumulatedJackpot","outputs":[{"name":"","type":"uint256"}],"type":"function"},
              {"constant":true,"inputs":[],"name":"getTimeUntilNextDraw","outputs":[{"name":"","type":"uint256"}],"type":"function"},
              {"constant":true,"inputs":[],"name":"getCurrentPool","outputs":[{"name":"","type":"uint256"}],"type":"function"},
              {"constant":true,"inputs":[],"name":"getBulkDiscountTiers","outputs":[{"name":"tier1Tickets","type":"uint256"},{"name":"tier1Discount","type":"uint256"},{"name":"tier2Tickets","type":"uint256"},{"name":"tier2Discount","type":"uint256"},{"name":"tier3Tickets","type":"uint256"},{"name":"tier3Discount","type":"uint256"}],"type":"function"}
            ];
            
            const contract = new web3.eth.Contract(lotteryABI, contractAddress);
            const methodResults: any = {};
            
            // Métodos CORRECTOS que realmente existen en el contrato
            const methods = ['getTicketPrice', 'getAccumulatedJackpot', 'getTimeUntilNextDraw', 'getCurrentPool', 'getBulkDiscountTiers'];
            
            for (const method of methods) {
              try {
                const methodResult = await contract.methods[method]().call();
                if (method === 'getBulkDiscountTiers') {
                  // Este método devuelve 6 valores separados, no un array
                  methodResults[method] = `Tier1: ${methodResult.tier1Tickets} tickets, ${methodResult.tier1Discount}% - Tier2: ${methodResult.tier2Tickets} tickets, ${methodResult.tier2Discount}% - Tier3: ${methodResult.tier3Tickets} tickets, ${methodResult.tier3Discount}%`;
                } else {
                  methodResults[method] = methodResult.toString();
                }
              } catch (methodError) {
                methodResults[method] = `ERROR: ${methodError instanceof Error ? methodError.message : 'Unknown'}`;
              }
            }
            
            result = {
              success: true,
              message: `✅ Métodos correctos del contrato probados`,
              data: methodResults
            };
          } catch (lotteryError) {
            result = {
              success: false,
              message: `Error probando métodos: ${lotteryError instanceof Error ? lotteryError.message : 'Unknown'}`,
              data: { error: lotteryError }
            };
          }
          break;
          
        default:
          result = {
            success: false,
            message: 'Test no implementado',
            data: {}
          };
      }
      
      setTestResults(prev => ({ ...prev, [testName]: result }));
      
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: { error }
        }
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  return (
    <TestContainer>
      <Title>🔧 Test Simplificado del Contrato</Title>
      
      <TestCard>
        <TestTitle>🌐 1. Conexión a BSC</TestTitle>
        <p>Verifica la conectividad básica con Binance Smart Chain</p>
        <Button 
          variant="primary" 
          size="small"
          onClick={() => runBasicTest('connection')}
          disabled={isLoading.connection}
          style={{ marginTop: '1rem' }}
        >
          {isLoading.connection ? 'Probando...' : 'Probar Conexión'}
        </Button>
        
        {testResults.connection && (
          <TestResult type={testResults.connection.success ? 'success' : 'error'}>
            <strong>{testResults.connection.success ? '✅' : '❌'} {testResults.connection.message}</strong>
            <CodeBlock>{JSON.stringify(testResults.connection.data, null, 2)}</CodeBlock>
          </TestResult>
        )}
      </TestCard>

      <TestCard>
        <TestTitle>📄 2. Verificar Contrato</TestTitle>
        <p>Comprueba si existe código en la dirección del contrato</p>
        <Button 
          variant="primary" 
          size="small"
          onClick={() => runBasicTest('contract')}
          disabled={isLoading.contract}
          style={{ marginTop: '1rem' }}
        >
          {isLoading.contract ? 'Verificando...' : 'Verificar Contrato'}
        </Button>
        
        {testResults.contract && (
          <TestResult type={testResults.contract.success ? 'success' : 'error'}>
            <strong>{testResults.contract.success ? '✅' : '❌'} {testResults.contract.message}</strong>
            <CodeBlock>{JSON.stringify(testResults.contract.data, null, 2)}</CodeBlock>
          </TestResult>
        )}
      </TestCard>

      <TestCard>
        <TestTitle>💰 3. Verificar USDT</TestTitle>
        <p>Prueba la conectividad con el contrato de USDT</p>
        <Button 
          variant="primary" 
          size="small"
          onClick={() => runBasicTest('usdt')}
          disabled={isLoading.usdt}
          style={{ marginTop: '1rem' }}
        >
          {isLoading.usdt ? 'Verificando...' : 'Verificar USDT'}
        </Button>
        
        {testResults.usdt && (
          <TestResult type={testResults.usdt.success ? 'success' : 'error'}>
            <strong>{testResults.usdt.success ? '✅' : '❌'} {testResults.usdt.message}</strong>
            <CodeBlock>{JSON.stringify(testResults.usdt.data, null, 2)}</CodeBlock>
          </TestResult>
        )}
      </TestCard>

      <TestCard>
        <TestTitle>👑 4. Obtener Owner</TestTitle>
        <p>Intenta obtener el owner del contrato de lotería</p>
        <Button 
          variant="primary" 
          size="small"
          onClick={() => runBasicTest('owner')}
          disabled={isLoading.owner}
          style={{ marginTop: '1rem' }}
        >
          {isLoading.owner ? 'Obteniendo...' : 'Obtener Owner'}
        </Button>
        
        {testResults.owner && (
          <TestResult type={testResults.owner.success ? 'success' : 'error'}>
            <strong>{testResults.owner.success ? '✅' : '❌'} {testResults.owner.message}</strong>
            <CodeBlock>{JSON.stringify(testResults.owner.data, null, 2)}</CodeBlock>
          </TestResult>
        )}
      </TestCard>

      <TestCard>
        <TestTitle>🎲 5. Métodos CORRECTOS de Lotería</TestTitle>
        <p>Prueba los métodos que REALMENTE existen en el contrato según el ABI</p>
        <Button 
          variant="primary" 
          size="small"
          onClick={() => runBasicTest('lottery-methods')}
          disabled={isLoading['lottery-methods']}
          style={{ marginTop: '1rem' }}
        >
          {isLoading['lottery-methods'] ? 'Probando...' : 'Probar Métodos'}
        </Button>
        
        {testResults['lottery-methods'] && (
          <TestResult type={testResults['lottery-methods'].success ? 'success' : 'error'}>
            <strong>{testResults['lottery-methods'].success ? '✅' : '❌'} {testResults['lottery-methods'].message}</strong>
            <CodeBlock>{JSON.stringify(testResults['lottery-methods'].data, null, 2)}</CodeBlock>
          </TestResult>
        )}
      </TestCard>

      <TestCard style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
        <TestTitle>📋 Información de Configuración</TestTitle>
        <CodeBlock>{`Contrato de Lotería: ${contractAddress}
Contrato USDT: ${usdtAddress}
RPC: https://bsc-dataseed.binance.org/
Red: BSC Mainnet (Chain ID: 56)`}</CodeBlock>
      </TestCard>
    </TestContainer>
  );
};

export default SimpleContractTest;
