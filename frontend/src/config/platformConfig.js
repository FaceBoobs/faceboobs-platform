// Platform Configuration for FaceBoobs
// This file contains the platform-level configuration including wallet addresses and fees

import { PublicKey } from '@solana/web3.js';

/**
 * IMPORTANT: Replace 'YOUR_SOLANA_WALLET_ADDRESS_HERE' with your actual Solana wallet address
 * before deploying to production.
 *
 * Example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
 */
const PLATFORM_WALLET_ADDRESS = 'YOUR_SOLANA_WALLET_ADDRESS_HERE';

/**
 * Platform wallet public key
 * This receives 2% of all content purchases as platform fee
 */
export const PLATFORM_WALLET = new PublicKey(PLATFORM_WALLET_ADDRESS);

/**
 * Platform fee percentage
 * 0.02 = 2% to platform, 98% to creator
 */
export const PLATFORM_FEE = 0.02;

/**
 * Helper function to calculate fee split
 * @param {number} totalAmount - Total amount in SOL
 * @returns {Object} - { platformFee, creatorAmount, totalAmount }
 */
export const calculateFeeSplit = (totalAmount) => {
  const platformFee = totalAmount * PLATFORM_FEE;
  const creatorAmount = totalAmount - platformFee;

  return {
    totalAmount,
    platformFee,
    creatorAmount,
    platformFeePercentage: PLATFORM_FEE * 100, // 2
    creatorPercentage: (1 - PLATFORM_FEE) * 100 // 98
  };
};

/**
 * Helper function to format the fee breakdown for user confirmation
 * @param {number} totalAmount - Total amount in SOL
 * @returns {string} - Formatted string for confirmation dialog
 */
export const formatFeeSplit = (totalAmount) => {
  const split = calculateFeeSplit(totalAmount);
  return (
    `Total: ${split.totalAmount} SOL\n\n` +
    `Creator receives: ${split.creatorAmount.toFixed(4)} SOL (${split.creatorPercentage}%)\n` +
    `Platform fee: ${split.platformFee.toFixed(4)} SOL (${split.platformFeePercentage}%)`
  );
};
