// Platform Configuration for FaceBoobs
// Sistema di commissioni e configurazione wallet piattaforma

import { PublicKey } from '@solana/web3.js';

/**
 * Configurazione della piattaforma FaceBoobs
 */
export const PLATFORM_CONFIG = {
  // Wallet address della piattaforma che riceve le commissioni del 2%
  WALLET_ADDRESS: new PublicKey('3YtSSzHpdbvK9EktkGwmnbZDoAQ4bnFesq9zNu1XwUTA'),

  // Percentuale di commissione (2% = 0.02)
  FEE_PERCENTAGE: 0.02,

  // Network Solana (cambia in 'mainnet-beta' quando vai in produzione)
  NETWORK: 'mainnet-beta',
};

/**
 * Calcola la divisione delle commissioni
 * @param {number} totalAmount - Importo totale in SOL
 * @returns {Object} - Oggetto con total, platformFee, creatorAmount
 */
export const calculateFees = (totalAmount) => {
  const platformFee = totalAmount * PLATFORM_CONFIG.FEE_PERCENTAGE;
  const creatorAmount = totalAmount - platformFee;

  return {
    total: totalAmount,
    platformFee,
    creatorAmount,
  };
};

/**
 * Formatta il breakdown delle commissioni per mostrarlo all'utente
 * @param {number} totalAmount - Importo totale in SOL
 * @returns {string} - Stringa formattata per il dialogo di conferma
 */
export const formatFeeBreakdown = (totalAmount) => {
  const fees = calculateFees(totalAmount);
  const platformPercentage = PLATFORM_CONFIG.FEE_PERCENTAGE * 100;
  const creatorPercentage = 100 - platformPercentage;

  return (
    `Total: ${fees.total} SOL\n\n` +
    `Creator receives: ${fees.creatorAmount.toFixed(4)} SOL (${creatorPercentage}%)\n` +
    `Platform fee: ${fees.platformFee.toFixed(4)} SOL (${platformPercentage}%)`
  );
};

/**
 * Verifica se siamo su mainnet o devnet
 * @returns {boolean} - true se siamo su mainnet
 */
export const isMainnet = () => {
  return PLATFORM_CONFIG.NETWORK === 'mainnet-beta';
};
