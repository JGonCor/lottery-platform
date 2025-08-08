// End-to-end tests for the complete lottery user flow
import { test, expect } from '@playwright/test';
import { MockWeb3Provider } from './helpers/mockWeb3';
import { LotteryPageObject } from './page-objects/LotteryPage';

test.describe('Lottery Platform E2E Tests', () => {
  let lotteryPage: LotteryPageObject;
  let mockWeb3: MockWeb3Provider;

  test.beforeEach(async ({ page }) => {
    lotteryPage = new LotteryPageObject(page);
    mockWeb3 = new MockWeb3Provider(page);
    
    // Setup Web3 mocks
    await mockWeb3.setup();
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
  });

  test.describe('Wallet Connection Flow', () => {
    test('should connect wallet successfully', async () => {
      await test.step('Click connect wallet button', async () => {
        await lotteryPage.connectWallet();
      });

      await test.step('Verify wallet is connected', async () => {
        await expect(lotteryPage.walletAddress).toBeVisible();
        await expect(lotteryPage.walletAddress).toContainText('0x123...789a');
      });

      await test.step('Verify USDT balance is displayed', async () => {
        await expect(lotteryPage.usdtBalance).toBeVisible();
        await expect(lotteryPage.usdtBalance).toContainText('100.0 USDT');
      });
    });

    test('should handle wallet connection failure gracefully', async () => {
      await mockWeb3.simulateConnectionError();
      
      await lotteryPage.connectWallet();
      
      await expect(lotteryPage.errorMessage).toBeVisible();
      await expect(lotteryPage.errorMessage).toContainText('Failed to connect wallet');
    });

    test('should disconnect wallet', async () => {
      await lotteryPage.connectWallet();
      await lotteryPage.disconnectWallet();
      
      await expect(lotteryPage.connectButton).toBeVisible();
      await expect(lotteryPage.walletAddress).not.toBeVisible();
    });
  });

  test.describe('Ticket Purchase Flow', () => {
    test.beforeEach(async () => {
      await lotteryPage.connectWallet();
    });

    test('should purchase a single ticket', async () => {
      const numbers = [1, 7, 14, 21, 35, 42];

      await test.step('Select lottery numbers', async () => {
        await lotteryPage.selectNumbers(numbers);
        
        // Verify numbers are selected
        for (const number of numbers) {
          await expect(lotteryPage.getNumberButton(number)).toHaveAttribute('aria-pressed', 'true');
        }
      });

      await test.step('Buy ticket', async () => {
        await lotteryPage.buyTicket();
        
        // Wait for transaction confirmation
        await expect(lotteryPage.successMessage).toBeVisible();
        await expect(lotteryPage.successMessage).toContainText('Ticket purchased successfully');
      });

      await test.step('Verify ticket appears in user tickets', async () => {
        await lotteryPage.goToTicketsPage();
        
        const ticketCard = lotteryPage.getTicketCard(0);
        await expect(ticketCard).toBeVisible();
        
        // Verify ticket numbers
        for (const number of numbers) {
          await expect(ticketCard.locator(`text="${number}"`)).toBeVisible();
        }
      });
    });

    test('should handle insufficient USDT balance', async () => {
      await mockWeb3.setUsdtBalance('1.0'); // Less than ticket price
      
      await lotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      await lotteryPage.buyTicket();
      
      await expect(lotteryPage.errorMessage).toBeVisible();
      await expect(lotteryPage.errorMessage).toContainText('Insufficient USDT balance');
    });

    test('should approve USDT spending before purchase', async () => {
      await mockWeb3.setUsdtAllowance('0'); // No allowance
      
      await lotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      
      await test.step('Should show approve button', async () => {
        await expect(lotteryPage.approveButton).toBeVisible();
      });

      await test.step('Approve USDT spending', async () => {
        await lotteryPage.approveUsdt();
        
        await expect(lotteryPage.successMessage).toBeVisible();
        await expect(lotteryPage.successMessage).toContainText('USDT spending approved');
      });

      await test.step('Buy ticket after approval', async () => {
        await lotteryPage.buyTicket();
        
        await expect(lotteryPage.successMessage).toBeVisible();
        await expect(lotteryPage.successMessage).toContainText('Ticket purchased successfully');
      });
    });

    test('should purchase multiple tickets with bulk discount', async () => {
      const tickets = [
        [1, 2, 3, 4, 5, 6],
        [7, 8, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
        [25, 26, 27, 28, 29, 30],
      ];

      await lotteryPage.goToBulkPurchase();

      for (let i = 0; i < tickets.length; i++) {
        await lotteryPage.addTicketToBulk(tickets[i]);
      }

      // Verify bulk discount is shown
      await expect(lotteryPage.bulkDiscount).toBeVisible();
      await expect(lotteryPage.bulkDiscount).toContainText('2% discount applied');

      await lotteryPage.buyBulkTickets();

      await expect(lotteryPage.successMessage).toBeVisible();
      await expect(lotteryPage.successMessage).toContainText('5 tickets purchased successfully');
    });
  });

  test.describe('Referral System', () => {
    test.beforeEach(async () => {
      await lotteryPage.connectWallet();
    });

    test('should generate and share referral link', async () => {
      await lotteryPage.goToReferralPage();

      await test.step('Generate referral link', async () => {
        await lotteryPage.generateReferralLink();
        
        const referralLink = await lotteryPage.referralLink.textContent();
        expect(referralLink).toContain('?ref=0x123456789abcdef123456789abcdef123456789a');
      });

      await test.step('Copy referral link', async () => {
        await lotteryPage.copyReferralLink();
        
        await expect(lotteryPage.successMessage).toBeVisible();
        await expect(lotteryPage.successMessage).toContainText('Referral link copied');
      });
    });

    test('should apply referral discount', async () => {
      // Simulate user with referrals
      await mockWeb3.setReferralCount(3);
      
      await lotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      
      // Should show referral discount
      await expect(lotteryPage.referralDiscount).toBeVisible();
      await expect(lotteryPage.referralDiscount).toContainText('3% referral discount');
      
      const originalPrice = '5.00';
      const discountedPrice = '4.85'; // 3% discount
      
      await expect(lotteryPage.ticketPrice).toContainText(discountedPrice);
    });
  });

  test.describe('Lottery Draw Information', () => {
    test('should display current jackpot and countdown', async () => {
      await expect(lotteryPage.jackpotAmount).toBeVisible();
      await expect(lotteryPage.jackpotAmount).toContainText('10,000.50 USDT');
      
      await expect(lotteryPage.countdown).toBeVisible();
      // Should show time remaining in format like "2d 5h 30m"
      await expect(lotteryPage.countdown).toMatch(/\d+[dhm]/);
    });

    test('should show winning numbers from previous draw', async () => {
      await lotteryPage.goToWinnersPage();
      
      await expect(lotteryPage.winningNumbers).toBeVisible();
      
      // Should show 6 winning numbers
      const numbers = await lotteryPage.winningNumbers.locator('.winning-number').count();
      expect(numbers).toBe(6);
    });

    test('should display winner list', async () => {
      await lotteryPage.goToWinnersPage();
      
      await expect(lotteryPage.winnersList).toBeVisible();
      
      // Should show at least one winner
      const winners = await lotteryPage.winnersList.locator('.winner-item').count();
      expect(winners).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile devices', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        ...test.info().project.use,
        viewport: { width: 375, height: 667 }, // iPhone SE
      });
      
      const mobilePage = await mobileContext.newPage();
      const mobileLotteryPage = new LotteryPageObject(mobilePage);
      const mobileMockWeb3 = new MockWeb3Provider(mobilePage);
      
      await mobileMockWeb3.setup();
      await mobilePage.goto('/');

      // Test mobile navigation
      await expect(mobileLotteryPage.mobileMenuButton).toBeVisible();
      await mobileLotteryPage.mobileMenuButton.click();
      await expect(mobileLotteryPage.mobileMenu).toBeVisible();

      // Test wallet connection on mobile
      await mobileLotteryPage.connectWallet();
      await expect(mobileLotteryPage.walletAddress).toBeVisible();

      // Test number selection on mobile (touch targets)
      await mobileLotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      
      // Verify touch targets are at least 44px
      const numberButtons = await mobileLotteryPage.page.locator('.number-button').all();
      for (const button of numberButtons) {
        const boundingBox = await button.boundingBox();
        expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
      }

      await mobileContext.close();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await lotteryPage.connectWallet();
      
      // Test tab navigation
      await lotteryPage.page.keyboard.press('Tab');
      await expect(lotteryPage.page.locator(':focus')).toBeVisible();
      
      // Navigate through number selection using keyboard
      await lotteryPage.page.keyboard.press('Tab');
      
      // Use arrow keys to navigate numbers
      for (let i = 0; i < 6; i++) {
        await lotteryPage.page.keyboard.press('Space'); // Select number
        await lotteryPage.page.keyboard.press('ArrowRight'); // Move to next
      }
      
      // Should have 6 numbers selected
      const selectedNumbers = await lotteryPage.page.locator('[aria-pressed="true"]').count();
      expect(selectedNumbers).toBe(6);
    });

    test('should have proper ARIA labels and roles', async () => {
      await lotteryPage.connectWallet();
      
      // Check main landmark
      await expect(lotteryPage.page.locator('main')).toBeVisible();
      
      // Check number selector has proper role
      await expect(lotteryPage.page.locator('[role="group"]')).toBeVisible();
      
      // Check buttons have accessible names
      const buyButton = lotteryPage.page.locator('button:has-text("Buy Ticket")');
      await expect(buyButton).toHaveAttribute('type', 'button');
      
      // Check form labels
      const inputs = await lotteryPage.page.locator('input').all();
      for (const input of inputs) {
        const hasLabel = await input.getAttribute('aria-label') ||
                         await input.getAttribute('aria-labelledby') ||
                         await lotteryPage.page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;
        expect(hasLabel).toBeTruthy();
      }
    });

    test('should work with screen reader announcements', async () => {
      await lotteryPage.connectWallet();
      
      // Check for live regions
      await expect(lotteryPage.page.locator('[aria-live]')).toBeVisible();
      
      await lotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      
      // Should announce selection status
      const status = lotteryPage.page.locator('[aria-live="polite"]');
      await expect(status).toContainText('6 of 6 numbers selected');
    });
  });

  test.describe('Performance', () => {
    test('should load within performance budgets', async () => {
      const startTime = Date.now();
      
      await lotteryPage.page.goto('/');
      
      // Wait for app to be interactive
      await expect(lotteryPage.page.locator('[data-testid="app-container"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle slow network conditions', async ({ browser }) => {
      const slowContext = await browser.newContext({
        ...test.info().project.use,
        // Simulate slow 3G
        offline: false,
      });
      
      const slowPage = await slowContext.newPage();
      
      // Throttle network
      await slowPage.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        await route.continue();
      });
      
      const slowLotteryPage = new LotteryPageObject(slowPage);
      await slowPage.goto('/');
      
      // Should show loading states
      await expect(slowLotteryPage.loadingSpinner).toBeVisible();
      
      // Should eventually load
      await expect(slowLotteryPage.page.locator('[data-testid="app-container"]')).toBeVisible({
        timeout: 10000
      });
      
      await slowContext.close();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      await lotteryPage.connectWallet();
      
      // Simulate network failure
      await lotteryPage.page.route('**/api/**', route => route.abort());
      
      await lotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      await lotteryPage.buyTicket();
      
      // Should show error message
      await expect(lotteryPage.errorMessage).toBeVisible();
      await expect(lotteryPage.errorMessage).toContainText('Network error');
      
      // Should offer retry option
      await expect(lotteryPage.retryButton).toBeVisible();
    });

    test('should handle Web3 errors', async () => {
      await mockWeb3.simulateTransactionError();
      await lotteryPage.connectWallet();
      
      await lotteryPage.selectNumbers([1, 2, 3, 4, 5, 6]);
      await lotteryPage.buyTicket();
      
      await expect(lotteryPage.errorMessage).toBeVisible();
      await expect(lotteryPage.errorMessage).toContainText('Transaction failed');
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update jackpot in real-time', async () => {
      await lotteryPage.page.goto('/');
      
      const initialJackpot = await lotteryPage.jackpotAmount.textContent();
      
      // Simulate jackpot update via WebSocket/polling
      await mockWeb3.updateJackpot('12,500.75');
      
      // Should update without page refresh
      await expect(lotteryPage.jackpotAmount).not.toContainText(initialJackpot!);
      await expect(lotteryPage.jackpotAmount).toContainText('12,500.75');
    });

    test('should show live countdown timer', async () => {
      await lotteryPage.page.goto('/');
      
      const initialCountdown = await lotteryPage.countdown.textContent();
      
      // Wait for countdown to update (should happen every second)
      await lotteryPage.page.waitForTimeout(2000);
      
      const updatedCountdown = await lotteryPage.countdown.textContent();
      expect(updatedCountdown).not.toBe(initialCountdown);
    });
  });
});