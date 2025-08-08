import Web3 from 'web3';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';

// Función para diagnosticar problemas del contrato en detalle
export const runAdvancedContractDiagnostic = async (): Promise<any> => {
  console.log('🔬 Running advanced contract diagnostics...');
  
  const diagnosticResult: any = {
    timestamp: new Date().toISOString(),
    contractAddress: process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS,
    rpcUrl: process.env.REACT_APP_BSC_MAINNET_RPC,
    tests: {}
  };

  try {
    // 1. Test RPC Connection
    console.log('1️⃣ Testing RPC connection...');
    const rpcUrl = process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
    
    const blockNumber = await web3.eth.getBlockNumber();
    diagnosticResult.tests.rpcConnection = {
      success: true,
      blockNumber,
      rpcUrl
    };
    console.log('✅ RPC Connection OK, Block:', blockNumber);

    // 2. Test Contract Address
    console.log('2️⃣ Testing contract address...');
    const contractAddress = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
    const contractCode = await web3.eth.getCode(contractAddress);
    
    diagnosticResult.tests.contractExists = {
      success: contractCode !== '0x',
      contractAddress,
      codeLength: contractCode.length
    };
    
    if (contractCode === '0x') {
      console.log('❌ Contract not found at address:', contractAddress);
      return diagnosticResult;
    }
    console.log('✅ Contract exists, Code length:', contractCode.length);

    // 3. Test Contract Instance
    console.log('3️⃣ Creating contract instance...');
    const contract = new web3.eth.Contract(MultiTierLotteryABI as any, contractAddress);
    diagnosticResult.tests.contractInstance = { success: true };

    // 4. Test Individual Methods with detailed error handling
    console.log('4️⃣ Testing contract methods...');
    const methods = [
      'getCurrentPool',
      'getAccumulatedJackpot', 
      'getTicketPrice',
      'getTimeUntilNextDraw',
      'getBulkDiscountTiers'
    ];

    for (const methodName of methods) {
      try {
        console.log(`📞 Calling ${methodName}...`);
        const result = await contract.methods[methodName]().call();
        console.log(`✅ ${methodName}:`, result);
        
        diagnosticResult.tests[methodName] = {
          success: true,
          result: result?.toString() || result,
          type: typeof result
        };
      } catch (error: any) {
        console.log(`❌ ${methodName} error:`, error.message);
        diagnosticResult.tests[methodName] = {
          success: false,
          error: error.message,
          errorCode: error.code
        };
      }
    }

    // 5. Test Owner Method (read-only)
    try {
      console.log('5️⃣ Testing owner method...');
      const owner = await contract.methods.owner().call();
      console.log('✅ Contract owner:', owner);
      diagnosticResult.tests.owner = { success: true, result: owner };
    } catch (error: any) {
      console.log('❌ Owner method error:', error.message);
      diagnosticResult.tests.owner = { success: false, error: error.message };
    }

    // 6. Test ABI Methods List
    console.log('6️⃣ Available ABI methods:');
    const abiMethods = MultiTierLotteryABI
      .filter((item: any) => item.type === 'function' && item.stateMutability === 'view')
      .map((item: any) => item.name);
    
    console.log('📋 Available methods:', abiMethods);
    diagnosticResult.tests.availableMethods = {
      success: true,
      methods: abiMethods
    };

  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    diagnosticResult.tests.generalError = {
      success: false,
      error: error.message
    };
  }

  console.log('🔬 Advanced diagnostic completed:', diagnosticResult);
  return diagnosticResult;
};

// Helper para generar reporte legible
export const generateDiagnosticReport = (result: any): string => {
  let report = `
🔬 ADVANCED CONTRACT DIAGNOSTIC REPORT
======================================
Timestamp: ${result.timestamp}
Contract: ${result.contractAddress}
RPC: ${result.rpcUrl}

`;

  Object.entries(result.tests).forEach(([testName, testResult]: [string, any]) => {
    const status = testResult.success ? '✅' : '❌';
    report += `${status} ${testName.toUpperCase()}: ${testResult.success ? 'PASS' : 'FAIL'}\n`;
    
    if (!testResult.success && testResult.error) {
      report += `   Error: ${testResult.error}\n`;
    }
    
    if (testResult.result !== undefined) {
      report += `   Result: ${testResult.result}\n`;
    }
    
    report += '\n';
  });

  return report;
};
