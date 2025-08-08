import Web3 from 'web3';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';
import TokenABI from '../contracts/TokenABI.json';

// Crear instancia de Web3 independiente para solo lectura (no requiere billetera)
const createReadOnlyWeb3 = (): Web3 => {
  const rpcUrl = process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
  console.log('🔗 Creating read-only Web3 instance with RPC:', rpcUrl);
  
  try {
    return new Web3(new Web3.providers.HttpProvider(rpcUrl));
  } catch (error) {
    console.error('❌ Error creating Web3 instance:', error);
    throw new Error('No se pudo crear la conexión Web3');
  }
};

// Helper para agregar timeouts a las llamadas de contratos
const withTimeout = <T>(promise: Promise<T>, ms: number = 10000): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeoutPromise]);
};

// Interfaz para datos básicos de la lotería
export interface LotteryBasicData {
  jackpot: string;
  accumulatedJackpot: string;
  ticketPrice: string;
  timeUntilNextDraw: number;
  winners: string[];
  isLoading: boolean;
  error: string | null;
}

// Función para obtener datos básicos de la lotería (sin billetera)
export const getLotteryBasicData = async (): Promise<LotteryBasicData> => {
  console.log('📊 Getting basic lottery data from contract...');
  
  try {
    const web3 = createReadOnlyWeb3();
    
    const lotteryContractAddress = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
    const lotteryContract = new web3.eth.Contract(
      MultiTierLotteryABI as any,
      lotteryContractAddress
    );

    console.log('🎰 Contract initialized:', lotteryContractAddress);

    // Obtener todos los datos básicos en paralelo con logging detallado
    console.log('🔍 Calling contract methods...');
    
    const [currentPool, accJackpot, price, timeRemaining] = await Promise.all([
      withTimeout(lotteryContract.methods.getCurrentPool().call(), 12000)
        .then(result => { console.log('✅ getCurrentPool:', result); return result; })
        .catch(err => { console.log('❌ getCurrentPool error:', err.message); return '0'; }),
      withTimeout(lotteryContract.methods.getAccumulatedJackpot().call(), 12000)
        .then(result => { console.log('✅ getAccumulatedJackpot:', result); return result; })
        .catch(err => { console.log('❌ getAccumulatedJackpot error:', err.message); return '0'; }),
      withTimeout(lotteryContract.methods.getTicketPrice().call(), 12000)
        .then(result => { console.log('✅ getTicketPrice:', result); return result; })
        .catch(err => { console.log('❌ getTicketPrice error:', err.message); return '5000000000000000000'; }),
      withTimeout(lotteryContract.methods.getTimeUntilNextDraw().call(), 12000)
        .then(result => { console.log('✅ getTimeUntilNextDraw:', result); return result; })
        .catch(err => { console.log('❌ getTimeUntilNextDraw error:', err.message); return '86400'; })
    ]);

    // Obtener ganadores del último sorteo
    let winners: string[] = [];
    try {
      const latestDraw = await withTimeout(
        lotteryContract.methods.getLatestDraw().call(),
        10000
      );
      
      if (latestDraw && 
          typeof latestDraw === 'object' && 
          'drawId' in latestDraw && 
          Number(latestDraw.drawId) > 0) {
        
        const jackpotWinners = await withTimeout(
          lotteryContract.methods.getWinnersByTier(latestDraw.drawId, 6).call(),
          10000
        );
        
        if (Array.isArray(jackpotWinners)) {
          winners = jackpotWinners;
        }
      }
    } catch (winnersError) {
      console.log('⚠️ Could not load winners (normal if no winners):', winnersError.message);
    }

    // Convertir datos
    const fromWei = (value: string): string => {
      try {
        return web3.utils.fromWei(value || '0', 'ether');
      } catch {
        return '0';
      }
    };

    const result: LotteryBasicData = {
      jackpot: fromWei(currentPool?.toString() || '0'),
      accumulatedJackpot: fromWei(accJackpot?.toString() || '0'),
      ticketPrice: fromWei(price?.toString() || '5000000000000000000'), // 5 USDT por defecto
      timeUntilNextDraw: parseInt(timeRemaining?.toString() || '86400'),
      winners,
      isLoading: false,
      error: null
    };

    console.log('✅ Basic lottery data loaded successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error getting basic lottery data:', error);
    console.error('❌ Contract address used:', process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS);
    console.error('❌ RPC URL used:', process.env.REACT_APP_BSC_MAINNET_RPC);
    
    // Retornar datos por defecto en caso de error
    return {
      jackpot: '0',
      accumulatedJackpot: '0', 
      ticketPrice: '5',
      timeUntilNextDraw: 86400, // 24 horas
      winners: [],
      isLoading: false,
      error: error instanceof Error ? error.message : 'Error desconocido al cargar datos'
    };
  }
};

// Interfaz para datos de ganadores
export interface WinnersData {
  rounds: any[];
  isLoading: boolean;
  error: string | null;
}

// Función para obtener datos de ganadores (sin billetera)
export const getWinnersData = async (): Promise<WinnersData> => {
  console.log('🏆 Getting winners data from contract...');
  
  try {
    const web3 = createReadOnlyWeb3();
    
    const lotteryContract = new web3.eth.Contract(
      MultiTierLotteryABI as any,
lotteryContractAddress
    );

    // Verificar si hay sorteos disponibles
    const currentPool = await withTimeout(
      lotteryContract.methods.getCurrentPool().call(),
      10000
    );

    if (!currentPool || currentPool === '0') {
      console.log('⚠️ No active lottery pool found');
      return {
        rounds: [],
        isLoading: false,
        error: 'No hay sorteos disponibles aún'
      };
    }

    // Intentar obtener el último sorteo
    const latestDraw = await withTimeout(
      lotteryContract.methods.getLatestDraw().call(),
      10000
    );

    if (!latestDraw || 
        !latestDraw.drawId || 
        Number(latestDraw.drawId) === 0) {
      console.log('⚠️ No completed draws found');
      return {
        rounds: [],
        isLoading: false,
        error: 'No hay sorteos completados aún'
      };
    }

    // Aquí cargarías los datos reales de los sorteos
    // Por ahora, devolvemos estructura básica
    const rounds = [{
      id: Number(latestDraw.drawId),
      date: new Date().toLocaleDateString(),
      winningNumbers: [1, 2, 3, 4, 5, 6], // Esto vendría del contrato
      prizePool: {
        usdValue: `$${(parseFloat(currentPool) / 1e18).toLocaleString()}`,
        tokenAmount: `${(parseFloat(currentPool) / 1e18).toLocaleString()} USDT`
      },
      matches: [],
      totalPlayers: 0,
      isLatest: true
    }];

    console.log('✅ Winners data loaded successfully:', rounds.length, 'rounds');
    
    return {
      rounds,
      isLoading: false,
      error: null
    };
    
  } catch (error) {
    console.error('❌ Error loading winners data:', error);
    
    return {
      rounds: [],
      isLoading: false,
      error: error.message || 'Error al cargar datos de ganadores'
    };
  }
};