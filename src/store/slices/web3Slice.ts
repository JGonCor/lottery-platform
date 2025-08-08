import { StateCreator } from 'zustand';
import { Web3 } from 'web3';
// Configuración simplificada para BSC mainnet
import type { AppStore, Web3Slice, User, ConnectionState } from '../types';

// Enhanced Web3 error handling
class Web3Error extends Error {
  constructor(
    message: string,
    public code?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'Web3Error';
  }
}

// Connection retry strategy
const CONNECTION_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

export const createWeb3Slice: StateCreator<
  AppStore,
  [["zustand/immer", never]],
  [],
  Web3Slice
> = (set, get) => ({
  user: {
    address: '',
    usdtBalance: '0',
    isConnected: false,
    chainId: null,
    networkName: '',
  },
  connectionState: {
    isConnecting: false,
    isReconnecting: false,
    lastConnectionAttempt: 0,
    connectionError: null,
    provider: null,
  },
  isApproved: false,

  connectWallet: async (provider = 'metamask') => {
    const startTime = Date.now();
    
    set((state) => {
      state.connectionState.isConnecting = true;
      state.connectionState.connectionError = null;
      state.connectionState.lastConnectionAttempt = startTime;
      state.connectionState.provider = provider;
      state.ui.loading.global = true;
    });

    try {
      if (!window.ethereum) {
        throw new Web3Error('No Web3 wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Request account access with timeout
      const accounts = await Promise.race([
        window.ethereum.request({ method: 'eth_requestAccounts' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Web3Error('Connection timeout')), 30000)
        )
      ]) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Web3Error('No accounts found. Please unlock your wallet.');
      }

      const web3 = new Web3(window.ethereum);
      const chainId = await web3.eth.getChainId();
      const account = accounts[0];

      // Verify network
      if (Number(chainId) !== 56) {
        await get().switchNetwork(56);
      }

      // Get USDT balance
      const balance = await get().updateBalance();

      set((state) => {
        state.user = {
          address: account,
          usdtBalance: balance || '0',
          isConnected: true,
          chainId: Number(chainId),
          networkName: 'BSC Mainnet',
        };
        state.connectionState.isConnecting = false;
        state.connectionState.connectionError = null;
        state.ui.loading.global = false;
      });

      // Record performance metric
      get().recordMetric('walletConnectionTime', Date.now() - startTime);

      // Check approval status
      await get().checkApproval();

      // Store connection state
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_provider', provider);

      // Set up event listeners
      setupWeb3EventListeners();

      get().addNotification({
        type: 'success',
        title: 'Wallet Connected',
        message: `Successfully connected to ${account.slice(0, 6)}...${account.slice(-4)}`,
        autoClose: true,
        duration: 3000,
      });

    } catch (error) {
      const errorMessage = error instanceof Web3Error 
        ? error.message 
        : 'Failed to connect wallet. Please try again.';

      set((state) => {
        state.connectionState.isConnecting = false;
        state.connectionState.connectionError = errorMessage;
        state.ui.loading.global = false;
      });

      get().addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: errorMessage,
        autoClose: true,
        duration: 5000,
      });

      throw error;
    }
  },

  disconnectWallet: async () => {
    try {
      set((state) => {
        state.user = {
          address: '',
          usdtBalance: '0',
          isConnected: false,
          chainId: null,
          networkName: '',
        };
        state.connectionState = {
          isConnecting: false,
          isReconnecting: false,
          lastConnectionAttempt: 0,
          connectionError: null,
          provider: null,
        };
        state.isApproved = false;
      });

      // Clear localStorage
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('wallet_provider');

      // Remove event listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }

      get().addNotification({
        type: 'info',
        title: 'Wallet Disconnected',
        message: 'Your wallet has been disconnected',
        autoClose: true,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  },

  switchNetwork: async (chainId: number) => {
    if (!window.ethereum) {
      throw new Web3Error('No Web3 wallet detected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      set((state) => {
        state.user.chainId = chainId;
        state.user.networkName = 'BSC Mainnet';
      });

    } catch (error: any) {
      // If the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: 'BSC Mainnet',
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: [process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com/'],
            }],
          });
        } catch (addError) {
          throw new Web3Error('Failed to add network to wallet');
        }
      } else {
        throw new Web3Error('Failed to switch network');
      }
    }
  },

  approveUSDT: async (amount: string) => {
    const { user } = get();
    if (!user.isConnected || !window.ethereum) {
      throw new Web3Error('Wallet not connected');
    }

    set((state) => {
      state.ui.loading.approval = true;
    });

    try {
      const web3 = new Web3(window.ethereum);
      const usdtAddress = getContractAddress('usdt');
      const lotteryAddress = getContractAddress('lottery');

      // Create USDT contract instance
      const TokenABI = await import('../../contracts/TokenABI.json');
      const usdtContract = new web3.eth.Contract(TokenABI.default as any, usdtAddress);

      const amountWei = web3.utils.toWei(amount, 'ether');

      const tx = await usdtContract.methods
        .approve(lotteryAddress, amountWei)
        .send({ from: user.address });

      if (tx.status) {
        set((state) => {
          state.isApproved = true;
        });

        get().addTransaction({
          hash: tx.transactionHash,
          status: 'confirmed',
          type: 'approval',
          timestamp: Date.now(),
        });

        get().addNotification({
          type: 'success',
          title: 'Approval Successful',
          message: 'USDT spending approved for lottery contract',
          autoClose: true,
          duration: 3000,
        });

        return tx.transactionHash;
      } else {
        throw new Web3Error('Approval transaction failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Web3Error 
        ? error.message 
        : 'Failed to approve USDT spending';

      get().addNotification({
        type: 'error',
        title: 'Approval Failed',
        message: errorMessage,
        autoClose: true,
        duration: 5000,
      });

      throw error;

    } finally {
      set((state) => {
        state.ui.loading.approval = false;
      });
    }
  },

  checkApproval: async () => {
    const { user } = get();
    if (!user.isConnected || !window.ethereum) {
      return false;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const usdtAddress = getContractAddress('usdt');
      const lotteryAddress = getContractAddress('lottery');

      const TokenABI = await import('../../contracts/TokenABI.json');
      const usdtContract = new web3.eth.Contract(TokenABI.default as any, usdtAddress);

      const allowance = await usdtContract.methods
        .allowance(user.address, lotteryAddress)
        .call();

      const isApproved = BigInt(allowance || '0') > BigInt(0);

      set((state) => {
        state.isApproved = isApproved;
      });

      return isApproved;

    } catch (error) {
      console.error('Error checking approval:', error);
      return false;
    }
  },

  updateBalance: async () => {
    const { user } = get();
    if (!user.isConnected || !window.ethereum) {
      return '0';
    }

    set((state) => {
      state.ui.loading.balance = true;
    });

    try {
      const web3 = new Web3(window.ethereum);
      const usdtAddress = getContractAddress('usdt');

      const TokenABI = await import('../../contracts/TokenABI.json');
      const usdtContract = new web3.eth.Contract(TokenABI.default as any, usdtAddress);

      const balance = await usdtContract.methods.balanceOf(user.address).call();
      const balanceFormatted = web3.utils.fromWei(balance || '0', 'ether');

      set((state) => {
        state.user.usdtBalance = balanceFormatted;
      });

      return balanceFormatted;

    } catch (error) {
      console.error('Error updating balance:', error);
      return '0';

    } finally {
      set((state) => {
        state.ui.loading.balance = false;
      });
    }
  },
});

// Web3 event listeners setup
function setupWeb3EventListeners() {
  if (!window.ethereum) return;

  const { addNotification, disconnectWallet, updateBalance } = useAppStore.getState();

  // Account changed
  window.ethereum.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      // Reconnect with new account
      window.location.reload();
    }
  });

  // Chain changed
  window.ethereum.on('chainChanged', (chainId: string) => {
    const expectedChainId = 56;
    const currentChainId = parseInt(chainId, 16);

    if (currentChainId !== expectedChainId) {
      addNotification({
        type: 'warning',
        title: 'Wrong Network',
        message: `Please switch to BSC Mainnet`,
        autoClose: false,
      });
    } else {
      window.location.reload();
    }
  });

  // Connection events
  window.ethereum.on('connect', () => {
    console.log('Wallet connected');
    updateBalance();
  });

  window.ethereum.on('disconnect', () => {
    console.log('Wallet disconnected');
    disconnectWallet();
  });
}

// Auto-reconnect logic
export const initializeWalletConnection = async () => {
  const wasConnected = localStorage.getItem('wallet_connected') === 'true';
  const provider = localStorage.getItem('wallet_provider') || 'metamask';

  if (wasConnected && window.ethereum) {
    try {
      const { connectWallet } = useAppStore.getState();
      await connectWallet(provider);
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('wallet_provider');
    }
  }
};