// src/utils/walletDetection.js

/**
 * Detect if user is on mobile device
 */
export const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Detect mobile wallet provider
 */
export const isMobileWallet = () => {
  if (!window.ethereum) return false;

  return (
    window.ethereum.isMetaMask ||
    window.ethereum.isTrust ||
    window.ethereum.isCoinbaseWallet ||
    window.ethereum.isBraveWallet ||
    window.ethereum.isTokenPocket
  );
};

/**
 * Get wallet name
 */
export const getWalletName = () => {
  if (!window.ethereum) return 'Unknown';

  if (window.ethereum.isMetaMask) return 'MetaMask';
  if (window.ethereum.isTrust) return 'Trust Wallet';
  if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
  if (window.ethereum.isBraveWallet) return 'Brave Wallet';
  if (window.ethereum.isTokenPocket) return 'TokenPocket';

  return 'Web3 Wallet';
};

/**
 * Check if wallet is connected
 */
export const isWalletConnected = () => {
  return window.ethereum && window.ethereum.selectedAddress;
};

/**
 * Get current account address
 */
export const getCurrentAccount = async () => {
  if (!window.ethereum) return null;

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};

/**
 * Check wallet connection and return status
 */
export const checkWalletConnection = async () => {
  const connected = isWalletConnected();
  const account = await getCurrentAccount();
  const walletName = getWalletName();
  const mobile = isMobileDevice();
  const mobileWallet = isMobileWallet();

  return {
    connected,
    account,
    walletName,
    mobile,
    mobileWallet,
    hasEthereum: !!window.ethereum
  };
};
