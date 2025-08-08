import Web3 from 'web3';
import MultiTierLotteryABI from '../contracts/MultiTierLotteryABI.json';

export interface WinnerData {
  drawId: number;
  date: string;
  blockNumber: number;
  winningNumbers: number[];
  prizePool: {
    usdValue: string;
    tokenAmount: string;
  };
  matches: Array<{
    matchCount: number;
    type: string;
    prize: string;
    usdValue: string;
    prizePerTicket: string;
    winners: number;
  }>;
  totalPlayers: number;
  isLatest: boolean;
}

interface DrawEvent {
  drawId: string;
  winningNumbers: number[];
  timestamp: number;
  totalPoolAmount: string;
  accumulatedJackpot: string;
  blockNumber: number;
  transactionHash: string;
}

export class WinnersDataService {
  private web3: Web3;
  private contract: any;
  private contractAddress: string;

  constructor() {
    const rpcUrl = process.env.REACT_APP_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
    this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
    this.contractAddress = process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS || '';
    
    if (this.contractAddress) {
      this.contract = new this.web3.eth.Contract(MultiTierLotteryABI as any, this.contractAddress);
    }
  }

  // Obtener eventos de sorteos completados del contrato
  async getDrawEvents(fromBlock: number = 0, toBlock: string | number = 'latest'): Promise<DrawEvent[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log('📊 Fetching draw events from contract...');
      
      // Obtener eventos LotteryDrawCompleted
      const events = await this.contract.getPastEvents('LotteryDrawCompleted', {
        fromBlock,
        toBlock
      });

      const drawEvents: DrawEvent[] = events.map((event: any) => {
        const { drawId, winningNumbers, accumulatedJackpot } = event.returnValues;
        
        return {
          drawId: drawId.toString(),
          winningNumbers: this.unpackNumbers(winningNumbers),
          timestamp: Date.now(), // Placeholder - get from block if needed
          totalPoolAmount: accumulatedJackpot,
          accumulatedJackpot,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };
      });

      console.log(`✅ Found ${drawEvents.length} draw events`);
      return drawEvents.reverse(); // Most recent first

    } catch (error) {
      console.error('❌ Error fetching draw events:', error);
      return [];
    }
  }

  // Desempaquetar números ganadores (formato packed del contrato)
  private unpackNumbers(packedNumbers: string): number[] {
    const numbers: number[] = [];
    let packed = parseInt(packedNumbers);
    
    for (let i = 0; i < 6; i++) {
      numbers.push((packed >> (i * 8)) & 0xFF);
    }
    
    return numbers.filter(n => n > 0 && n <= 49);
  }

  // Obtener información de un sorteo específico
  async getDrawInfo(drawId: number): Promise<any> {
    try {
      if (!this.contract) return null;

      const drawInfo = await this.contract.methods.getDraw(drawId).call();
      return {
        drawId: drawInfo.drawId,
        winningNumbers: this.unpackNumbers(drawInfo.packedWinningNumbers),
        timestamp: parseInt(drawInfo.timestamp) * 1000,
        totalPoolAmount: drawInfo.totalPoolAmount,
        accumulatedJackpot: drawInfo.accumulatedJackpot
      };
    } catch (error) {
      console.error(`❌ Error getting draw ${drawId} info:`, error);
      return null;
    }
  }

  // Obtener ganadores por tier para un sorteo
  async getWinnersByTier(drawId: number, matchCount: number): Promise<string[]> {
    try {
      if (!this.contract) return [];

      const winners = await this.contract.methods.getWinnersByTier(drawId, matchCount).call();
      return winners || [];
    } catch (error) {
      console.error(`❌ Error getting winners for draw ${drawId}, tier ${matchCount}:`, error);
      return [];
    }
  }

  // Calcular premio por tier
  private calculateTierPrize(totalPool: string, matchCount: number): string {
    const pool = this.web3.utils.fromWei(totalPool, 'ether');
    const poolNum = parseFloat(pool);
    
    // Porcentajes de distribución según el contrato
    const percentages: { [key: number]: number } = {
      6: 40, // 40% para 6 aciertos
      5: 20, // 20% para 5 aciertos  
      4: 15, // 15% para 4 aciertos
      3: 10, // 10% para 3 aciertos
      2: 5   // 5% para 2 aciertos
    };

    const percentage = percentages[matchCount] || 0;
    const tierPrize = (poolNum * percentage) / 100;
    
    return tierPrize.toFixed(2);
  }

  // Formatear fecha desde timestamp
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Método principal para obtener datos de ganadores
  async getWinnersData(): Promise<{ winners: WinnerData[]; error?: string }> {
    try {
      if (!this.contractAddress) {
        return { winners: [], error: 'Contract address not configured' };
      }

      console.log('🏆 Loading real winners data from blockchain...');
      
      // Obtener eventos de sorteos recientes
      const currentBlock = await this.web3.eth.getBlockNumber();
      const fromBlock = Math.max(0, Number(currentBlock) - 100000); // Últimos ~100k blocks
      
      const drawEvents = await this.getDrawEvents(fromBlock);
      
      if (drawEvents.length === 0) {
        return { winners: [], error: 'No draws found yet' };
      }

      // Procesar cada sorteo para obtener datos completos
      const winnersData: WinnerData[] = [];
      
      for (let i = 0; i < Math.min(drawEvents.length, 5); i++) { // Últimos 5 sorteos
        const event = drawEvents[i];
        const drawInfo = await this.getDrawInfo(parseInt(event.drawId));
        
        if (!drawInfo) continue;

        // Obtener ganadores por tier
        const matches = [];
        for (let matchCount = 2; matchCount <= 6; matchCount++) {
          const winners = await this.getWinnersByTier(parseInt(event.drawId), matchCount);
          const tierPrize = this.calculateTierPrize(drawInfo.totalPoolAmount, matchCount);
          
          matches.push({
            matchCount,
            type: `Coincidir ${matchCount === 6 ? 'todo' : 'primero con'} ${matchCount}`,
            prize: `${tierPrize} USDT`,
            usdValue: `$${tierPrize}`,
            prizePerTicket: winners.length > 0 ? `${(parseFloat(tierPrize) / winners.length).toFixed(2)} USDT cada` : '0 USDT',
            winners: winners.length
          });
        }

        winnersData.push({
          drawId: parseInt(event.drawId),
          date: this.formatDate(drawInfo.timestamp),
          blockNumber: event.blockNumber,
          winningNumbers: drawInfo.winningNumbers,
          prizePool: {
            usdValue: `$${this.web3.utils.fromWei(drawInfo.totalPoolAmount, 'ether')}`,
            tokenAmount: `${this.web3.utils.fromWei(drawInfo.totalPoolAmount, 'ether')} USDT`
          },
          matches,
          totalPlayers: await this.getTotalPlayersForDraw(parseInt(event.drawId)),
          isLatest: i === 0
        });
      }

      console.log(`✅ Loaded ${winnersData.length} winner records`);
      return { winners: winnersData };

    } catch (error) {
      console.error('❌ Error loading winners data:', error);
      return { winners: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Obtener total de jugadores para un sorteo (aproximado)
  private async getTotalPlayersForDraw(drawId: number): Promise<number> {
    try {
      // Esta es una aproximación - necesitaríamos eventos de compra de tickets para ser exactos
      return Math.floor(Math.random() * 200) + 50; // Placeholder - implementar lógica real
    } catch (error) {
      return 0;
    }
  }
}

// Instancia singleton del servicio
export const winnersDataService = new WinnersDataService();

// Función helper para uso en componentes
export const getWinnersData = async (): Promise<{ rounds: WinnerData[]; error?: string }> => {
  const result = await winnersDataService.getWinnersData();
  return { rounds: result.winners, error: result.error };
};
