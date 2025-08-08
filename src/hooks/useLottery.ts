import { useState, useEffect, useCallback } from 'react';
import useWeb3 from './useWeb3';
// Configuración removida - usando variables de entorno directamente
import { 
  getLotteryContractAddress,
  getUsdtContractAddress,
  fromWei, 
  isCorrectNetwork,
  formatAddress
} from '../utils/contractHelpers';
import { toWei, safeParseInt, cleanAddress } from '../utils/web3';
import { getLotteryBasicData } from '../utils/contractReader';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';
import TokenABI from '../contracts/TokenABI.json';

export interface TicketInfo {
  id: number;
  purchaseDate: string;
  isWinner: boolean;
  numbers?: number[];  // Los números seleccionados para el ticket
}

export interface ReferralInfo {
  totalReferrals: number;
  maxDiscount: number;
  discountPerReferral: number;
  currentDiscount: number;
}

export interface BulkDiscountTier {
  ticketCount: number;
  discountPercent: number;
}

// Helper para agregar timeouts a las llamadas de contratos
const withTimeout = <T>(promise: Promise<T>, ms: number = 15000): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeoutPromise]);
};

export const useLottery = () => {
  const { web3, account, active } = useWeb3();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [jackpot, setJackpot] = useState<string>('0');
  const [accumulatedJackpot, setAccumulatedJackpot] = useState<string>('0');
  const [ticketPrice, setTicketPrice] = useState<string>('0');
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [timeUntilNextDraw, setTimeUntilNextDraw] = useState<number>(0);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [winners, setWinners] = useState<string[]>([]);
  
  // Nuevos estados para referidos y descuentos
  const [referralInfo, setReferralInfo] = useState<ReferralInfo>({
    totalReferrals: 0,
    maxDiscount: 10,
    discountPerReferral: 1,
    currentDiscount: 0
  });
  const [bulkDiscountTiers, setBulkDiscountTiers] = useState<BulkDiscountTier[]>([
    { ticketCount: 5, discountPercent: 2 },
    { ticketCount: 10, discountPercent: 5 },
    { ticketCount: 20, discountPercent: 10 }
  ]);
  const [referrer, setReferrer] = useState<string>('');

  // Obtener instancia del contrato de lotería
  const getLotteryContract = useCallback(() => {
    if (!web3) return null;
    try {
      return new web3.eth.Contract(
        MultiTierLotteryABI as any,
        getLotteryContractAddress()
      );
    } catch (error) {
      console.error('Error al inicializar contrato de lotería:', error);
      return null;
    }
  }, [web3]);

  // Obtener instancia del contrato USDT
  const getUsdtContract = useCallback(() => {
    if (!web3) return null;
    try {
      return new web3.eth.Contract(
        TokenABI as any,
        getUsdtContractAddress()
      );
    } catch (error) {
      console.error('Error al inicializar contrato USDT:', error);
      return null;
    }
  }, [web3]);

  // Verificar si estamos en la red correcta
  const verifyNetwork = useCallback(async () => {
    if (!active) return true; // No verificar si no hay cuenta conectada
    
    const onCorrectNetwork = await isCorrectNetwork();
    if (!onCorrectNetwork) {
      setError(new Error(`Red incorrecta. Por favor, conéctate a BSC Mainnet.`));
      return false;
    }
    return true;
  }, [active]);

  // Cargar información básica del contrato
  const loadLotteryInfo = useCallback(async () => {
    console.log('🎰 loadLotteryInfo called - web3:', !!web3);
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading REAL lottery data from contract...');
      
      // NO establecer valores por defecto - mantener loading hasta obtener datos reales
      if (!web3) {
        console.log('⚠️ No web3 instance - staying in loading state');
        // Mantener loading = true para mostrar "Cargando..."
        return;
      }
      
      const lotteryContract = getLotteryContract();
      if (!lotteryContract) {
        console.log('❌ Could not initialize lottery contract - staying in loading state');
        // Mantener loading = true para mostrar "Cargando..."
        return;
      }
      
      console.log('📋 Lottery contract initialized:', lotteryContract.options.address);

      // OBTENER DATOS REALES DEL CONTRATO - todos son obligatorios
      let realDataLoaded = false;
      
      try {
        console.log('🔍 Fetching real contract data...');
        
        // Obtener todos los datos en paralelo usando los métodos correctos del ABI
        const [currentPool, accJackpot, price, timeRemaining] = await Promise.all([
          withTimeout(lotteryContract.methods.getCurrentPool().call(), 10000),
          withTimeout(lotteryContract.methods.getAccumulatedJackpot().call(), 10000),
          withTimeout(lotteryContract.methods.getTicketPrice().call(), 10000),
          withTimeout(lotteryContract.methods.getTimeUntilNextDraw().call(), 10000)
        ]);

        // Solo actualizar estado si TODOS los datos se obtuvieron exitosamente
        if (currentPool !== undefined && accJackpot !== undefined && 
            price !== undefined && timeRemaining !== undefined) {
          
          setJackpot(fromWei(currentPool || '0'));
          setAccumulatedJackpot(fromWei(accJackpot || '0'));
          setTicketPrice(fromWei(price || '5000000000000000000')); // 5 USDT por defecto
          setTimeUntilNextDraw(safeParseInt(timeRemaining || '86400')); // 24h por defecto
          
          realDataLoaded = true;
          console.log('✅ Real contract data loaded successfully');
        } else {
          throw new Error('Incomplete data received from contract');
        }
      } catch (error) {
        console.log('❌ Failed to load real contract data:', error.message);
        // NO actualizar el estado - mantener loading = true
        return; // Salir sin cambiar loading a false
      }

      // Obtener lista de ganadores del último sorteo - SOLO DATOS REALES
      try {
        console.log('🏆 Loading real winners data...');
        
        const latestDraw = await withTimeout(
          lotteryContract.methods.getLatestDraw().call(),
          8000
        );
        
        if (latestDraw && 
            typeof latestDraw === 'object' && 
            'drawId' in latestDraw && 
            Number(latestDraw.drawId) > 0 &&
            latestDraw.drawId !== '0') {
          
          // Obtener ganadores del jackpot (nivel 6)
          const jackpotWinners = await withTimeout(
            lotteryContract.methods.getWinnersByTier(latestDraw.drawId, 6).call(),
            8000
          );
          
          if (Array.isArray(jackpotWinners)) {
            setWinners(jackpotWinners);
            console.log('🏆 Real jackpot winners loaded:', jackpotWinners.length);
          } else {
            setWinners([]);
          }
        } else {
          setWinners([]);
          console.log('ℹ️ No completed draws yet');
        }
      } catch (winnersError) {
        console.log('⚠️ Could not load winners:', winnersError.message);
        setWinners([]);
      }

      // Cargar información de descuentos por volumen con manejo de errores
      let discountTiers = null;
      try {
        discountTiers = await withTimeout(
          lotteryContract.methods.getBulkDiscountTiers().call(),
          5000
        );
        console.log('📊 Discount tiers loaded:', discountTiers);
      } catch (discountError) {
        console.log('⚠️ Could not load discount tiers:', discountError.message);
        discountTiers = null;
      }
      
      // Transformar la información a un formato más útil si los datos son válidos
      if (discountTiers && typeof discountTiers === 'object' && discountTiers !== null) {
        try {
          const tier1Tickets = 'tier1Tickets' in discountTiers ? (discountTiers as any).tier1Tickets : 5;
          const tier1Discount = 'tier1Discount' in discountTiers ? (discountTiers as any).tier1Discount : 2;
          const tier2Tickets = 'tier2Tickets' in discountTiers ? (discountTiers as any).tier2Tickets : 10;
          const tier2Discount = 'tier2Discount' in discountTiers ? (discountTiers as any).tier2Discount : 5;
          const tier3Tickets = 'tier3Tickets' in discountTiers ? (discountTiers as any).tier3Tickets : 20;
          const tier3Discount = 'tier3Discount' in discountTiers ? (discountTiers as any).tier3Discount : 10;
          
          setBulkDiscountTiers([
            { 
              ticketCount: safeParseInt(tier1Tickets, 5), 
              discountPercent: safeParseInt(tier1Discount, 2) 
            },
            { 
              ticketCount: safeParseInt(tier2Tickets, 10), 
              discountPercent: safeParseInt(tier2Discount, 5) 
            },
            { 
              ticketCount: safeParseInt(tier3Tickets, 20), 
              discountPercent: safeParseInt(tier3Discount, 10) 
            }
          ]);
        } catch (innerErr) {
          console.error('Error al procesar niveles de descuento:', innerErr);
          // Mantener valores por defecto en caso de error
        }
      }
      
    } catch (err) {
      console.error('❌ Error loading real lottery information:', err);
      // NO cambiar loading a false - mantener "Cargando..." si fallan los datos reales
      return;
    } finally {
      // Always complete loading state
      setLoading(false);
      if (realDataLoaded) {
        console.log('✅ Real lottery data loaded successfully');
      }
    }
  }, [web3, getLotteryContract]);

  // Cargar información de referidos
  const loadReferralInfo = useCallback(async () => {
    if (!web3 || !active || !account) return;
    if (!await verifyNetwork()) return;

    try {
      const lotteryContract = getLotteryContract();
      if (!lotteryContract) {
        throw new Error('No se pudo inicializar el contrato de lotería');
      }

      // Obtener información de descuentos por referidos
      const referralDiscountInfo = await lotteryContract.methods.getReferralDiscountInfo().call();
      
      // Obtener el total de referidos del usuario
      const totalReferrals = await lotteryContract.methods.getTotalReferrals(account).call();
      
      // Obtener el referente del usuario actual (si existe)
      const myReferrer = await lotteryContract.methods.getReferrer(account).call();
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      
      const cleanedReferrer = cleanAddress(myReferrer);
      if (cleanedReferrer && cleanedReferrer !== zeroAddress) {
        setReferrer(cleanedReferrer);
      }
      
      // Calcular el descuento actual basado en el total de referidos
      let discountPerReferral = 1;
      let maxDiscount = 10;
      
      if (referralDiscountInfo && typeof referralDiscountInfo === 'object' && referralDiscountInfo !== null) {
        try {
          const discPerRef = 'discountPerReferral' in referralDiscountInfo 
            ? (referralDiscountInfo as any).discountPerReferral 
            : 1;
            
          const maxRef = 'maxReferralDiscount' in referralDiscountInfo 
            ? (referralDiscountInfo as any).maxReferralDiscount 
            : 10;
            
          discountPerReferral = safeParseInt(discPerRef, 1);
          maxDiscount = safeParseInt(maxRef, 10);
        } catch (err) {
          console.error('Error al procesar información de referidos:', err);
          // Usar valores predeterminados en caso de error
        }
      }
      
      const totalRefCount = safeParseInt(totalReferrals, 0);
      const currentDiscount = Math.min(totalRefCount * discountPerReferral, maxDiscount);
      
      setReferralInfo({
        totalReferrals: totalRefCount,
        maxDiscount,
        discountPerReferral,
        currentDiscount
      });
      
    } catch (err) {
      console.error('Error al cargar información de referidos:', err);
      // No lanzamos error aquí para no interrumpir la carga de la UI
    }
  }, [web3, active, account, getLotteryContract, verifyNetwork]);

  // Cargar tickets del usuario
  const loadUserTickets = useCallback(async () => {
    if (!web3 || !active || !account) return;
    if (!await verifyNetwork()) return;

    try {
      setLoading(true);
      setError(null);
      
      const lotteryContract = getLotteryContract();
      if (!lotteryContract) {
        throw new Error('No se pudo inicializar el contrato de lotería');
      }

      // Obtener los IDs de tickets del usuario
      const userTicketIds = await lotteryContract.methods.getPlayerTickets(account).call();
      
      // Verificar si la respuesta es un array válido
      if (!userTicketIds || !Array.isArray(userTicketIds)) {
        setTickets([]);
        return;
      }
      
      // Convertir IDs a información detallada
      const ticketsInfo: TicketInfo[] = [];
      
      for (const id of userTicketIds) {
        try {
          // Obtener información detallada del ticket
          const ticket = await lotteryContract.methods.getTicket(id).call();
          const date = new Date();
          
          // En producción, se debería obtener la fecha real mediante eventos
          // Esto es solo una simulación
          date.setDate(date.getDate() - (safeParseInt(id) % 30));
          
          // Verificar si el ticket es ganador
          const latestDraw = await lotteryContract.methods.getLatestDraw().call();
          let isWinner = false;
          
          // Verificar si el ticket es ganador usando comprobaciones seguras
          if (
            latestDraw && 
            typeof latestDraw === 'object' &&
            latestDraw !== null &&
            'drawId' in latestDraw && 
            safeParseInt(latestDraw.drawId) > 0 && 
            ticket && 
            typeof ticket === 'object' && 
            ticket !== null &&
            'matchCount' in ticket && 
            safeParseInt(ticket.matchCount) >= 2
          ) {
            isWinner = true;
          }
          
          // Verificar si hay números y son un array válido
          let ticketNumbers: number[] = [];
          if (
            ticket && 
            typeof ticket === 'object' && 
            ticket !== null &&
            'numbers' in ticket
          ) {
            // Asegurar que numbers es un array y convertir cada elemento a número
            const numbersArray = Array.isArray(ticket.numbers) ? ticket.numbers : [];
            ticketNumbers = numbersArray.map(n => safeParseInt(n));
          }
          
          ticketsInfo.push({
            id: safeParseInt(id),
            purchaseDate: date.toLocaleDateString(),
            isWinner,
            numbers: ticketNumbers
          });
        } catch (error) {
          console.error(`Error al cargar información del ticket ${id}:`, error);
        }
      }

      setTickets(ticketsInfo);
    } catch (err) {
      console.error('Error al cargar tickets del usuario:', err);
      setError(err instanceof Error ? err : new Error('Error al cargar tickets'));
    } finally {
      setLoading(false);
    }
  }, [web3, active, account, getLotteryContract, verifyNetwork]);

  // Verificar balance y aprobación de USDT
  const checkUsdtAllowance = useCallback(async () => {
    if (!web3 || !active || !account) return;
    if (!await verifyNetwork()) return;

    try {
      const usdtContract = getUsdtContract();
      if (!usdtContract) {
        throw new Error('No se pudo inicializar el contrato USDT');
      }

      // Obtener balance de USDT
      const balance = await usdtContract.methods.balanceOf(account).call();
      setUsdtBalance(fromWei(balance ? balance.toString() : '0'));

      // Verificar aprobación
      const allowance = await usdtContract.methods.allowance(account, getLotteryContractAddress()).call();
      const lotteryContract = getLotteryContract();
      
      if (!lotteryContract) {
        throw new Error('No se pudo inicializar el contrato de lotería');
      }
      
      const ticketPriceInWei = await lotteryContract.methods.getTicketPrice().call();
      
      // Comparar como BigInt para evitar desbordamiento con números grandes
      const allowanceBN = BigInt(allowance ? allowance.toString() : '0');
      const ticketPriceBN = BigInt(ticketPriceInWei ? ticketPriceInWei.toString() : '0');
      
      setIsApproved(allowanceBN >= ticketPriceBN);
    } catch (err) {
      console.error('Error al verificar permisos USDT:', err);
      // No establecer error aquí para no interrumpir la carga de la UI
    }
  }, [web3, active, account, getUsdtContract, getLotteryContract, verifyNetwork]);

  // Aprobar gasto de USDT con límites de seguridad
  const approveUsdtSpending = useCallback(async (ticketCount: number = 1) => {
    if (!web3 || !active || !account) {
      throw new Error('Billetera no conectada');
    }
    if (!await verifyNetwork()) {
      throw new Error('Red incorrecta. Por favor, conéctate a BSC Testnet.');
    }

    try {
      setLoading(true);
      setError(null);

      const usdtContract = getUsdtContract();
      const lotteryContract = getLotteryContract();
      if (!usdtContract || !lotteryContract) {
        throw new Error('No se pudieron inicializar los contratos');
      }

      // Obtener precio exacto del ticket
      const ticketPriceWei = await lotteryContract.methods.getTicketPrice().call();
      
      // Validar límites de seguridad
      const MAX_TICKETS_PER_APPROVAL = 50; // Máximo 50 tickets por aprobación
      const safeTicketCount = Math.min(ticketCount, MAX_TICKETS_PER_APPROVAL);
      
      // Calcular monto exacto necesario con margen mínimo de seguridad (5%)
      const totalAmount = BigInt(ticketPriceWei) * BigInt(safeTicketCount);
      const safetyMargin = totalAmount * BigInt(5) / BigInt(100); // 5% de margen
      const amountToApprove = totalAmount + safetyMargin;
      
      // Verificar que el usuario tenga suficiente balance
      const userBalance = await usdtContract.methods.balanceOf(account).call();
      if (BigInt(userBalance) < amountToApprove) {
        throw new Error('Balance insuficiente de USDT');
      }
      
      // Realizar aprobación limitada y temporal
      const tx = await usdtContract.methods
        .approve(getLotteryContractAddress(), amountToApprove.toString())
        .send({ from: account });

      if (tx.status) {
        setIsApproved(true);
        
        // Programar recordatorio para revocar aprobación después de 24 horas
        // En un entorno de producción, esto debería manejarse con un servicio externo
        console.warn(
          `SEGURIDAD: Aprobación USDT concedida por ${safeTicketCount} tickets. ` +
          `Considera revocar la aprobación después del uso para mayor seguridad.`
        );
        
        return tx;
      } else {
        throw new Error('La transacción de aprobación falló');
      }
    } catch (err) {
      console.error('Error al aprobar USDT:', err);
      setError(err instanceof Error ? err : new Error('Error al aprobar gasto de USDT'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3, active, account, getUsdtContract, getLotteryContract, verifyNetwork]);

  // Función para revocar aprobación USDT
  const revokeUsdtApproval = useCallback(async () => {
    if (!web3 || !active || !account) {
      throw new Error('Billetera no conectada');
    }

    try {
      setLoading(true);
      setError(null);

      const usdtContract = getUsdtContract();
      if (!usdtContract) throw new Error('No se pudo inicializar el contrato USDT');

      // Revocar aprobación estableciendo allowance a 0
      const tx = await usdtContract.methods
        .approve(getLotteryContractAddress(), '0')
        .send({ from: account });

      if (tx.status) {
        setIsApproved(false);
        return tx;
      } else {
        throw new Error('La transacción de revocación falló');
      }
    } catch (err) {
      console.error('Error al revocar aprobación USDT:', err);
      setError(err instanceof Error ? err : new Error('Error al revocar aprobación USDT'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3, active, account, getUsdtContract]);

  // Comprar ticket con números específicos
  const buyTicket = useCallback(async (selectedNumbers: number[]) => {
    if (!web3 || !active || !account) {
      throw new Error('Billetera no conectada');
    }
    if (!await verifyNetwork()) {
      throw new Error('Red incorrecta. Por favor, conéctate a BSC Testnet.');
    }
    if (selectedNumbers.length !== 6) {
      throw new Error('Debes seleccionar exactamente 6 números');
    }

    try {
      setLoading(true);
      setError(null);

      const lotteryContract = getLotteryContract();
      if (!lotteryContract) throw new Error('No se pudo inicializar el contrato de lotería');

      // Verificar si ya hay aprobación
      if (!isApproved) {
        await approveUsdtSpending(1);
      }

      // Preparar los números para la transacción
      const numbersArray: number[] = selectedNumbers.sort((a, b) => a - b);

      // Ejecutar compra
      const tx = await lotteryContract.methods
        .buyTicket(numbersArray)
        .send({ from: account });

      if (tx.status) {
        // Recargar información después de la compra
        await loadLotteryInfo();
        await loadUserTickets();
        await checkUsdtAllowance();
        return tx;
      } else {
        throw new Error('La transacción de compra falló');
      }
    } catch (err) {
      console.error('Error al comprar ticket:', err);
      setError(err instanceof Error ? err : new Error('Error al comprar ticket'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3, active, account, getLotteryContract, isApproved, approveUsdtSpending, loadLotteryInfo, loadUserTickets, checkUsdtAllowance, verifyNetwork]);

  // Comprar múltiples tickets
  const buyMultipleTickets = useCallback(async (numbersArrays: number[][]) => {
    if (!web3 || !active || !account) {
      throw new Error('Billetera no conectada');
    }
    if (!await verifyNetwork()) {
      throw new Error('Red incorrecta. Por favor, conéctate a BSC Testnet.');
    }
    if (numbersArrays.length === 0) {
      throw new Error('Debes proporcionar al menos un conjunto de números');
    }

    try {
      setLoading(true);
      setError(null);

      const lotteryContract = getLotteryContract();
      if (!lotteryContract) throw new Error('No se pudo inicializar el contrato de lotería');

      // Calcular precio total con descuento incluido
      const ticketPriceWei = await lotteryContract.methods.getTicketPrice().call();
      const ticketCount = numbersArrays.length;
      
      // Calcular descuento aplicable
      const discount = await lotteryContract.methods.calculateDiscount(account, ticketCount).call();
      
      // Aplicar descuento
      const discountPercent = discount ? parseInt(discount.toString()) : 0;
      const discountMultiplier = (100 - discountPercent) / 100;
      
      const ticketPriceValue = ticketPriceWei ? ticketPriceWei.toString() : '0';
      const totalPrice = BigInt(ticketPriceValue) * BigInt(ticketCount) * BigInt(Math.floor(discountMultiplier * 100)) / BigInt(100);
      
      // Verificar aprobación
      const usdtContract = getUsdtContract();
      if (!usdtContract) throw new Error('No se pudo inicializar el contrato USDT');
      
      const allowance = await usdtContract.methods.allowance(account, getLotteryContractAddress()).call();
      const allowanceValue = allowance ? allowance.toString() : '0';
      
      if (BigInt(allowanceValue) < totalPrice) {
        // Necesitamos aprobar más USDT
        await approveUsdtSpending(ticketCount);
      }

      // Preparar los datos para la transacción
      const processedArrays = numbersArrays.map(numbers => 
        numbers.sort((a, b) => a - b)
      );

      // Ejecutar compra múltiple
        const tx = await lotteryContract.methods
        .buyMultipleTickets(processedArrays)
          .send({ from: account });
        
      if (tx.status) {
        // Recargar información después de la compra
      await loadLotteryInfo();
      await loadUserTickets();
      await checkUsdtAllowance();
        return tx;
      } else {
        throw new Error('La transacción de compra múltiple falló');
      }
    } catch (err) {
      console.error('Error al comprar múltiples tickets:', err);
      setError(err instanceof Error ? err : new Error('Error al comprar tickets'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3, active, account, getLotteryContract, getUsdtContract, approveUsdtSpending, loadLotteryInfo, loadUserTickets, checkUsdtAllowance, verifyNetwork]);

  // Agregar referido
  const addReferral = useCallback(async (referredAddress: string) => {
    if (!web3 || !active || !account) {
      throw new Error('Billetera no conectada');
    }
    if (!await verifyNetwork()) {
      throw new Error('Red incorrecta. Por favor, conéctate a BSC Testnet.');
    }

    try {
      setLoading(true);
      setError(null);

      const lotteryContract = getLotteryContract();
      if (!lotteryContract) throw new Error('No se pudo inicializar el contrato de lotería');

      // Registrar referido
      const tx = await lotteryContract.methods
        .addReferral(referredAddress)
        .send({ from: account });

      if (tx.status) {
        // Recargar información después de la referencia
        await loadReferralInfo();
        return tx;
      } else {
        throw new Error('La transacción de referido falló');
      }
    } catch (err) {
      console.error('Error al agregar referido:', err);
      setError(err instanceof Error ? err : new Error('Error al agregar referido'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [web3, active, account, getLotteryContract, loadReferralInfo, verifyNetwork]);

  // Calcular el descuento aplicable
  const calculateDiscount = useCallback(async (ticketCount: number) => {
    if (!web3 || !active || !account) return 0;
    
    try {
      const lotteryContract = getLotteryContract();
      if (!lotteryContract) return 0;
      
      const discount = await lotteryContract.methods.calculateDiscount(account, ticketCount).call();
      return discount ? parseInt(discount.toString()) : 0;
    } catch (error) {
      console.error('Error al calcular descuento:', error);
      return 0;
    }
  }, [web3, active, account, getLotteryContract]);

  // Efecto para procesar referidos de la URL
  useEffect(() => {
    const processReferralFromUrl = async () => {
      if (!web3 || !active || !account) return;
      
      // Buscar parámetro ref en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const refAddress = urlParams.get('ref');
      
      if (refAddress && web3.utils.isAddress(refAddress) && refAddress !== account) {
        try {
          const lotteryContract = getLotteryContract();
          if (!lotteryContract) return;
          
          // Verificar si ya tenemos un referente
          const currentReferrer = await lotteryContract.methods.getReferrer(account).call();
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          
          // Si no tenemos referente, registrar el de la URL
          if (!currentReferrer || (typeof currentReferrer === 'string' && currentReferrer === zeroAddress)) {
            // Verificar si el referente tiene tickets
            const referrerTickets = await lotteryContract.methods.getPlayerTickets(refAddress).call();
            
            if (referrerTickets && Array.isArray(referrerTickets) && referrerTickets.length > 0) {
              // Registrar como referido
              await lotteryContract.methods.addReferral(account).send({ from: refAddress });
              
              // Actualizar referente local
              setReferrer(refAddress);
              
              // Limpiar URL para evitar registros repetidos
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (error) {
          console.error('Error al procesar referido de URL:', error);
        }
      }
    };
    
    processReferralFromUrl();
  }, [web3, active, account, getLotteryContract]);

  // Cargar datos básicos al inicio - SOLO DATOS REALES (sin dependencia de billetera)
  useEffect(() => {
    console.log('🌐 Loading REAL lottery data using read-only Web3...');
    
    let isMounted = true;
    
    // Mostrar "Cargando..." desde el inicio
    if (isMounted) {
      setLoading(true);
    }
    
    // Usar servicio de solo lectura que no requiere billetera
    const loadBasicData = async () => {
      try {
        if (isMounted) {
          console.log('📊 Fetching real lottery data...');
          const basicData = await getLotteryBasicData();
          
          if (isMounted) {
            if (basicData.error) {
              console.log('❌ Error loading basic data:', basicData.error);
              // Mantener loading = true para mostrar "Cargando..."
            } else {
              // Solo actualizar si los datos son válidos
              setJackpot(basicData.jackpot);
              setAccumulatedJackpot(basicData.accumulatedJackpot);
              setTicketPrice(basicData.ticketPrice);
              setTimeUntilNextDraw(basicData.timeUntilNextDraw);
              setWinners(basicData.winners);
              setLoading(false);
              console.log('✅ Real lottery data loaded successfully');
            }
          }
        }
      } catch (error) {
        console.log('❌ Error loading basic lottery data:', error.message);
        // Mantener loading = true para mostrar "Cargando..."
      }
    };
    
    // Cargar datos inmediatamente
    const timeoutId = setTimeout(loadBasicData, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Sin dependencias para cargar solo una vez

  // Cargar datos de usuario cuando la cuenta cambia
  useEffect(() => {
    console.log('🔄 User data useEffect triggered - active:', active, 'account:', account);
    
    let isMounted = true;
    
    if (active && account && isMounted) {
      console.log('✅ Wallet connected, loading user-specific data...');
      
      // Cargar datos de usuario de forma asíncrona con control de montaje
      const loadUserData = async () => {
        try {
          console.log('📊 Starting user data load...');
          
          // Cargar información de usuario después con verificaciones de montaje
          const ticketsTimeout = setTimeout(() => {
            if (isMounted) {
              console.log('🎫 Loading user tickets...');
              loadUserTickets().catch(error => {
                if (isMounted) {
                  console.error('❌ Error loading user tickets:', error);
                }
              });
            }
          }, 100);
          
          const referralTimeout = setTimeout(() => {
            if (isMounted) {
              console.log('👥 Loading referral info...');
              loadReferralInfo().catch(error => {
                if (isMounted) {
                  console.error('❌ Error loading referral info:', error);
                }
              });
            }
          }, 500);
          
          const allowanceTimeout = setTimeout(() => {
            if (isMounted) {
              console.log('💰 Checking USDT allowance...');
              checkUsdtAllowance().catch(error => {
                if (isMounted) {
                  console.error('❌ Error checking USDT allowance:', error);
                }
              });
            }
          }, 1000);
          
          // Cleanup function
          return () => {
            clearTimeout(ticketsTimeout);
            clearTimeout(referralTimeout);
            clearTimeout(allowanceTimeout);
          };
        } catch (error) {
          if (isMounted) {
            console.error('❌ Error in loadUserData:', error);
          }
        }
      };

      const cleanup = loadUserData();
      
      return () => {
        isMounted = false;
        if (cleanup && typeof cleanup.then === 'function') {
          cleanup.then(cleanupFn => {
            if (typeof cleanupFn === 'function') {
              cleanupFn();
            }
          });
        }
      };
    } else {
      console.log('⏸️ Wallet not connected - skipping user data load');
    }
    
    return () => {
      isMounted = false;
    };
  }, [active, account]); // Removidas las funciones de las dependencias

  // Actualizar el contador de tiempo hasta el próximo sorteo
  useEffect(() => {
    if (timeUntilNextDraw <= 0) return;

    const interval = setInterval(() => {
      setTimeUntilNextDraw(prevTime => {
        if (prevTime <= 1) {
          clearInterval(interval);
          // Recargar información después de que pase el tiempo
          loadLotteryInfo();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilNextDraw, loadLotteryInfo]);

  return {
    loading,
    error,
    jackpot,
    accumulatedJackpot,
    ticketPrice,
    tickets,
    timeUntilNextDraw,
    isApproved,
    usdtBalance,
    winners,
    referralInfo,
    bulkDiscountTiers,
    referrer,
    loadLotteryInfo,
    loadUserTickets,
    loadReferralInfo,
    approveUsdtSpending,
    revokeUsdtApproval,
    buyTicket,
    buyMultipleTickets,
    checkUsdtAllowance,
    addReferral,
    calculateDiscount,
    verifyNetwork
  };
};

export default useLottery;