import Web3 from 'web3';
import { config } from '../config/environment';
import LotteryABI from '../contracts/LotteryABI.json';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';
import TokenABI from '../contracts/TokenABI.json';

// Contract addresses from environment
const LOTTERY_ADDRESS = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
const USDT_ADDRESS = process.env.REACT_APP_USDT_CONTRACT_ADDRESS || '';

export interface ContractDiagnostic {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export class ContractDiagnosticsRunner {
  private web3: Web3;
  private results: ContractDiagnostic[] = [];

  constructor() {
    // Initialize Web3 with BSC mainnet RPC
    this.web3 = new Web3('https://bsc-dataseed.binance.org/');
  }

  async runAllDiagnostics(): Promise<ContractDiagnostic[]> {
    this.results = [];
    
    console.log('🔍 Iniciando diagnósticos del contrato...');
    
    await this.testRPCConnection();
    await this.testContractExists();
    await this.testContractABI();
    await this.testContractMethods();
    await this.testContractData();
    await this.testUSDTContract();
    
    console.log('✅ Diagnósticos completados:', this.results);
    return this.results;
  }

  private addResult(test: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
    // Safe handling of BigInt in details
    let safeDetails = details;
    if (details) {
      try {
        safeDetails = JSON.parse(JSON.stringify(details, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
      } catch (error) {
        safeDetails = { error: 'Failed to serialize details', original: String(details) };
      }
    }
    this.results.push({ test, status, message, details: safeDetails });
  }

  private async testRPCConnection() {
    try {
      const blockNumber = await this.web3.eth.getBlockNumber();
      this.addResult(
        'RPC Connection',
        'success',
        `Conectado a BSC - Bloque actual: ${blockNumber}`,
        { blockNumber }
      );
    } catch (error) {
      this.addResult(
        'RPC Connection',
        'error',
        `Error conectando a BSC: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  private async testContractExists() {
    try {
      if (!LOTTERY_ADDRESS) {
        this.addResult(
          'Contract Address',
          'error',
          'Dirección del contrato no configurada en .env'
        );
        return;
      }

      const code = await this.web3.eth.getCode(LOTTERY_ADDRESS);
      
      if (code === '0x' || code === '0x0') {
        this.addResult(
          'Contract Exists',
          'error',
          `No hay contrato desplegado en ${LOTTERY_ADDRESS}`,
          { address: LOTTERY_ADDRESS, code }
        );
      } else {
        this.addResult(
          'Contract Exists',
          'success',
          `Contrato encontrado en ${LOTTERY_ADDRESS}`,
          { address: LOTTERY_ADDRESS, codeLength: code.length }
        );
      }
    } catch (error) {
      this.addResult(
        'Contract Exists',
        'error',
        `Error verificando contrato: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  private async testContractABI() {
    try {
      // Try with MultiTierLotteryABI first
      const contract = new this.web3.eth.Contract(MultiTierLotteryABI as any, LOTTERY_ADDRESS);
      
      // Try to call a simple view function
      const owner = await contract.methods.owner().call();
      
      this.addResult(
        'Contract ABI',
        'success',
        `ABI compatible - Owner: ${owner}`,
        { owner, abi: 'MultiTierLotteryABI' }
      );
    } catch (multiTierError) {
      try {
        // Fallback to regular LotteryABI
        const contract = new this.web3.eth.Contract(LotteryABI as any, LOTTERY_ADDRESS);
        const owner = await contract.methods.owner().call();
        
        this.addResult(
          'Contract ABI',
          'warning',
          `ABI compatible con LotteryABI básico - Owner: ${owner}`,
          { owner, abi: 'LotteryABI' }
        );
      } catch (basicError) {
        this.addResult(
          'Contract ABI',
          'error',
          `ABI incompatible: ${multiTierError instanceof Error ? multiTierError.message : 'Unknown error'}`,
          { multiTierError, basicError }
        );
      }
    }
  }

  private async testContractMethods() {
    try {
      const contract = new this.web3.eth.Contract(MultiTierLotteryABI as any, LOTTERY_ADDRESS);
      const methodResults: any = {};

      // Test critical methods
      const methodsToTest = [
        'owner',
        'paused',
        'ticketPrice',
        'getCurrentDraw',
        'getLatestDraw',
        'getLotteryStatistics'
      ];

      for (const method of methodsToTest) {
        try {
          const result = await contract.methods[method]().call();
          methodResults[method] = result;
        } catch (methodError) {
          methodResults[method] = `Error: ${methodError instanceof Error ? methodError.message : 'Unknown'}`;
        }
      }

      this.addResult(
        'Contract Methods',
        'success',
        'Métodos del contrato accesibles',
        methodResults
      );
    } catch (error) {
      this.addResult(
        'Contract Methods',
        'error',
        `Error probando métodos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  private async testContractData() {
    try {
      const contract = new this.web3.eth.Contract(MultiTierLotteryABI as any, LOTTERY_ADDRESS);
      
      // Get lottery statistics
      const stats = await contract.methods.getLotteryStatistics().call();
      const currentDraw = await contract.methods.getCurrentDraw().call();
      const latestDraw = await contract.methods.getLatestDraw().call();
      
      const dataResults = {
        stats,
        currentDraw,
        latestDraw,
        hasData: !!(stats && currentDraw)
      };

      this.addResult(
        'Contract Data',
        dataResults.hasData ? 'success' : 'warning',
        dataResults.hasData 
          ? 'Datos de la lotería disponibles'
          : 'Contrato sin datos de lotería inicializados',
        dataResults
      );
    } catch (error) {
      this.addResult(
        'Contract Data',
        'error',
        `Error obteniendo datos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  private async testUSDTContract() {
    try {
      if (!USDT_ADDRESS) {
        this.addResult(
          'USDT Contract',
          'warning',
          'Dirección USDT no configurada'
        );
        return;
      }

      const contract = new this.web3.eth.Contract(TokenABI as any, USDT_ADDRESS);
      const name = await contract.methods.name().call();
      const symbol = await contract.methods.symbol().call();
      const decimals = await contract.methods.decimals().call();
      
      this.addResult(
        'USDT Contract',
        'success',
        `USDT Contract: ${name} (${symbol}) - ${decimals} decimals`,
        { name, symbol, decimals, address: USDT_ADDRESS }
      );
    } catch (error) {
      this.addResult(
        'USDT Contract',
        'error',
        `Error con contrato USDT: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  // Helper method to get a formatted report
  getFormattedReport(): string {
    let report = '\n=== DIAGNÓSTICO DEL CONTRATO ===\n\n';
    
    this.results.forEach((result, index) => {
      const emoji = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      report += `${index + 1}. ${emoji} ${result.test}\n`;
      report += `   ${result.message}\n`;
      if (result.details) {
        try {
          // Safe JSON stringify that handles BigInt
          const safeDetails = JSON.stringify(result.details, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2
          );
          report += `   Detalles: ${safeDetails}\n`;
        } catch (error) {
          report += `   Detalles: [Error serializing details]\n`;
        }
      }
      report += '\n';
    });
    
    return report;
  }

  // Safe BigInt handling helper
  private safeBigIntToString(value: any): string {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, (key, val) => 
        typeof val === 'bigint' ? val.toString() : val
      );
    }
    return String(value);
  }
}

// Easy-to-use diagnostic function
export const runContractDiagnostics = async (): Promise<ContractDiagnostic[]> => {
  const runner = new ContractDiagnosticsRunner();
  return await runner.runAllDiagnostics();
};

// Test specific contract method with BigInt safety
export const testContractMethod = async (methodName: string, ...args: any[]): Promise<any> => {
  try {
    const web3 = new Web3('https://bsc-dataseed.binance.org/');
    const contract = new web3.eth.Contract(MultiTierLotteryABI as any, LOTTERY_ADDRESS);
    
    const result = await contract.methods[methodName](...args).call();
    
    // Safe handling of BigInt values
    let safeResult = result;
    if (typeof result === 'bigint') {
      safeResult = result.toString();
    } else if (typeof result === 'object' && result !== null) {
      safeResult = JSON.parse(JSON.stringify(result, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    }
    
    console.log(`✅ ${methodName}:`, safeResult);
    return safeResult;
  } catch (error) {
    console.error(`❌ Error en ${methodName}:`, error);
    throw error;
  }
};

export default ContractDiagnosticsRunner;
