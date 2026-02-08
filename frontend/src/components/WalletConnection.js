import React from 'react';
import { Wallet } from 'lucide-react';
import SolanaConnectButton from './SolanaConnectButton';

const WalletConnection = ({ account, onConnect, loading, networkError }) => {
  return (
    <div className="text-center py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <Wallet className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Connect your Solana wallet to access the Social Platform Web3 features
          </p>

          <div className="flex justify-center">
            <SolanaConnectButton />
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>Connect with Phantom, Solflare, or other Solana wallets</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;