// Mock Service Worker setup for API mocking in tests
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock API responses
const mockLotteryInfo = {
  jackpot: '10000.50',
  accumulatedJackpot: '50000.75',
  ticketPrice: '5.00',
  timeUntilNextDraw: 86400, // 1 day in seconds
  currentDraw: {
    id: '1',
    drawNumber: 123,
    status: 'active',
    nextDrawDate: '2024-01-08T00:00:00Z',
  },
  winners: [
    '0x123456789abcdef123456789abcdef123456789a',
    '0x987654321fedcba987654321fedcba987654321b',
  ],
};

const mockUserTickets = [
  {
    id: '1',
    numbers: [1, 2, 3, 4, 5, 6],
    purchaseDate: '2024-01-01T12:00:00Z',
    isWinner: false,
    transactionHash: '0xabc123def456',
  },
  {
    id: '2',
    numbers: [7, 14, 21, 28, 35, 42],
    purchaseDate: '2024-01-02T15:30:00Z',
    isWinner: true,
    winningTier: 4,
    prizeAmount: '25.00',
    transactionHash: '0xdef456abc789',
  },
];

const mockReferralInfo = {
  totalReferrals: 3,
  currentDiscount: 3,
  maxDiscount: 10,
  discountPerReferral: 1,
  referralCode: 'REF123ABC',
  earnings: '15.75',
};

const mockTransactionStatus = {
  hash: '0xabc123def456',
  status: 'confirmed',
  confirmations: 12,
  gasUsed: '21000',
  blockNumber: 12345678,
};

// Define request handlers
export const handlers = [
  // Get lottery information
  rest.get('/api/lottery/info', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockLotteryInfo,
      })
    );
  }),

  // Get user tickets
  rest.get('/api/user/:address/tickets', (req, res, ctx) => {
    const { address } = req.params;
    
    if (!address || typeof address !== 'string') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid address',
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockUserTickets,
      })
    );
  }),

  // Get referral information
  rest.get('/api/user/:address/referrals', (req, res, ctx) => {
    const { address } = req.params;
    
    if (!address || typeof address !== 'string') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid address',
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockReferralInfo,
      })
    );
  }),

  // Buy ticket
  rest.post('/api/lottery/buy-ticket', async (req, res, ctx) => {
    const body = await req.json();
    
    if (!body.numbers || !Array.isArray(body.numbers) || body.numbers.length !== 6) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid numbers selection',
        })
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          ticketId: '3',
          transactionHash: '0x123abc456def',
          numbers: body.numbers,
          purchaseDate: new Date().toISOString(),
        },
      })
    );
  }),

  // Buy multiple tickets
  rest.post('/api/lottery/buy-multiple-tickets', async (req, res, ctx) => {
    const body = await req.json();
    
    if (!body.numbersArrays || !Array.isArray(body.numbersArrays)) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid numbers arrays',
        })
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const tickets = body.numbersArrays.map((numbers: number[], index: number) => ({
      ticketId: `bulk_${index + 1}`,
      numbers,
      purchaseDate: new Date().toISOString(),
    }));

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          tickets,
          transactionHash: '0xbulk123456',
          totalDiscount: body.numbersArrays.length >= 5 ? 2 : 0,
        },
      })
    );
  }),

  // Approve USDT spending
  rest.post('/api/usdt/approve', async (req, res, ctx) => {
    const body = await req.json();
    
    if (!body.amount || parseFloat(body.amount) <= 0) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid amount',
        })
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactionHash: '0xapprove123',
          amount: body.amount,
        },
      })
    );
  }),

  // Get transaction status
  rest.get('/api/transaction/:hash/status', (req, res, ctx) => {
    const { hash } = req.params;
    
    if (!hash || typeof hash !== 'string') {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: 'Invalid transaction hash',
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          ...mockTransactionStatus,
          hash,
        },
      })
    );
  }),

  // Get historical draws
  rest.get('/api/lottery/draws', (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '10';

    const mockDraws = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: `draw_${i + 1}`,
      drawNumber: 100 + i,
      winningNumbers: [
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1,
        Math.floor(Math.random() * 49) + 1,
      ].sort((a, b) => a - b),
      drawDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
      jackpotAmount: `${(Math.random() * 100000 + 10000).toFixed(2)}`,
      totalWinners: {
        6: Math.floor(Math.random() * 2),
        5: Math.floor(Math.random() * 10),
        4: Math.floor(Math.random() * 100),
        3: Math.floor(Math.random() * 1000),
      },
      status: 'completed',
    }));

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          draws: mockDraws,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 1000,
            pages: 100,
          },
        },
      })
    );
  }),

  // WebSocket mock endpoint
  rest.get('/api/ws/connect', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        websocketUrl: 'wss://mock-ws.lottery.com',
      })
    );
  }),

  // Real-time updates endpoint (polling fallback)
  rest.get('/api/lottery/updates', (req, res, ctx) => {
    const lastUpdate = req.url.searchParams.get('since');
    const now = Date.now();

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          timestamp: now,
          draw: Math.random() > 0.8 ? {
            ...mockLotteryInfo.currentDraw,
            jackpot: (Math.random() * 100000 + 10000).toFixed(2),
          } : null,
          jackpot: Math.random() > 0.9 ? (Math.random() * 100000 + 10000).toFixed(2) : null,
          winners: Math.random() > 0.95 ? [
            '0x' + Math.random().toString(16).slice(2, 42),
          ] : null,
        },
      })
    );
  }),

  // Analytics endpoint
  rest.post('/api/analytics/event', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Event recorded',
      })
    );
  }),

  // Error simulation endpoint
  rest.get('/api/lottery/error-test', (req, res, ctx) => {
    const errorType = req.url.searchParams.get('type');
    
    switch (errorType) {
      case 'network':
        return res.networkError('Network error');
      case 'timeout':
        return res(ctx.delay('infinite'));
      case 'server':
        return res(
          ctx.status(500),
          ctx.json({
            success: false,
            error: 'Internal server error',
          })
        );
      case 'validation':
        return res(
          ctx.status(400),
          ctx.json({
            success: false,
            error: 'Validation error',
            details: {
              field: 'numbers',
              message: 'Invalid number selection',
            },
          })
        );
      default:
        return res(
          ctx.status(200),
          ctx.json({
            success: true,
            message: 'No error simulated',
          })
        );
    }
  }),

  // Rate limiting test
  rest.get('/api/lottery/rate-limit-test', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({
        success: false,
        error: 'Too many requests',
        retryAfter: 60,
      })
    );
  }),
];

// Create server instance
export const server = setupServer(...handlers);

// Helper functions for tests
export const mockSuccessfulResponse = (data: any) => {
  return {
    success: true,
    data,
  };
};

export const mockErrorResponse = (error: string, status = 400) => {
  return {
    success: false,
    error,
  };
};

export const overrideHandler = (method: 'get' | 'post' | 'put' | 'delete', url: string, handler: any) => {
  server.use(rest[method](url, handler));
};

export const resetHandlers = () => {
  server.resetHandlers();
};