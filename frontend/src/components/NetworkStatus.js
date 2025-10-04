import React from 'react';
import { AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

const NetworkStatus = ({ 
  isConnected, 
  networkId, 
  networkName, 
  isCorrectNetwork, 
  onSwitchNetwork 
}) => {
  const getNetworkInfo = () => {
    if (networkId === 97) return { name: 'BSC Testnet', color: 'green' };
    if (networkId === 56) return { name: 'BSC Mainnet', color: 'blue' };
    if (networkId === 1) return { name: 'Ethereum', color: 'purple' };
    return { name: networkName || `Network ${networkId}`, color: 'gray' };
  };

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm">Not Connected</span>
      </div>
    );
  }

  const networkInfo = getNetworkInfo();

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
      isCorrectNetwork 
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }`}>
      {isCorrectNetwork ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <Wifi className="h-4 w-4" />
      <span className="text-sm font-medium">{networkInfo.name}</span>
      
      {!isCorrectNetwork && (
        <button
          onClick={onSwitchNetwork}
          className="ml-2 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
        >
          Switch to BSC Testnet
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;