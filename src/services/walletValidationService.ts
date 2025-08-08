/**
 * Wallet Validation Service
 * Provides robust wallet connection validation and USDT balance verification
 */

import { ethers } from 'ethers';
import { toast } from 'react-toastify';

// USDT Contract ABI (minimal required functions)
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// BSC Network Configuration
const BSC_NETWORK = {
  chainId: '0x38', // 56 in hex
  chainName: 'BSC Mainnet',
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  }
};

const BSC_TESTNET_NETWORK = {
  chainId: '0x61', // 97 in hex  
  chainName: 'BSC Testnet',
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18
  }
};

// Contract addresses
const USDT_ADDRESSES = {
  mainnet: '0x55d398326f99059fF775485246999027B3197955',
  testnet: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' // BSC Testnet USDT
};

export interface WalletValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  walletInfo: {
    address: string;
    balance: string;
    network: string;
    provider: string;
  };
  usdtInfo: {
    balance: string;
    decimals: number;
    allowance: string;
    needsApproval: boolean;
  };
}

export interface TransactionValidation {
  canProceed: boolean;
  requiredAmount: string;
  currentBalance: string;
  missingAmount: string;
  gasEstimate: string;
  errors: string[];
}

class WalletValidationService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private usdtContract: ethers.Contract | null = null;
  private isTestnet: boolean = false;

  /**
   * Initialize the service with web3 provider
   */
  async initialize(ethereum: any): Promise<void> {
    if (!ethereum) {
      throw new Error('No ethereum provider found');
    }

    this.provider = new ethers.BrowserProvider(ethereum);
    this.signer = this.provider.getSigner();
    
    // Detect network
    const network = await this.provider.getNetwork();
    this.isTestnet = network.chainId === 97;
    
    // Initialize USDT contract
    const usdtAddress = this.isTestnet ? USDT_ADDRESSES.testnet : USDT_ADDRESSES.mainnet;
    this.usdtContract = new ethers.Contract(usdtAddress, USDT_ABI, this.signer);
  }

  /**
   * Comprehensive wallet validation
   */
  async validateWalletConnection(): Promise<WalletValidationResult> {
    const result: WalletValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      walletInfo: {
        address: '',
        balance: '0',
        network: '',
        provider: ''
      },
      usdtInfo: {
        balance: '0',
        decimals: 18,
        allowance: '0',
        needsApproval: false
      }
    };

    try {
      // Check if wallet is connected
      if (!window.ethereum) {
        result.errors.push('No wallet extension detected. Please install MetaMask or similar wallet.');
        return result;
      }

      // Check if accounts are connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        result.errors.push('No wallet accounts connected. Please connect your wallet.');
        return result;
      }

      await this.initialize(window.ethereum);
      
      if (!this.provider || !this.signer || !this.usdtContract) {
        result.errors.push('Failed to initialize wallet connection.');
        return result;
      }

      // Get wallet info
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();

      result.walletInfo = {
        address,
        balance: ethers.utils.formatEther(balance),
        network: this.isTestnet ? 'BSC Testnet' : 'BSC Mainnet',
        provider: window.ethereum.isMetaMask ? 'MetaMask' : 'Unknown'
      };

      // Validate network
      const expectedChainId = this.isTestnet ? 97 : 56;
      if (network.chainId !== expectedChainId) {
        result.errors.push(`Wrong network. Please switch to ${this.isTestnet ? 'BSC Testnet' : 'BSC Mainnet'}.`);
        return result;
      }

      // Get USDT balance and info
      await this.validateUSDTBalance(result, address);

      // Check for minimum BNB for gas
      const bnbBalance = parseFloat(result.walletInfo.balance);
      if (bnbBalance < 0.001) {
        result.warnings.push('Low BNB balance. You may not have enough for transaction fees.');
      }

      result.isValid = result.errors.length === 0;

    } catch (error: any) {
      result.errors.push(`Validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate USDT balance and contract interaction
   */
  private async validateUSDTBalance(result: WalletValidationResult, address: string): Promise<void> {
    try {
      if (!this.usdtContract) {
        throw new Error('USDT contract not initialized');
      }

      // Get USDT balance
      const balance = await this.usdtContract.balanceOf(address);
      const decimals = await this.usdtContract.decimals();
      
      result.usdtInfo.balance = ethers.utils.formatUnits(balance, decimals);
      result.usdtInfo.decimals = decimals;

      // Check if user has any USDT
      if (balance.eq(0)) {
        result.warnings.push('No USDT balance detected. You need USDT to purchase lottery tickets.');
      }

    } catch (error: any) {
      result.errors.push(`Failed to check USDT balance: ${error.message}`);
    }
  }

  /**
   * Switch to correct BSC network
   */
  async switchToBSCNetwork(testnet: boolean = false): Promise<boolean> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }

      const networkConfig = testnet ? BSC_TESTNET_NETWORK : BSC_NETWORK;

      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }]
        });
        return true;
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig]
          });
          return true;
        }
        throw switchError;
      }
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast.error(`Failed to switch to BSC network: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate transaction before execution
   */
  async validateTransaction(
    recipientAddress: string, 
    amountUSDT: string,
    ticketCount: number = 1
  ): Promise<TransactionValidation> {
    const validation: TransactionValidation = {
      canProceed: false,
      requiredAmount: amountUSDT,
      currentBalance: '0',
      missingAmount: '0',
      gasEstimate: '0',
      errors: []
    };

    try {
      if (!this.usdtContract || !this.signer) {
        validation.errors.push('Wallet not properly initialized');
        return validation;
      }

      const address = await this.signer.getAddress();
      
      // Check USDT balance
      const balance = await this.usdtContract.balanceOf(address);
      const decimals = await this.usdtContract.decimals();
      const balanceFormatted = ethers.utils.formatUnits(balance, decimals);
      
      validation.currentBalance = balanceFormatted;

      // Check if user has enough USDT
      const requiredAmount = ethers.utils.parseUnits(amountUSDT, decimals);
      if (balance.lt(requiredAmount)) {
        const missing = requiredAmount.sub(balance);
        validation.missingAmount = ethers.utils.formatUnits(missing, decimals);
        validation.errors.push(`Insufficient USDT balance. Need ${amountUSDT} USDT, have ${balanceFormatted} USDT`);
      }

      // Check allowance
      const allowance = await this.usdtContract.allowance(address, recipientAddress);
      if (allowance.lt(requiredAmount)) {
        validation.errors.push('Insufficient USDT allowance. Approval required.');
      }

      // Estimate gas for BNB
      try {
        const gasPrice = await this.provider!.getGasPrice();
        const gasLimit = ethers.BigNumber.from('100000'); // Estimated gas limit
        const gasCost = gasPrice.mul(gasLimit);
        validation.gasEstimate = ethers.utils.formatEther(gasCost);

        // Check BNB balance for gas
        const bnbBalance = await this.provider!.getBalance(address);
        if (bnbBalance.lt(gasCost)) {
          validation.errors.push(`Insufficient BNB for gas fees. Need ~${validation.gasEstimate} BNB`);
        }
      } catch (error) {
        validation.warnings = ['Could not estimate gas costs'];
      }

      validation.canProceed = validation.errors.length === 0;

    } catch (error: any) {
      validation.errors.push(`Transaction validation failed: ${error.message}`);
    }

    return validation;
  }

  /**
   * Approve USDT spending
   */
  async approveUSDTSpending(spenderAddress: string, amount: string): Promise<boolean> {
    try {
      if (!this.usdtContract) {
        throw new Error('USDT contract not initialized');
      }

      const decimals = await this.usdtContract.decimals();
      const amountWei = ethers.utils.parseUnits(amount, decimals);

      const tx = await this.usdtContract.approve(spenderAddress, amountWei);
      
      toast.info('Approval transaction submitted. Please wait for confirmation...');
      
      await tx.wait();
      
      toast.success('USDT spending approved successfully!');
      return true;

    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.error(`Approval failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get real-time USDT balance
   */
  async getRealTimeUSDTBalance(address: string): Promise<string> {
    try {
      if (!this.usdtContract) {
        throw new Error('USDT contract not initialized');
      }

      const balance = await this.usdtContract.balanceOf(address);
      const decimals = await this.usdtContract.decimals();
      
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error: any) {
      console.error('Failed to get USDT balance:', error);
      return '0';
    }
  }

  /**
   * Monitor wallet changes
   */
  setupWalletMonitoring(
    onAccountChange: (accounts: string[]) => void,
    onNetworkChange: (networkId: string) => void
  ): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', onAccountChange);
    window.ethereum.on('chainChanged', onNetworkChange);
  }

  /**
   * Cleanup wallet monitoring
   */
  cleanupWalletMonitoring(): void {
    if (!window.ethereum) return;

    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }

  /**
   * Get wallet connection status
   */
  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    address: string;
    network: string;
    balance: string;
  }> {
    try {
      if (!window.ethereum) {
        return { isConnected: false, address: '', network: '', balance: '0' };
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (!accounts || accounts.length === 0) {
        return { isConnected: false, address: '', network: '', balance: '0' };
      }

      await this.initialize(window.ethereum);
      
      if (!this.provider || !this.signer) {
        return { isConnected: false, address: '', network: '', balance: '0' };
      }

      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const balance = await this.getRealTimeUSDTBalance(address);

      return {
        isConnected: true,
        address,
        network: network.name,
        balance
      };

    } catch (error) {
      return { isConnected: false, address: '', network: '', balance: '0' };
    }
  }
}

// Export singleton instance
export const walletValidationService = new WalletValidationService();
export default walletValidationService;