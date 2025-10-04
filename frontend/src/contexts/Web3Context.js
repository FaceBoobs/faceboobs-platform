import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CONTRACT_ABI from '../contracts/SocialPlatform.json';

const CONTRACT_ADDRESS = "0x575e0532445489dd31C12615BeC7C63d737B69DD";
const BSC_TESTNET_CHAIN_ID = 97;

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkId, setNetworkId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [contractError, setContractError] = useState(null);

  // Initialize Web3
  useEffect(() => {
    const initializeWeb3 = async () => {
      if (window.ethereum) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);

        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId) => {
          setNetworkId(parseInt(chainId, 16));
          window.location.reload();
        });

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length === 0) {
            disconnectWallet();
          } else if (accounts[0] !== account) {
            setAccount(accounts[0]);
          }
        });

        // Check if already connected
        checkConnection();
      }
    };

    initializeWeb3();
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);

          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const network = await web3Provider.getNetwork();
          setNetworkId(Number(network.chainId));

          if (Number(network.chainId) === BSC_TESTNET_CHAIN_ID) {
            await initializeContract(web3Provider, accounts[0]);
          } else {
            setContractError(`Wrong network. Please switch to BSC Testnet (Chain ID: ${BSC_TESTNET_CHAIN_ID})`);
            setContract(null);
          }
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setContractError(null);

      if (!window.ethereum) {
        throw new Error('Please install MetaMask to connect your wallet.');
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const userAccount = accounts[0];
      setAccount(userAccount);
      setIsConnected(true);

      const network = await web3Provider.getNetwork();
      setNetworkId(Number(network.chainId));

      if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
        await switchToBSCTestnet();
        const updatedNetwork = await web3Provider.getNetwork();
        if (Number(updatedNetwork.chainId) !== BSC_TESTNET_CHAIN_ID) {
          throw new Error(`Failed to switch to BSC Testnet. Current chain ID: ${Number(updatedNetwork.chainId)}`);
        }
      }

      await initializeContract(web3Provider, userAccount);
      setLoading(false);

    } catch (error) {
      console.error('Error connecting wallet:', error);
      setLoading(false);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    setAccount(null);
    setUser(null);
    setContract(null);
    setSigner(null);
    setIsConnected(false);
    setContractError(null);
    console.log('✅ Wallet disconnected');
  };

  const switchToBSCTestnet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x61',
              chainName: 'BSC Testnet',
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
              blockExplorerUrls: ['https://testnet.bscscan.com'],
            }],
          });
        } catch (addError) {
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  };

  const initializeContract = async (web3Provider, userAccount) => {
    try {
      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI.abi,
        web3Signer
      );

      setContract(contractInstance);
      setContractError(null);

      if (userAccount) {
        await loadUserData(contractInstance, userAccount);
      }

      console.log('✅ Contract initialized successfully');
    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      setContractError('Failed to initialize contract. Please check your connection.');
      setContract(null);
      setSigner(null);
    }
  };

  const loadUserData = async (contractInstance, userAccount) => {
    try {
      const userData = await contractInstance.getUser(userAccount);

      if (userData.exists) {
        setUser({
          address: userAccount,
          username: userData.username,
          avatarHash: userData.avatarHash,
          bio: userData.bio,
          isCreator: userData.isCreator,
          followersCount: Number(userData.followersCount),
          followingCount: Number(userData.followingCount),
          totalEarnings: userData.totalEarnings
        });
        console.log('✅ User data loaded successfully');
      } else {
        setUser(null);
        console.log('ℹ️ User not registered');
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setUser(null);
    }
  };

  const registerUser = async (username, bio, avatarFile) => {
    if (!contract) {
      return { success: false, message: 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.' };
    }

    if (!username || username.trim() === '') {
      return { success: false, message: 'Username is required.' };
    }

    try {
      setLoading(true);

      let avatarHash = 'QmDefaultAvatar';
      if (avatarFile) {
        avatarHash = await uploadMedia(avatarFile);
      }

      const tx = await contract.registerUser(username.trim(), avatarHash, bio || '');
      await tx.wait();

      await loadUserData(contract, account);

      return { success: true, message: 'Registration successful!' };

    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed: ';

      if (error.message.includes('User already registered')) {
        errorMessage += 'This address is already registered.';
      } else if (error.message.includes('user rejected')) {
        errorMessage += 'Transaction was rejected by user.';
      } else {
        errorMessage += error.message;
      }

      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const becomeCreator = async () => {
    if (!contract) {
      return { success: false, message: 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.' };
    }

    if (!user) {
      return { success: false, message: 'Please register your account first before becoming a creator.' };
    }

    if (user.isCreator) {
      return { success: false, message: 'You are already a creator!' };
    }

    try {
      setLoading(true);

      const tx = await contract.becomeCreator();
      await tx.wait();

      await loadUserData(contract, account);

      return { success: true, message: 'Congratulations! You are now a creator!' };

    } catch (error) {
      console.error('❌ Become creator error:', error);

      let errorMessage = 'Failed to become creator: ';

      if (error.message.includes('user rejected')) {
        errorMessage += 'Transaction was rejected by user.';
      } else {
        errorMessage += error.message;
      }

      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (username, bio, avatarFile) => {
    if (!contract) {
      return { success: false, message: 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.' };
    }

    if (!user) {
      return { success: false, message: 'Please register your account first.' };
    }

    if (!username || username.trim() === '') {
      return { success: false, message: 'Username is required.' };
    }

    try {
      setLoading(true);

      let avatarHash = user.avatarHash || 'QmDefaultAvatar';
      if (avatarFile) {
        avatarHash = await uploadMedia(avatarFile);
      }

      const tx = await contract.updateProfile(username.trim(), avatarHash, bio || '');
      await tx.wait();

      await loadUserData(contract, account);

      return { success: true, message: 'Profile updated successfully!' };

    } catch (error) {
      console.error('❌ Update profile error:', error);

      let errorMessage = 'Failed to update profile: ';

      if (error.message.includes('user rejected')) {
        errorMessage += 'Transaction was rejected.';
      } else {
        errorMessage += error.message;
      }

      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Simple media upload to localStorage
  const uploadMedia = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const base64String = event.target.result;
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileId = `img_${timestamp}_${randomId}`;

          const mediaData = {
            id: fileId,
            base64: base64String,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            timestamp: timestamp,
            uploadDate: new Date().toISOString()
          };

          localStorage.setItem(fileId, JSON.stringify(mediaData));
          resolve(fileId);
        } catch (error) {
          reject(new Error('Failed to process file: ' + error.message));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  };

  // Retrieve media from localStorage
  const getMediaUrl = (fileId) => {
    if (!fileId || typeof fileId !== 'string') {
      return null;
    }

    // For demo/placeholder content, return null to show placeholder
    if (fileId.startsWith('QmTest') || fileId === 'default' || fileId === 'QmDefaultAvatar') {
      return null;
    }

    try {
      const storedData = localStorage.getItem(fileId);
      if (storedData) {
        const mediaData = JSON.parse(storedData);
        if (mediaData && mediaData.base64) {
          return mediaData.base64;
        }
      }
    } catch (error) {
      console.error('Error retrieving media:', error);
    }

    return null;
  };

  const value = {
    provider,
    signer,
    contract,
    account,
    user,
    loading,
    networkId,
    isConnected,
    isCorrectNetwork: networkId === BSC_TESTNET_CHAIN_ID,
    contractError,
    connectWallet,
    disconnectWallet,
    switchToBSCTestnet,
    registerUser,
    becomeCreator,
    updateProfile,
    loadUserData,
    uploadMedia,
    getMediaUrl
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Context;