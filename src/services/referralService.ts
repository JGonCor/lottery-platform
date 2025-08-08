/**
 * Dynamic Referral Service
 * Handles dynamic referral URLs and tracking for the lottery platform
 */

import { ethers } from 'ethers';

export interface ReferralData {
  referrerAddress: string;
  referredAddress: string;
  timestamp: number;
  isValid: boolean;
  hasPurchased: boolean;
  purchaseCount: number;
  discountApplied: number;
}

export interface ReferralURL {
  url: string;
  code: string;
  referrerAddress: string;
  expiresAt: number;
}

class ReferralService {
  private readonly REFERRAL_STORAGE_KEY = 'lottery_referrals';
  private readonly REFERRAL_CODE_LENGTH = 12;
  private readonly REFERRAL_EXPIRY_DAYS = 30;
  
  // Dynamic domain detection
  private getDynamicDomain(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port;
      
      // Handle different environments
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      }
      
      // Production domains
      if (hostname.includes('netlify.app') || hostname.includes('vercel.app')) {
        return `${protocol}//${hostname}`;
      }
      
      // Custom domain
      return `${protocol}//${hostname}`;
    }
    
    // Fallback for server-side rendering
    return process.env.NEXT_PUBLIC_APP_URL || 'https://your-lottery-app.com';
  }

  /**
   * Generate a unique referral code for an address
   */
  private generateReferralCode(address: string): string {
    // Create a deterministic but unique code based on address and timestamp
    const timestamp = Date.now().toString();
    const combined = address + timestamp;
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(combined));
    
    // Take first 12 characters (without 0x prefix) and make it readable
    return hash.slice(2, 2 + this.REFERRAL_CODE_LENGTH).toUpperCase();
  }

  /**
   * Create a dynamic referral URL for a user
   */
  createReferralURL(referrerAddress: string): ReferralURL {
    if (!ethers.utils.isAddress(referrerAddress)) {
      throw new Error('Invalid referrer address');
    }

    const code = this.generateReferralCode(referrerAddress);
    const domain = this.getDynamicDomain();
    const expiresAt = Date.now() + (this.REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const referralData: ReferralURL = {
      url: `${domain}?ref=${code}`,
      code,
      referrerAddress: referrerAddress.toLowerCase(),
      expiresAt
    };

    // Store referral code mapping
    this.storeReferralCode(code, referrerAddress, expiresAt);
    
    return referralData;
  }

  /**
   * Store referral code mapping in localStorage
   */
  private storeReferralCode(code: string, referrerAddress: string, expiresAt: number): void {
    try {
      const stored = localStorage.getItem(this.REFERRAL_STORAGE_KEY);
      const referralCodes = stored ? JSON.parse(stored) : {};
      
      referralCodes[code] = {
        referrerAddress: referrerAddress.toLowerCase(),
        expiresAt,
        createdAt: Date.now()
      };
      
      localStorage.setItem(this.REFERRAL_STORAGE_KEY, JSON.stringify(referralCodes));
    } catch (error) {
      console.error('Failed to store referral code:', error);
    }
  }

  /**
   * Extract referral code from current URL
   */
  extractReferralFromURL(): string | null {
    if (typeof window === 'undefined') return null;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode && refCode.length === this.REFERRAL_CODE_LENGTH) {
      return refCode.toUpperCase();
    }
    
    return null;
  }

  /**
   * Get referrer address from referral code
   */
  getReferrerFromCode(code: string): string | null {
    try {
      const stored = localStorage.getItem(this.REFERRAL_STORAGE_KEY);
      if (!stored) return null;
      
      const referralCodes = JSON.parse(stored);
      const referralData = referralCodes[code.toUpperCase()];
      
      if (!referralData) return null;
      
      // Check if referral code has expired
      if (Date.now() > referralData.expiresAt) {
        this.cleanupExpiredCodes();
        return null;
      }
      
      return referralData.referrerAddress;
    } catch (error) {
      console.error('Failed to get referrer from code:', error);
      return null;
    }
  }

  /**
   * Process referral when user visits with ref code
   */
  processReferralVisit(userAddress: string): string | null {
    const refCode = this.extractReferralFromURL();
    if (!refCode) return null;

    const referrerAddress = this.getReferrerFromCode(refCode);
    if (!referrerAddress) return null;

    // Don't allow self-referral
    if (referrerAddress.toLowerCase() === userAddress.toLowerCase()) {
      return null;
    }

    // Store the referral relationship
    this.storeReferralRelationship(referrerAddress, userAddress);
    
    return referrerAddress;
  }

  /**
   * Store referral relationship
   */
  private storeReferralRelationship(referrerAddress: string, referredAddress: string): void {
    try {
      const relationshipKey = `referral_${referredAddress.toLowerCase()}`;
      const referralData: ReferralData = {
        referrerAddress: referrerAddress.toLowerCase(),
        referredAddress: referredAddress.toLowerCase(),
        timestamp: Date.now(),
        isValid: false, // Will be validated when first purchase is made
        hasPurchased: false,
        purchaseCount: 0,
        discountApplied: 0
      };
      
      localStorage.setItem(relationshipKey, JSON.stringify(referralData));
    } catch (error) {
      console.error('Failed to store referral relationship:', error);
    }
  }

  /**
   * Get referral data for a user
   */
  getReferralData(userAddress: string): ReferralData | null {
    try {
      const relationshipKey = `referral_${userAddress.toLowerCase()}`;
      const stored = localStorage.getItem(relationshipKey);
      
      if (!stored) return null;
      
      return JSON.parse(stored) as ReferralData;
    } catch (error) {
      console.error('Failed to get referral data:', error);
      return null;
    }
  }

  /**
   * Validate referral and mark as valid when user makes first purchase
   */
  validateReferralPurchase(userAddress: string, purchaseAmount: number): boolean {
    const referralData = this.getReferralData(userAddress);
    if (!referralData) return false;

    try {
      // Mark as valid and update purchase info
      referralData.isValid = true;
      referralData.hasPurchased = true;
      referralData.purchaseCount += 1;
      
      const relationshipKey = `referral_${userAddress.toLowerCase()}`;
      localStorage.setItem(relationshipKey, JSON.stringify(referralData));
      
      return true;
    } catch (error) {
      console.error('Failed to validate referral purchase:', error);
      return false;
    }
  }

  /**
   * Get all valid referrals for a referrer
   */
  getValidReferrals(referrerAddress: string): ReferralData[] {
    const validReferrals: ReferralData[] = [];
    
    try {
      // Iterate through localStorage to find referrals for this referrer
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('referral_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const referralData = JSON.parse(stored) as ReferralData;
            if (referralData.referrerAddress.toLowerCase() === referrerAddress.toLowerCase() 
                && referralData.isValid) {
              validReferrals.push(referralData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get valid referrals:', error);
    }
    
    return validReferrals;
  }

  /**
   * Calculate discount based on referrals
   */
  calculateReferralDiscount(referrerAddress: string, ticketCount: number): {
    discountPercent: number;
    discountAmount: number;
    referralCount: number;
  } {
    const validReferrals = this.getValidReferrals(referrerAddress);
    const referralCount = validReferrals.length;
    
    // 1% discount per referral, max 10%
    const referralDiscountPercent = Math.min(referralCount * 1, 10);
    
    // Bulk discount based on ticket count
    let bulkDiscountPercent = 0;
    if (ticketCount >= 20) {
      bulkDiscountPercent = 10;
    } else if (ticketCount >= 10) {
      bulkDiscountPercent = 5;
    } else if (ticketCount >= 5) {
      bulkDiscountPercent = 2;
    }
    
    // Take the higher discount (they don't stack)
    const finalDiscountPercent = Math.max(referralDiscountPercent, bulkDiscountPercent);
    
    // Calculate discount amount (assuming 5 USDT per ticket)
    const ticketPrice = 5;
    const totalPrice = ticketPrice * ticketCount;
    const discountAmount = (totalPrice * finalDiscountPercent) / 100;
    
    return {
      discountPercent: finalDiscountPercent,
      discountAmount,
      referralCount
    };
  }

  /**
   * Clean up expired referral codes
   */
  private cleanupExpiredCodes(): void {
    try {
      const stored = localStorage.getItem(this.REFERRAL_STORAGE_KEY);
      if (!stored) return;
      
      const referralCodes = JSON.parse(stored);
      const currentTime = Date.now();
      const cleanedCodes: any = {};
      
      Object.keys(referralCodes).forEach(code => {
        if (referralCodes[code].expiresAt > currentTime) {
          cleanedCodes[code] = referralCodes[code];
        }
      });
      
      localStorage.setItem(this.REFERRAL_STORAGE_KEY, JSON.stringify(cleanedCodes));
    } catch (error) {
      console.error('Failed to cleanup expired codes:', error);
    }
  }

  /**
   * Generate shareable referral text
   */
  generateShareText(referralURL: string): {
    twitter: string;
    telegram: string;
    whatsapp: string;
    generic: string;
  } {
    const baseText = "¡Únete a la Lotería BSC y obtén descuentos! 🎲💰";
    const benefits = "✅ Tickets desde 5 USDT\n✅ Sorteos cada 24h\n✅ Descuentos por referidos";
    
    return {
      twitter: `${baseText}\n\n${benefits}\n\nÚsame como referido: ${referralURL}\n\n#LoteriaBSC #Crypto #BSC`,
      telegram: `${baseText}\n\n${benefits}\n\nÚsame como referido aquí:\n${referralURL}`,
      whatsapp: `${baseText}\n\n${benefits}\n\nEntra con mi enlace de referido:\n${referralURL}`,
      generic: `${baseText}\n\n${benefits}\n\nEnlace de referido: ${referralURL}`
    };
  }

  /**
   * Get referral analytics for dashboard
   */
  getReferralAnalytics(referrerAddress: string): {
    totalReferrals: number;
    validReferrals: number;
    totalSaved: number;
    monthlyStats: { month: string; referrals: number }[];
  } {
    const allReferrals = this.getValidReferrals(referrerAddress);
    const validReferrals = allReferrals.filter(r => r.isValid);
    
    const totalSaved = allReferrals.reduce((sum, r) => sum + r.discountApplied, 0);
    
    // Calculate monthly stats for last 6 months
    const monthlyStats: { month: string; referrals: number }[] = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      const monthStart = date.getTime();
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime();
      
      const monthlyReferrals = allReferrals.filter(r => 
        r.timestamp >= monthStart && r.timestamp <= monthEnd
      ).length;
      
      monthlyStats.push({
        month: monthKey,
        referrals: monthlyReferrals
      });
    }
    
    return {
      totalReferrals: allReferrals.length,
      validReferrals: validReferrals.length,
      totalSaved,
      monthlyStats
    };
  }
}

// Export singleton instance
export const referralService = new ReferralService();
export default referralService;