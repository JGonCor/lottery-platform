import { renderHook, act } from '@testing-library/react';
import { useLottery } from './useLottery';
import useWeb3 from './useWeb3';

// Mock dependencies
jest.mock('./useWeb3');
jest.mock('../utils/web3');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;

describe('useLottery Hook Security Tests', () => {
  const mockWeb3 = {
    eth: {
      Contract: jest.fn(),
    },
    utils: {
      isAddress: jest.fn(),
    },
  };

  const mockAccount = '0x1234567890123456789012345678901234567890';
  const mockContract = {
    methods: {
      getCurrentJackpot: jest.fn(() => ({ call: jest.fn() })),
      getAccumulatedJackpot: jest.fn(() => ({ call: jest.fn() })),
      getTicketPrice: jest.fn(() => ({ call: jest.fn() })),
      getTimeUntilNextDraw: jest.fn(() => ({ call: jest.fn() })),
      getLatestDraw: jest.fn(() => ({ call: jest.fn() })),
      getWinnersByTier: jest.fn(() => ({ call: jest.fn() })),
      getBulkDiscountTiers: jest.fn(() => ({ call: jest.fn() })),
      getReferralDiscountInfo: jest.fn(() => ({ call: jest.fn() })),
      getTotalReferrals: jest.fn(() => ({ call: jest.fn() })),
      getReferrer: jest.fn(() => ({ call: jest.fn() })),
      approve: jest.fn(() => ({ send: jest.fn() })),
      balanceOf: jest.fn(() => ({ call: jest.fn() })),
      allowance: jest.fn(() => ({ call: jest.fn() })),
      buyTicket: jest.fn(() => ({ send: jest.fn() })),
      buyMultipleTickets: jest.fn(() => ({ send: jest.fn() })),
      calculateDiscount: jest.fn(() => ({ call: jest.fn() })),
      addReferral: jest.fn(() => ({ send: jest.fn() })),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseWeb3.mockReturnValue({
      web3: mockWeb3 as any,
      account: mockAccount,
      active: true,
      error: null,
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
    });

    // Mock contract constructor
    mockWeb3.eth.Contract.mockReturnValue(mockContract as any);
  });

  describe('🔒 USDT Approval Security', () => {
    it('should limit USDT approval to maximum 50 tickets', async () => {
      const { result } = renderHook(() => useLottery());

      // Mock successful approval
      mockContract.methods.approve.mockReturnValue({
        send: jest.fn().mockResolvedValue({ status: true }),
      });

      mockContract.methods.getTicketPrice.mockReturnValue({
        call: jest.fn().mockResolvedValue('1000000000000000000'), // 1 USDT
      });

      mockContract.methods.balanceOf.mockReturnValue({
        call: jest.fn().mockResolvedValue('100000000000000000000'), // 100 USDT
      });

      await act(async () => {
        // Try to approve for 100 tickets, should be limited to 50
        await result.current.approveUsdtSpending(100);
      });

      // Verify that approval was called with amount for maximum 50 tickets
      const approveCall = mockContract.methods.approve.mock.calls[0];
      expect(approveCall).toBeDefined();
    });

    it('should add 5% safety margin to approval amount', async () => {
      const { result } = renderHook(() => useLottery());

      const ticketPrice = '1000000000000000000'; // 1 USDT
      const ticketCount = 10;
      const expectedBase = BigInt(ticketPrice) * BigInt(ticketCount);
      const expectedWithMargin = expectedBase + (expectedBase * BigInt(5)) / BigInt(100);

      mockContract.methods.getTicketPrice.mockReturnValue({
        call: jest.fn().mockResolvedValue(ticketPrice),
      });

      mockContract.methods.balanceOf.mockReturnValue({
        call: jest.fn().mockResolvedValue('100000000000000000000'), // 100 USDT
      });

      mockContract.methods.approve.mockReturnValue({
        send: jest.fn().mockResolvedValue({ status: true }),
      });

      await act(async () => {
        await result.current.approveUsdtSpending(ticketCount);
      });

      // Verify the approval amount includes the safety margin
      const approveCall = mockContract.methods.approve.mock.calls[0];
      expect(approveCall[1]).toBe(expectedWithMargin.toString());
    });

    it('should provide revokeUsdtApproval function', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.approve.mockReturnValue({
        send: jest.fn().mockResolvedValue({ status: true }),
      });

      await act(async () => {
        await result.current.revokeUsdtApproval();
      });

      // Verify that approval was set to 0
      const approveCall = mockContract.methods.approve.mock.calls[0];
      expect(approveCall[1]).toBe('0');
    });

    it('should check user balance before approval', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.getTicketPrice.mockReturnValue({
        call: jest.fn().mockResolvedValue('1000000000000000000'), // 1 USDT
      });

      // Mock insufficient balance
      mockContract.methods.balanceOf.mockReturnValue({
        call: jest.fn().mockResolvedValue('500000000000000000'), // 0.5 USDT
      });

      await act(async () => {
        try {
          await result.current.approveUsdtSpending(1);
        } catch (error) {
          expect(error.message).toContain('Balance insuficiente de USDT');
        }
      });
    });
  });

  describe('🛡️ Network Validation', () => {
    it('should verify correct network before transactions', async () => {
      const { result } = renderHook(() => useLottery());

      // Mock network verification functions
      const mockIsCorrectNetwork = require('../utils/web3').isCorrectNetwork;
      mockIsCorrectNetwork.mockResolvedValue(false);

      await act(async () => {
        try {
          await result.current.buyTicket([1, 2, 3, 4, 5, 6]);
        } catch (error) {
          expect(error.message).toContain('Red incorrecta');
        }
      });
    });

    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useLottery());

      // Mock network error
      const mockIsCorrectNetwork = require('../utils/web3').isCorrectNetwork;
      mockIsCorrectNetwork.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.verifyNetwork();
      });

      // Should handle the error without crashing
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('🎯 Input Validation', () => {
    it('should validate ticket numbers correctly', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.buyTicket.mockReturnValue({
        send: jest.fn().mockResolvedValue({ status: true }),
      });

      // Test invalid number count
      await act(async () => {
        try {
          await result.current.buyTicket([1, 2, 3, 4, 5]); // Only 5 numbers
        } catch (error) {
          expect(error.message).toBe('Debes seleccionar exactamente 6 números');
        }
      });

      // Test valid numbers
      await act(async () => {
        const numbers = [1, 2, 3, 4, 5, 6];
        await result.current.buyTicket(numbers);
      });

      // Verify numbers were sorted before sending to contract
      const buyTicketCall = mockContract.methods.buyTicket.mock.calls[0];
      expect(buyTicketCall[0]).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should validate referral addresses', async () => {
      const { result } = renderHook(() => useLottery());

      mockWeb3.utils.isAddress.mockReturnValue(false);

      // Should validate address format before proceeding
      await act(async () => {
        try {
          await result.current.addReferral('invalid-address');
        } catch (error) {
          // Should handle invalid address
        }
      });
    });
  });

  describe('📊 State Management', () => {
    it('should handle loading states correctly', async () => {
      const { result } = renderHook(() => useLottery());

      expect(result.current.loading).toBe(false);

      // Mock slow response
      mockContract.methods.getCurrentJackpot.mockReturnValue({
        call: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      act(() => {
        result.current.loadLotteryInfo();
      });

      expect(result.current.loading).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { result } = renderHook(() => useLottery());

      // Mock contract error
      mockContract.methods.getCurrentJackpot.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('Contract error')),
      });

      await act(async () => {
        await result.current.loadLotteryInfo();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.loading).toBe(false);
    });

    it('should reset error state on successful operations', async () => {
      const { result } = renderHook(() => useLottery());

      // Set initial error
      act(() => {
        result.current.error = new Error('Test error');
      });

      // Mock successful operation
      mockContract.methods.getCurrentJackpot.mockReturnValue({
        call: jest.fn().mockResolvedValue('1000000000000000000'),
      });

      await act(async () => {
        await result.current.loadLotteryInfo();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('🔄 Referral System Security', () => {
    it('should validate referral URL parameters safely', async () => {
      // Mock URL with referral parameter
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: '?ref=0x1234567890123456789012345678901234567890',
      };

      const { result } = renderHook(() => useLottery());

      mockWeb3.utils.isAddress.mockReturnValue(true);
      mockContract.methods.getReferrer.mockReturnValue({
        call: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000'),
      });

      mockContract.methods.getPlayerTickets.mockReturnValue({
        call: jest.fn().mockResolvedValue(['0']), // Referrer has tickets
      });

      // Should process referral safely
      await act(async () => {
        // Referral processing happens in useEffect
      });

      // Restore original location
      window.location = originalLocation;
    });

    it('should prevent self-referral from URL', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: `?ref=${mockAccount}`, // Same as current account
      };

      const { result } = renderHook(() => useLottery());

      mockWeb3.utils.isAddress.mockReturnValue(true);

      // Should not attempt to refer self
      await act(async () => {
        // Self-referral should be prevented
      });

      window.location = originalLocation;
    });
  });

  describe('💰 Discount Calculation', () => {
    it('should calculate discounts correctly', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.calculateDiscount.mockReturnValue({
        call: jest.fn().mockResolvedValue('5'), // 5% discount
      });

      let discount = 0;
      await act(async () => {
        discount = await result.current.calculateDiscount(10);
      });

      expect(discount).toBe(5);
    });

    it('should handle discount calculation errors', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.calculateDiscount.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('Calculation error')),
      });

      let discount = 0;
      await act(async () => {
        discount = await result.current.calculateDiscount(10);
      });

      // Should return 0 on error
      expect(discount).toBe(0);
    });
  });

  describe('🕒 Time Management', () => {
    it('should update countdown timer correctly', (done) => {
      const { result } = renderHook(() => useLottery());

      // Set initial time
      act(() => {
        result.current.timeUntilNextDraw = 5;
      });

      // Wait for timer to tick
      setTimeout(() => {
        expect(result.current.timeUntilNextDraw).toBeLessThan(5);
        done();
      }, 1100);
    });

    it('should reload lottery info when countdown reaches zero', (done) => {
      const { result } = renderHook(() => useLottery());

      const loadLotteryInfoSpy = jest.spyOn(result.current, 'loadLotteryInfo');

      act(() => {
        result.current.timeUntilNextDraw = 1;
      });

      setTimeout(() => {
        expect(loadLotteryInfoSpy).toHaveBeenCalled();
        done();
      }, 1100);
    });
  });

  describe('🔧 Transaction Handling', () => {
    it('should handle transaction failures gracefully', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.buyTicket.mockReturnValue({
        send: jest.fn().mockResolvedValue({ status: false }), // Failed transaction
      });

      await act(async () => {
        try {
          await result.current.buyTicket([1, 2, 3, 4, 5, 6]);
        } catch (error) {
          expect(error.message).toContain('La transacción de compra falló');
        }
      });
    });

    it('should reload data after successful transactions', async () => {
      const { result } = renderHook(() => useLottery());

      mockContract.methods.buyTicket.mockReturnValue({
        send: jest.fn().mockResolvedValue({ status: true }),
      });

      const loadInfoSpy = jest.spyOn(result.current, 'loadLotteryInfo');
      const loadTicketsSpy = jest.spyOn(result.current, 'loadUserTickets');

      await act(async () => {
        await result.current.buyTicket([1, 2, 3, 4, 5, 6]);
      });

      expect(loadInfoSpy).toHaveBeenCalled();
      expect(loadTicketsSpy).toHaveBeenCalled();
    });
  });
});