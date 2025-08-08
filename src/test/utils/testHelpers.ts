// Test utility functions and helpers
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Web3 testing utilities
export class Web3TestUtils {
  static mockSuccessfulTransaction(hash: string = '0xabc123') {
    return {
      status: true,
      transactionHash: hash,
      blockNumber: 12345678,
      gasUsed: '21000',
    };
  }

  static mockFailedTransaction(reason: string = 'Transaction failed') {
    return {
      status: false,
      error: reason,
    };
  }

  static mockContractCall(returnValue: any) {
    return {
      call: jest.fn().mockResolvedValue(returnValue),
    };
  }

  static mockContractSend(transactionResult: any) {
    return {
      send: jest.fn().mockResolvedValue(transactionResult),
    };
  }

  static simulateWalletConnection() {
    const mockEthereum = (window as any).ethereum;
    fireEvent(window, new Event('ethereum#initialized'));
    
    mockEthereum.request.mockImplementation(({ method }: { method: string }) => {
      switch (method) {
        case 'eth_requestAccounts':
          return Promise.resolve(['0x123456789abcdef123456789abcdef123456789a']);
        case 'eth_chainId':
          return Promise.resolve('0x61'); // BSC Testnet
        case 'eth_accounts':
          return Promise.resolve(['0x123456789abcdef123456789abcdef123456789a']);
        default:
          return Promise.resolve([]);
      }
    });
  }

  static simulateWalletDisconnection() {
    const mockEthereum = (window as any).ethereum;
    mockEthereum.request.mockImplementation(({ method }: { method: string }) => {
      switch (method) {
        case 'eth_accounts':
          return Promise.resolve([]);
        default:
          return Promise.resolve([]);
      }
    });
    
    // Trigger account change event
    mockEthereum.on.mock.calls
      .filter(([event]: [string]) => event === 'accountsChanged')
      .forEach(([, callback]: [string, Function]) => {
        callback([]);
      });
  }

  static simulateNetworkChange(chainId: string) {
    const mockEthereum = (window as any).ethereum;
    
    // Trigger chain change event
    mockEthereum.on.mock.calls
      .filter(([event]: [string]) => event === 'chainChanged')
      .forEach(([, callback]: [string, Function]) => {
        callback(chainId);
      });
  }
}

// User interaction utilities
export class UserInteractionUtils {
  static async connectWallet() {
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    await userEvent.click(connectButton);
    await waitFor(() => {
      expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
    });
  }

  static async selectLotteryNumbers(numbers: number[]) {
    for (const number of numbers) {
      const numberButton = screen.getByRole('button', { name: number.toString() });
      await userEvent.click(numberButton);
    }
  }

  static async buyTicket(numbers: number[]) {
    await this.selectLotteryNumbers(numbers);
    
    const buyButton = screen.getByRole('button', { name: /buy ticket/i });
    await userEvent.click(buyButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
    });
  }

  static async approveUSDT() {
    const approveButton = screen.getByRole('button', { name: /approve usdt/i });
    await userEvent.click(approveButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/approving/i)).not.toBeInTheDocument();
    });
  }

  static async fillForm(fieldValues: Record<string, string>) {
    for (const [label, value] of Object.entries(fieldValues)) {
      const field = screen.getByLabelText(new RegExp(label, 'i'));
      await userEvent.clear(field);
      await userEvent.type(field, value);
    }
  }

  static async submitForm() {
    const submitButton = screen.getByRole('button', { type: 'submit' });
    await userEvent.click(submitButton);
  }

  static async openModal(triggerText: string) {
    const trigger = screen.getByRole('button', { name: new RegExp(triggerText, 'i') });
    await userEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  }

  static async closeModal() {
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  }
}

// Accessibility testing utilities
export class AccessibilityTestUtils {
  static async testKeyboardNavigation(elements: HTMLElement[]) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      element.focus();
      expect(element).toHaveFocus();
      
      if (i < elements.length - 1) {
        await userEvent.keyboard('{Tab}');
        expect(elements[i + 1]).toHaveFocus();
      }
    }
  }

  static async testArrowKeyNavigation(
    elements: HTMLElement[],
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ) {
    const firstElement = elements[0];
    firstElement.focus();
    expect(firstElement).toHaveFocus();

    const key = orientation === 'vertical' ? '{ArrowDown}' : '{ArrowRight}';
    
    for (let i = 1; i < elements.length; i++) {
      await userEvent.keyboard(key);
      expect(elements[i]).toHaveFocus();
    }
  }

  static async testEscapeKeyClosesModal() {
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    
    await userEvent.keyboard('{Escape}');
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  }

  static testAriaAttributes(element: HTMLElement, expectedAttributes: Record<string, string>) {
    for (const [attribute, expectedValue] of Object.entries(expectedAttributes)) {
      expect(element).toHaveAttribute(attribute, expectedValue);
    }
  }

  static testScreenReaderText(element: HTMLElement, expectedText: string) {
    const srOnlyElement = element.querySelector('.sr-only');
    expect(srOnlyElement).toHaveTextContent(expectedText);
  }

  static async testFocusTrap(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();
    expect(firstElement).toHaveFocus();

    // Tab to last element
    lastElement.focus();
    expect(lastElement).toHaveFocus();

    // Tab from last should go to first
    await userEvent.keyboard('{Tab}');
    expect(firstElement).toHaveFocus();

    // Shift+Tab from first should go to last
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(lastElement).toHaveFocus();
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  static measureRenderTime<T>(renderFn: () => T): { result: T; time: number } {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    return {
      result,
      time: end - start,
    };
  }

  static async measureAsyncTime<T>(asyncFn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await asyncFn();
    const end = performance.now();
    
    return {
      result,
      time: end - start,
    };
  }

  static expectRenderTimeToBeLessThan(time: number, threshold: number) {
    expect(time).toBeLessThan(threshold);
  }

  static mockSlowConnection() {
    // Mock slow network conditions
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 2000,
        saveData: true,
      },
      writable: true,
    });
  }

  static mockFastConnection() {
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false,
      },
      writable: true,
    });
  }
}

// Error testing utilities
export class ErrorTestUtils {
  static simulateNetworkError() {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    return () => {
      global.fetch = originalFetch;
    };
  }

  static simulateAPIError(status: number, message: string) {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ error: message }),
    });
    
    return () => {
      global.fetch = originalFetch;
    };
  }

  static simulateTimeout(delay: number = 5000) {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), delay)
      )
    );
    
    return () => {
      global.fetch = originalFetch;
    };
  }

  static async expectErrorToBeHandled(asyncFn: () => Promise<void>, expectedError?: string) {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      await asyncFn();
    } catch (error) {
      // Error should be handled gracefully
    }
    
    if (expectedError) {
      expect(screen.getByText(new RegExp(expectedError, 'i'))).toBeInTheDocument();
    }
    
    consoleSpy.mockRestore();
  }
}

// Mock data generators
export class MockDataGenerator {
  static generateRandomNumbers(count: number, min: number = 1, max: number = 49): number[] {
    const numbers = new Set<number>();
    
    while (numbers.size < count) {
      numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    
    return Array.from(numbers).sort((a, b) => a - b);
  }

  static generateMockAddress(): string {
    return '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  static generateMockTransactionHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  static generateMockTickets(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `ticket_${i + 1}`,
      numbers: this.generateRandomNumbers(6),
      purchaseDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      isWinner: Math.random() > 0.9,
      transactionHash: this.generateMockTransactionHash(),
    }));
  }
}

// Wait utilities
export class WaitUtils {
  static async waitForElement(selector: string, timeout: number = 5000) {
    return waitFor(() => {
      const element = document.querySelector(selector);
      expect(element).toBeInTheDocument();
      return element;
    }, { timeout });
  }

  static async waitForText(text: string | RegExp, timeout: number = 5000) {
    return waitFor(() => {
      return screen.getByText(text);
    }, { timeout });
  }

  static async waitForElementToBeRemoved(element: HTMLElement, timeout: number = 5000) {
    return waitFor(() => {
      expect(element).not.toBeInTheDocument();
    }, { timeout });
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export all utilities
export {
  Web3TestUtils,
  UserInteractionUtils,
  AccessibilityTestUtils,
  PerformanceTestUtils,
  ErrorTestUtils,
  MockDataGenerator,
  WaitUtils,
};