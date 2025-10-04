import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

const ContractDebugger = () => {
  const { 
    contract, 
    account, 
    isConnected, 
    isCorrectNetwork, 
    contractError, 
    isInitializing,
    connectWallet,
    testContractConnection 
  } = useWeb3();
  
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  const runContractTest = async () => {
    setTesting(true);
    setTestResult('Running contract test...');
    
    try {
      const result = await testContractConnection();
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md">
      <h3 className="font-bold text-lg mb-2">🔧 Contract Debugger</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Connection Status:</strong>
          <span className={`ml-2 px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div>
          <strong>Network:</strong>
          <span className={`ml-2 px-2 py-1 rounded ${isCorrectNetwork ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isCorrectNetwork ? 'BSC Testnet ✅' : 'Wrong Network ⚠️'}
          </span>
        </div>
        
        <div>
          <strong>Contract:</strong>
          <span className={`ml-2 px-2 py-1 rounded ${contract ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isInitializing ? 'Initializing...' : contract ? 'Available ✅' : 'Not Available ❌'}
          </span>
        </div>
        
        {account && (
          <div>
            <strong>Account:</strong>
            <span className="ml-2 text-xs font-mono">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
          </div>
        )}
        
        {contractError && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <strong className="text-red-800">Error:</strong>
            <p className="text-red-600 text-xs mt-1">{contractError}</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 space-y-2">
        {!isConnected ? (
          <button
            onClick={connectWallet}
            className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={runContractTest}
            disabled={testing || !contract}
            className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
          >
            {testing ? 'Testing...' : 'Test Contract'}
          </button>
        )}
      </div>
      
      {testResult && (
        <div className="mt-4 bg-gray-50 border rounded p-2">
          <strong className="text-sm">Test Result:</strong>
          <pre className="text-xs mt-1 whitespace-pre-wrap overflow-auto max-h-32">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ContractDebugger;