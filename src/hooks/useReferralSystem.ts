import { useState, useEffect, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import Web3 from 'web3';

export interface ReferralData {
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  totalEarnings: string; // USDT amount
  pendingRewards: string; // USDT amount
  referralHistory: ReferralRecord[];
  commission: number; // Percentage (e.g., 5 for 5%)
}

export interface ReferralRecord {
  id: string;
  referredAddress: string;
  timestamp: number;
  ticketsPurchased: number;
  commission: string; // USDT amount earned
  status: 'pending' | 'paid' | 'cancelled';
}

export interface ReferralStats {
  totalUsers: number;
  totalVolume: string; // Total USDT volume from referrals
  averageTicketsPerUser: number;
  topReferrers: Array<{
    address: string;
    referrals: number;
    earnings: string;
  }>;
}

// Storage keys for local data
const REFERRAL_STORAGE_KEY = 'lottery_referral_data';
const REFERRAL_HISTORY_KEY = 'lottery_referral_history';

export const useReferralSystem = () => {
  const { account, active } = useWeb3React<Web3>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);

  // Generate a unique referral code based on wallet address
  const generateReferralCode = useCallback((address: string): string => {
    if (!address) return '';
    
    // Create a short, readable code from address
    const hash = Web3.utils.keccak256(address);
    const shortHash = hash.slice(2, 10).toUpperCase(); // Take first 8 characters
    
    // Make it more readable by adding a prefix
    return `REF${shortHash}`;
  }, []);

  // Generate full referral URL
  const generateReferralUrl = useCallback((referralCode: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${referralCode}`;
  }, []);

  // Get current referral code from URL
  const getCurrentReferralCode = useCallback((): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }, []);

  // Store referral relationship
  const storeReferralRelationship = useCallback((referrerCode: string, referredAddress: string) => {
    try {
      const existingData = localStorage.getItem(REFERRAL_HISTORY_KEY);
      const referralHistory = existingData ? JSON.parse(existingData) : {};
      
      // Store the relationship
      if (!referralHistory[referredAddress]) {
        referralHistory[referredAddress] = {
          referrerCode,
          timestamp: Date.now(),
          isActive: true
        };
        
        localStorage.setItem(REFERRAL_HISTORY_KEY, JSON.stringify(referralHistory));
        console.log('Referral relationship stored:', { referrerCode, referredAddress });
      }
    } catch (error) {
      console.error('Error storing referral relationship:', error);
    }
  }, []);

  // Load referral data for current user
  const loadReferralData = useCallback(async () => {
    if (!account || !active) {
      setReferralData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const referralCode = generateReferralCode(account);
      const referralUrl = generateReferralUrl(referralCode);
      
      // Load from localStorage (in production, this would come from blockchain/API)
      const storedData = localStorage.getItem(`${REFERRAL_STORAGE_KEY}_${account}`);
      let userData: Partial<ReferralData> = {};
      
      if (storedData) {
        try {
          userData = JSON.parse(storedData);
        } catch (e) {
          console.warn('Error parsing stored referral data:', e);
        }
      }

      // Load referral history
      const historyData = localStorage.getItem(REFERRAL_HISTORY_KEY);
      const allReferrals = historyData ? JSON.parse(historyData) : {};
      
      // Filter referrals for this user
      const userReferrals = Object.entries(allReferrals)
        .filter(([_, data]: [string, any]) => data.referrerCode === referralCode)
        .map(([address, data]: [string, any]) => ({
          id: `${referralCode}_${address}`,
          referredAddress: address,
          timestamp: data.timestamp,
          ticketsPurchased: userData.referralHistory?.find(r => r.referredAddress === address)?.ticketsPurchased || 0,
          commission: userData.referralHistory?.find(r => r.referredAddress === address)?.commission || '0',
          status: 'pending' as const
        }));

      const newReferralData: ReferralData = {
        referralCode,
        referralUrl,
        totalReferrals: userReferrals.length,
        totalEarnings: userData.totalEarnings || '0',
        pendingRewards: userData.pendingRewards || '0',
        referralHistory: userReferrals,
        commission: 5 // 5% commission rate
      };

      setReferralData(newReferralData);
      
      // Save updated data
      localStorage.setItem(`${REFERRAL_STORAGE_KEY}_${account}`, JSON.stringify(newReferralData));
      
    } catch (err) {
      console.error('Error loading referral data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load referral data'));
    } finally {
      setLoading(false);
    }
  }, [account, active, generateReferralCode, generateReferralUrl]);

  // Update referral data when user makes a purchase
  const updateReferralOnPurchase = useCallback(async (ticketCount: number, totalAmount: string) => {
    if (!account || !active) return;

    const currentRef = getCurrentReferralCode();
    if (currentRef) {
      // User was referred, update referrer's data
      try {
        // Find the referrer's address (this would typically be done via smart contract)
        const historyData = localStorage.getItem(REFERRAL_HISTORY_KEY);
        const allReferrals = historyData ? JSON.parse(historyData) : {};
        
        // In a real implementation, you would query the smart contract
        // For now, we'll simulate the referral commission calculation
        const commission = (parseFloat(totalAmount) * 0.05).toFixed(2); // 5% commission
        
        console.log('Referral purchase detected:', {
          referralCode: currentRef,
          ticketCount,
          totalAmount,
          commission
        });
        
        // Store this referral relationship
        storeReferralRelationship(currentRef, account);
        
      } catch (error) {
        console.error('Error processing referral purchase:', error);
      }
    }
  }, [account, active, getCurrentReferralCode, storeReferralRelationship]);

  // Load referral stats (global statistics)
  const loadReferralStats = useCallback(async () => {
    try {
      // In production, this would come from blockchain analytics
      // For now, we'll generate mock stats
      const stats: ReferralStats = {
        totalUsers: 1247,
        totalVolume: '45,678.50',
        averageTicketsPerUser: 3.2,
        topReferrers: [
          { address: '0x1234...5678', referrals: 156, earnings: '1,240.50' },
          { address: '0xabcd...efgh', referrals: 142, earnings: '1,130.75' },
          { address: '0x9876...5432', referrals: 98, earnings: '780.25' }
        ]
      };
      
      setReferralStats(stats);
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  }, []);

  // Copy referral URL to clipboard
  const copyReferralUrl = useCallback(async (): Promise<boolean> => {
    if (!referralData?.referralUrl) return false;
    
    try {
      await navigator.clipboard.writeText(referralData.referralUrl);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = referralData.referralUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
        return false;
      }
    }
  }, [referralData?.referralUrl]);

  // Share referral URL via Web Share API or fallback
  const shareReferralUrl = useCallback(async (): Promise<boolean> => {
    if (!referralData?.referralUrl) return false;
    
    const shareData = {
      title: 'Únete a la Lotería BSC',
      text: '¡Gana grandes premios en la lotería más justa y transparente! Usa mi código de referido y obtén bonificaciones especiales.',
      url: referralData.referralUrl
    };
    
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return true;
      } else {
        // Fallback to copying
        return await copyReferralUrl();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      return await copyReferralUrl();
    }
  }, [referralData?.referralUrl, copyReferralUrl]);

  // Initialize referral system
  useEffect(() => {
    loadReferralData();
    loadReferralStats();
  }, [loadReferralData, loadReferralStats]);

  // Check for referral code in URL on mount
  useEffect(() => {
    const referralCode = getCurrentReferralCode();
    if (referralCode && account && active) {
      console.log('User accessed with referral code:', referralCode);
      // Store this for later use when user makes a purchase
      sessionStorage.setItem('current_referral', referralCode);
    }
  }, [getCurrentReferralCode, account, active]);

  return {
    // Data
    referralData,
    referralStats,
    loading,
    error,
    
    // Actions
    loadReferralData,
    updateReferralOnPurchase,
    copyReferralUrl,
    shareReferralUrl,
    
    // Utilities
    generateReferralCode,
    generateReferralUrl,
    getCurrentReferralCode
  };
};

export default useReferralSystem;