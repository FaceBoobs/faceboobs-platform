// src/contexts/SolanaWalletContext.js - MAINNET CORS BYPASS
import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import { isMainnet } from '../config/platform';
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaWalletProvider = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;  // 🔒 MAINNET FORZATO

  // Sostituisci SOLO endpoint in SolanaWalletContext.js
const endpoint = useMemo(() => {
  return 'https://solana-rpc.publicnode.com';  // ✅ Vivo, CORS OK, mainnet
}, []);


  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
