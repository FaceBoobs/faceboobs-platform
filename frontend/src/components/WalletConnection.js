import React from 'react';
import { Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

const WalletConnection = ({ account, onConnect, loading, networkError }) => {
  const { connectWallet } = useWeb3();

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Connection failed:', error);
      // You might want to show an error message here
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (account) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{formatAddress(account)}</span>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <Wallet className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to access the Social Platform Web3 features
          </p>

          {networkError && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg mb-4 border border-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{networkError}</span>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>

          <div className="mt-4 text-xs text-gray-500">
            <p>Connect with MetaMask and make sure you're on BSC Testnet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;