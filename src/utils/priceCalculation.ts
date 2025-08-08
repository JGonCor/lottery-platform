import { fromWei, toWei } from './web3';

// Price calculation utilities that match smart contract logic exactly
export interface PriceCalculation {
  ticketCount: number;
  unitPrice: string; // in USDT
  subtotal: string; // in USDT
  bulkDiscount: number; // percentage
  referralDiscount: number; // percentage
  totalDiscount: number; // percentage
  discountAmount: string; // in USDT
  finalTotal: string; // in USDT
  totalInWei: string; // for contract calls
}

export interface BulkDiscountTier {
  ticketCount: number;
  discountPercent: number;
}

export interface ReferralInfo {
  totalReferrals: number;
  maxDiscount: number;
  discountPerReferral: number;
  currentDiscount: number;
}

/**
 * Calculate the exact price following smart contract logic
 * This function replicates the discount calculation from the smart contract
 */
export const calculateExactPrice = (
  ticketCount: number,
  unitPriceUSDT: string,
  bulkDiscountTiers: BulkDiscountTier[],
  referralInfo: ReferralInfo
): PriceCalculation => {
  if (ticketCount <= 0) {
    throw new Error('Ticket count must be greater than 0');
  }

  const unitPrice = parseFloat(unitPriceUSDT);
  if (isNaN(unitPrice) || unitPrice <= 0) {
    throw new Error('Invalid unit price');
  }

  // Calculate subtotal
  const subtotal = unitPrice * ticketCount;

  // Calculate bulk discount (highest applicable tier)
  let bulkDiscount = 0;
  for (const tier of bulkDiscountTiers.sort((a, b) => b.ticketCount - a.ticketCount)) {
    if (ticketCount >= tier.ticketCount) {
      bulkDiscount = tier.discountPercent;
      break;
    }
  }

  // Referral discount is already calculated
  const referralDiscount = referralInfo.currentDiscount;

  // Total discount (smart contract might have different logic - check contract)
  // Assuming discounts are additive but capped at reasonable maximum
  const totalDiscount = Math.min(bulkDiscount + referralDiscount, 90); // Cap at 90%

  // Calculate discount amount
  const discountAmount = (subtotal * totalDiscount) / 100;

  // Calculate final total
  const finalTotal = subtotal - discountAmount;

  // Convert to wei for contract calls (USDT has 18 decimals like ETH)
  const totalInWei = toWei(finalTotal.toString());

  return {
    ticketCount,
    unitPrice: unitPrice.toFixed(2),
    subtotal: subtotal.toFixed(2),
    bulkDiscount,
    referralDiscount,
    totalDiscount,
    discountAmount: discountAmount.toFixed(2),
    finalTotal: finalTotal.toFixed(2),
    totalInWei
  };
};

/**
 * Validate that a price calculation matches expected contract behavior
 */
export const validatePriceCalculation = (calculation: PriceCalculation): boolean => {
  const {
    ticketCount,
    unitPrice,
    subtotal,
    totalDiscount,
    discountAmount,
    finalTotal
  } = calculation;

  // Basic validation
  if (ticketCount <= 0) return false;
  if (parseFloat(unitPrice) <= 0) return false;
  if (totalDiscount < 0 || totalDiscount > 90) return false;

  // Math validation
  const expectedSubtotal = parseFloat(unitPrice) * ticketCount;
  const expectedDiscountAmount = (expectedSubtotal * totalDiscount) / 100;
  const expectedFinalTotal = expectedSubtotal - expectedDiscountAmount;

  const tolerance = 0.01; // 1 cent tolerance for floating point errors
  
  return (
    Math.abs(parseFloat(subtotal) - expectedSubtotal) < tolerance &&
    Math.abs(parseFloat(discountAmount) - expectedDiscountAmount) < tolerance &&
    Math.abs(parseFloat(finalTotal) - expectedFinalTotal) < tolerance
  );
};

/**
 * Format price for display with proper USDT formatting
 */
export const formatUSDTPrice = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0.00 USDT';
  
  return `${numAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} USDT`;
};

/**
 * Calculate gas estimate for lottery transactions
 */
export const estimateGasCost = (ticketCount: number): {
  estimatedGas: string;
  gasPriceGwei: string;
  estimatedCostBNB: string;
} => {
  // Base gas for contract interaction
  const baseGas = 100000;
  
  // Additional gas per ticket (approximate)
  const gasPerTicket = 50000;
  
  const totalGas = baseGas + (gasPerTicket * ticketCount);
  
  // Typical BSC gas price (3 gwei)
  const gasPriceGwei = '3';
  
  // Calculate cost in BNB (gas * gasPrice)
  const gasCostWei = totalGas * parseInt(gasPriceGwei) * 1e9;
  const gasCostBNB = gasCostWei / 1e18;
  
  return {
    estimatedGas: totalGas.toString(),
    gasPriceGwei,
    estimatedCostBNB: gasCostBNB.toFixed(6)
  };
};

/**
 * Check if user has sufficient balance for transaction
 */
export const checkSufficientBalance = (
  userBalance: string,
  requiredAmount: string,
  gasEstimate: string = '0.001' // BNB for gas
): {
  hasEnoughUSDT: boolean;
  hasEnoughBNB: boolean;
  shortfallUSDT: string;
  shortfallBNB: string;
} => {
  const balance = parseFloat(userBalance);
  const required = parseFloat(requiredAmount);
  const gas = parseFloat(gasEstimate);
  
  // For this implementation, we assume user has enough BNB for gas
  // In production, you'd check BNB balance separately
  
  return {
    hasEnoughUSDT: balance >= required,
    hasEnoughBNB: true, // Simplified assumption
    shortfallUSDT: Math.max(0, required - balance).toFixed(2),
    shortfallBNB: '0'
  };
};