# WalletConnect v2 Integration Guide

## Overview

This project now supports **WalletConnect v2** integration using the latest Reown AppKit (formerly WalletConnect Web3Modal). The integration provides seamless wallet connection for both desktop and mobile users with automatic device detection and optimized user experience.

## Features

### ✅ Multi-Platform Support
- **Desktop**: MetaMask browser extension + WalletConnect QR codes
- **Mobile**: MetaMask mobile app deep links + WalletConnect mobile wallet integration
- **Automatic Detection**: Smart detection of device type and available wallets

### ✅ Enhanced User Experience
- **Smart Connection Flow**: Automatically suggests the best connection method
- **Mobile-First**: On mobile, prioritizes MetaMask app or shows QR codes for other wallets
- **Desktop-Optimized**: On desktop, offers MetaMask extension or WalletConnect for mobile wallets

### ✅ BSC Testnet Configuration
- Pre-configured for Binance Smart Chain Testnet
- Automatic network switching for MetaMask
- Network validation and error handling

## Setup Instructions

### 1. Install Dependencies

The required packages are already installed:
```bash
npm install @reown/appkit @reown/appkit-adapter-ethers qrcode.js
```

### 2. Get WalletConnect Project ID

1. Visit [Reown Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your Project ID
4. Update the `.env` file:

```bash
# Required: Your WalletConnect Project ID
REACT_APP_WALLETCONNECT_PROJECT_ID=your-actual-project-id-here

# Optional: Custom RPC endpoints
REACT_APP_BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
```

### 3. Configure Your Project

Update the metadata in `src/contexts/Web3Context.js`:

```javascript
const metadata = {
  name: 'Your App Name',
  description: 'Your app description',
  url: 'https://your-domain.com',
  icons: ['https://your-domain.com/logo.png']
};
```

## How It Works

### Connection Flow

1. **Auto-Detection**: The app detects if the user is on mobile or desktop
2. **Method Selection**: Based on device and available wallets, suggests optimal connection:
   - **Mobile with MetaMask**: Direct MetaMask app integration
   - **Mobile without MetaMask**: WalletConnect QR code scanning
   - **Desktop with MetaMask**: Browser extension connection
   - **Desktop without MetaMask**: WalletConnect for mobile wallet pairing

3. **Network Validation**: Ensures connection to BSC Testnet (Chain ID: 97)
4. **Contract Integration**: Automatically initializes smart contract interaction

### Mobile Experience

- **MetaMask Users**: One-tap connection via deep link
- **Other Wallets**: QR code scanning to connect any WalletConnect-compatible wallet
- **Responsive UI**: Mobile-optimized interface with touch-friendly buttons

### Desktop Experience

- **MetaMask Extension**: Direct browser extension connection
- **Mobile Wallet Pairing**: QR codes for pairing with mobile wallets
- **Multiple Options**: Choice between extension and mobile wallet connection

## Technical Implementation

### Key Components

1. **Web3Context** (`src/contexts/Web3Context.js`)
   - Enhanced with WalletConnect v2 integration
   - Device detection utilities
   - Connection method management
   - BSC Testnet configuration

2. **WalletConnection Component** (`src/components/WalletConnection.js`)
   - Adaptive UI based on device type
   - Connection method selection
   - Error handling and user feedback

### Configuration Details

```javascript
// BSC Testnet Configuration
const bscTestnet = {
  chainId: 97,
  name: 'BSC Testnet',
  currency: 'BNB',
  explorerUrl: 'https://testnet.bscscan.com',
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545'
};

// Mobile Detection
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
         window.innerWidth <= 768;
};
```

## Testing

### Local Development

1. Start the development server:
```bash
npm start
```

2. Test on desktop:
   - Try MetaMask extension connection
   - Try WalletConnect QR code scanning

3. Test on mobile:
   - Try MetaMask mobile app connection
   - Try other WalletConnect-compatible wallets

### Production Testing

1. Deploy with proper domain and SSL
2. Update metadata URLs to production values
3. Test with real WalletConnect Project ID
4. Verify BSC Testnet functionality

## Supported Wallets

### Mobile Wallets
- MetaMask Mobile
- Trust Wallet
- Coinbase Wallet
- Rainbow Wallet
- Any WalletConnect v2 compatible wallet

### Desktop Wallets
- MetaMask Browser Extension
- Any mobile wallet via WalletConnect pairing

## Troubleshooting

### Common Issues

1. **WalletConnect Not Working**
   - Verify Project ID is correct
   - Check that domain is registered in Reown Cloud
   - Ensure proper HTTPS setup

2. **MetaMask Mobile Not Opening**
   - Verify MetaMask app is installed
   - Check if deep links are working
   - Try manual connection via WalletConnect

3. **Network Issues**
   - Ensure BSC Testnet is added to wallet
   - Check RPC endpoint availability
   - Verify contract address is correct

### Debug Information

The Web3Context provides debug functions:
```javascript
// Check stored images and connection state
context.debugStoredImages();

// Test contract connection
await context.testContractConnection();
```

## Security Considerations

1. **Project ID**: Keep your WalletConnect Project ID secure but note it's exposed client-side
2. **Domain Validation**: Configure allowed domains in Reown Cloud
3. **HTTPS**: Always use HTTPS in production
4. **Contract Validation**: Always validate contract addresses and network IDs

## Future Enhancements

Potential improvements:
- [ ] Add Coinbase Smart Wallet integration
- [ ] Support for additional networks
- [ ] Enhanced error messaging
- [ ] Connection state persistence
- [ ] Analytics integration

## Support

For WalletConnect-specific issues:
- [Reown Documentation](https://docs.reown.com/)
- [WalletConnect GitHub](https://github.com/WalletConnect)

For project-specific issues:
- Check console logs for detailed error messages
- Verify network and contract configuration
- Test with different wallets and devices