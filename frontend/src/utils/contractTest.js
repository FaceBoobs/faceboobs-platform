// Test utility to verify contract connection
import { ethers } from 'ethers';
import CONTRACT_ABI from '../contracts/SocialPlatform.json';

const CONTRACT_ADDRESS = "0x575e0532445489dd31C12615BeC7C63d737B69DD";
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';

export const testContractDeployment = async () => {
  console.log('🔍 Testing contract deployment...');
  
  try {
    // Create provider for BSC testnet
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    
    // Validate contract address
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      throw new Error('Invalid contract address');
    }
    
    // Get contract bytecode to verify deployment
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      throw new Error('Contract not deployed at the specified address');
    }
    
    console.log('✅ Contract is deployed at:', CONTRACT_ADDRESS);
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, provider);
    
    // Test basic read function
    const contentCounter = await contract.contentCounter();
    console.log('✅ Contract is responsive. Content counter:', contentCounter.toString());
    
    return {
      success: true,
      contractAddress: CONTRACT_ADDRESS,
      contentCounter: contentCounter.toString(),
      message: 'Contract is properly deployed and responsive'
    };
    
  } catch (error) {
    console.error('❌ Contract test failed:', error);
    return {
      success: false,
      error: error.message,
      contractAddress: CONTRACT_ADDRESS
    };
  }
};

export const testWalletConnection = async () => {
  console.log('🔍 Testing wallet connection...');
  
  if (!window.ethereum) {
    return {
      success: false,
      error: 'MetaMask not installed'
    };
  }
  
  try {
    // Test provider creation
    const provider = new ethers.BrowserProvider(window.ethereum);
    console.log('✅ Provider created successfully');
    
    // Test network
    const network = await provider.getNetwork();
    console.log('📡 Connected to network:', {
      name: network.name,
      chainId: Number(network.chainId)
    });
    
    return {
      success: true,
      networkId: Number(network.chainId),
      networkName: network.name,
      isCorrectNetwork: Number(network.chainId) === 97
    };
    
  } catch (error) {
    console.error('❌ Wallet connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Full integration test
export const runFullTest = async () => {
  console.log('🚀 Running full contract integration test...');
  
  const results = {
    contractTest: await testContractDeployment(),
    walletTest: await testWalletConnection()
  };
  
  console.log('📊 Test Results:', results);
  return results;
};