import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CONTRACT_ABI from '../contracts/SocialPlatform.json';

const CONTRACT_ADDRESS = "0x575e0532445489dd31C12615BeC7C63d737B69DD";
const BSC_TESTNET_CHAIN_ID = 97;
const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';

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
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize Web3
  useEffect(() => {
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
    if (!provider) {
      console.error('Please install MetaMask!');
      throw new Error('Please install MetaMask!');
    }

    try {
      setLoading(true);
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      const userAccount = accounts[0];
      setAccount(userAccount);
      setIsConnected(true);
      
      const network = await provider.getNetwork();
      setNetworkId(Number(network.chainId));
      
      if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
        await switchToBSCTestnet();
        // Re-get network after switch
        const updatedNetwork = await provider.getNetwork();
        if (Number(updatedNetwork.chainId) !== BSC_TESTNET_CHAIN_ID) {
          throw new Error(`Failed to switch to BSC Testnet. Current chain ID: ${Number(updatedNetwork.chainId)}`);
        }
      }
      
      await initializeContract(provider, userAccount);
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setUser(null);
    setContract(null);
    setSigner(null);
    setIsConnected(false);
    setContractError(null);
    setIsInitializing(false);
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

  const loadUserData = async (contractInstance, userAccount) => {
    try {
      console.log('📋 Loading user data for:', userAccount);
      const userData = await callContractFunction(
        contractInstance.getUser.bind(contractInstance),
        'getUser',
        userAccount
      );
      
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
      const errorMessage = getContractErrorMessage(error);
      console.error('User-friendly error:', errorMessage);
      setUser(null);
      // Don't throw error here to avoid breaking the app
    }
  };

  const registerUser = async (username, bio, avatarFile) => {
    if (!contract) {
      const errorMsg = contractError || 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.';
      return { success: false, message: errorMsg };
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
      } else if (error.message.includes('Username cannot be empty')) {
        errorMessage += 'Username cannot be empty.';
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
    console.log('🚀 becomeCreator function called');
    
    // Debug state
    console.log('Debug State:', {
      contract: !!contract,
      contractAddress: contract?.target || contract?.address,
      account,
      user: user ? { 
        username: user.username, 
        isCreator: user.isCreator, 
        exists: user.exists 
      } : null,
      networkId,
      isCorrectNetwork: networkId === 97
    });

    if (!contract) {
      const errorMsg = contractError || 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.';
      console.error('❌ Contract not available:', errorMsg);
      return { success: false, message: errorMsg };
    }

    if (!account) {
      console.error('❌ Account not available');
      return { success: false, message: 'Please connect your wallet first.' };
    }

    if (!user) {
      console.error('❌ User not registered');
      return { success: false, message: 'Please register your account first before becoming a creator.' };
    }

    if (user.isCreator) {
      console.warn('⚠️ User is already a creator');
      return { success: false, message: 'You are already a creator!' };
    }

    try {
      setLoading(true);
      console.log('📝 Calling contract.becomeCreator()...');
      
      // Estimate gas first using the enhanced wrapper
      try {
        const gasEstimate = await callContractFunction(
          contract.becomeCreator.estimateGas.bind(contract),
          'becomeCreator gas estimation'
        );
        console.log('⛽ Estimated gas:', gasEstimate.toString());
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        const gasErrorMessage = getContractErrorMessage(gasError);
        console.error('Gas estimation error:', gasErrorMessage);
        
        // If gas estimation fails with specific errors, don't proceed
        if (gasError.message.includes('User not registered') || 
            gasError.message.includes('Already a creator') ||
            gasError.code === 'UNPREDICTABLE_GAS_LIMIT') {
          throw gasError;
        }
        // Continue anyway for other gas estimation errors
      }

      const tx = await callContractFunction(
        contract.becomeCreator.bind(contract),
        'becomeCreator'
      );
      console.log('📤 Transaction sent:', {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString()
      });
      
      console.log('⏳ Waiting for transaction confirmation...');
      
      // Enhanced transaction confirmation with timeout
      const confirmationTimeout = 60000; // 60 seconds
      const confirmationPromise = tx.wait();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), confirmationTimeout)
      );
      
      const receipt = await Promise.race([confirmationPromise, timeoutPromise]);
      
      console.log('✅ Transaction confirmed:', {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status,
        transactionHash: receipt.hash
      });

      if (receipt.status !== 1) {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }
      
      console.log('🔄 Reloading user data to reflect creator status...');
      
      // Retry user data loading with exponential backoff
      const maxReloadAttempts = 3;
      let reloadSuccess = false;
      
      for (let attempt = 1; attempt <= maxReloadAttempts; attempt++) {
        try {
          await loadUserData(contract, account);
          
          // Verify the user is now a creator
          const updatedUserData = await callContractFunction(
            contract.getUser.bind(contract),
            'getUser (verification)',
            account
          );
          
          if (updatedUserData.isCreator) {
            console.log('✅ User data successfully updated - now a creator!');
            reloadSuccess = true;
            break;
          } else {
            console.warn(`⚠️ User data reload attempt ${attempt}: still not showing as creator`);
            if (attempt < maxReloadAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Wait 2s, 4s, 6s
            }
          }
        } catch (reloadError) {
          console.error(`❌ User data reload attempt ${attempt} failed:`, reloadError.message);
          if (attempt === maxReloadAttempts) {
            throw new Error(`Failed to reload user data after ${maxReloadAttempts} attempts: ${reloadError.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (!reloadSuccess) {
        console.warn('⚠️ Transaction succeeded but user data may not reflect creator status immediately');
        return { 
          success: true, 
          message: 'Transaction successful! You are now a creator. Please refresh if the UI doesn\'t update immediately.',
          needsRefresh: true 
        };
      }
      
      console.log('🎉 Successfully became creator with full data update!');
      return { 
        success: true, 
        message: 'Congratulations! You are now a creator and can start earning money!',
        isCreatorNow: true
      };
      
    } catch (error) {
      console.error('❌ Become creator error:', error);
      console.error('Error details:', {
        code: error.code,
        reason: error.reason,
        message: error.message,
        data: error.data
      });
      
      let errorMessage = 'Failed to become creator: ';
      
      // Check for specific error codes and reasons
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += 'Transaction would fail. Please check if you are registered and not already a creator.';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient funds for gas fees.';
      } else if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage += 'Transaction was rejected by user.';
      } else if (error.reason) {
        // Handle contract revert reasons
        if (error.reason.includes('User not registered')) {
          errorMessage += 'You must register first before becoming a creator.';
        } else if (error.reason.includes('Already a creator')) {
          errorMessage += 'You are already a creator.';
        } else {
          errorMessage += error.reason;
        }
      } else if (error.message.includes('User not registered')) {
        errorMessage += 'You must register first before becoming a creator.';
      } else if (error.message.includes('Already a creator')) {
        errorMessage += 'You are already a creator.';
      } else if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMessage += 'Transaction was rejected by user.';
      } else {
        errorMessage += error.message;
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
      console.log('🔄 becomeCreator function completed');
    }
  };

  const updateProfile = async (username, bio, avatarFile) => {
    console.log('🔄 updateProfile function called');

    if (!contract) {
      const errorMsg = contractError || 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.';
      console.error('❌ Contract not available:', errorMsg);
      return { success: false, message: errorMsg };
    }

    if (!account) {
      console.error('❌ Account not available');
      return { success: false, message: 'Please connect your wallet first.' };
    }

    if (!user) {
      console.error('❌ User not registered');
      return { success: false, message: 'Please register your account first.' };
    }

    if (!username || username.trim() === '') {
      return { success: false, message: 'Username is required.' };
    }

    try {
      setLoading(true);
      console.log('📝 Updating profile...');
      
      let avatarHash = user.avatarHash || 'QmDefaultAvatar';
      if (avatarFile) {
        console.log('📁 Uploading new avatar...');
        avatarHash = await uploadMedia(avatarFile);
      }
      
      console.log('🔄 Calling contract.updateProfile()...');
      const tx = await contract.updateProfile(username.trim(), avatarHash, bio || '');
      console.log('⏳ Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Transaction confirmed');
      
      // Reload user data to get updated profile
      await loadUserData(contract, account);
      
      console.log('✅ Profile updated successfully');
      return { 
        success: true, 
        message: 'Profile updated successfully!',
        user: user
      };
      
    } catch (error) {
      console.error('❌ Update profile error:', error);
      
      let errorMessage = 'Failed to update profile: ';
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMessage += 'Transaction was rejected.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient BNB for gas fees. Please add more BNB to your wallet.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else {
        errorMessage += error.message;
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
      console.log('🔄 updateProfile function completed');
    }
  };

  // Working FileReader + localStorage upload system
  const uploadMedia = async (file) => {
    console.log('📤 uploadMedia called with file:', file);
    
    if (!file) {
      console.error('❌ uploadMedia: No file provided');
      throw new Error('No file provided');
    }

    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    });

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      console.error('❌ Invalid file type:', file.type);
      throw new Error('Only image and video files are supported');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes');
      throw new Error('File too large. Maximum size is 10MB.');
    }

    console.log('✅ File validation passed, converting to base64...');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const base64String = event.target.result;
          console.log('✅ FileReader conversion successful, base64 length:', base64String.length);
          
          // Generate unique file ID
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileId = `img_${timestamp}_${randomId}`;
          
          console.log('🆔 Generated fileId:', fileId);
          
          // Store in localStorage with metadata
          const mediaData = {
            id: fileId,
            base64: base64String,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            timestamp: timestamp,
            uploadDate: new Date().toISOString()
          };
          
          try {
            localStorage.setItem(fileId, JSON.stringify(mediaData));
            console.log('💾 Successfully stored in localStorage');
            
            // Verify storage
            const stored = localStorage.getItem(fileId);
            if (!stored) {
              throw new Error('Storage verification failed');
            }
            
            console.log('✅ Upload complete! FileId:', fileId);
            resolve(fileId);
            
          } catch (storageError) {
            console.error('❌ localStorage error:', storageError);
            if (storageError.name === 'QuotaExceededError') {
              reject(new Error('Storage quota exceeded. Please clear some space and try again.'));
            } else {
              reject(new Error('Failed to store image: ' + storageError.message));
            }
          }
          
        } catch (error) {
          console.error('❌ Upload processing error:', error);
          reject(new Error('Failed to process file: ' + error.message));
        }
      };

      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        reject(new Error('Failed to read file'));
      };

      console.log('🔄 Starting FileReader conversion...');
      reader.readAsDataURL(file);
    });
  };

  // Function to compress images for more efficient storage
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          const newWidth = Math.max(1, Math.floor(img.width * ratio));
          const newHeight = Math.max(1, Math.floor(img.height * ratio));
          
          console.log(`🖼️ Compressing image from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
          
          // Set canvas dimensions
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          canvas.toBlob((blob) => {
            if (blob) {
              console.log(`✅ Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB`);
              resolve(blob);
            } else {
              console.error('❌ Canvas.toBlob returned null');
              // Fallback: return original file if compression fails
              resolve(file);
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          console.error('❌ Error during image compression:', error);
          // Fallback: return original file if compression fails
          resolve(file);
        }
      };
      
      img.onerror = (error) => {
        console.error('❌ Error loading image for compression:', error);
        // Fallback: return original file if image loading fails
        resolve(file);
      };
      
      try {
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('❌ Error creating object URL:', error);
        resolve(file);
      }
    });
  };

  // Function to clean up old images from localStorage
  const cleanupOldImages = () => {
    try {
      const keys = Object.keys(localStorage);
      const ipfsKeys = keys.filter(key => key.startsWith('ipfs_'));
      
      console.log(`🧹 Starting cleanup of ${ipfsKeys.length} stored files...`);
      
      // Get file info with timestamps for sorting
      const fileInfo = ipfsKeys.map(key => {
        try {
          const data = localStorage.getItem(key);
          let uploadTime = 0;
          let size = data?.length || 0;
          
          // Try to parse metadata for upload time
          try {
            const metadata = JSON.parse(data);
            uploadTime = metadata.uploadTime || 0;
            size = metadata.data?.length || size;
          } catch {
            // Extract timestamp from hash if metadata parsing fails
            uploadTime = parseInt(key.replace('ipfs_Qm', '').substring(0, 13)) || 0;
          }
          
          return { key, uploadTime, size };
        } catch {
          return { key, uploadTime: 0, size: 0 };
        }
      });
      
      // Sort by upload time (oldest first)
      const sortedFiles = fileInfo.sort((a, b) => a.uploadTime - b.uploadTime);
      
      // Remove the oldest 30% of files
      const toRemove = Math.max(1, Math.floor(sortedFiles.length * 0.3));
      let totalSizeRemoved = 0;
      
      for (let i = 0; i < toRemove; i++) {
        const file = sortedFiles[i];
        localStorage.removeItem(file.key);
        totalSizeRemoved += file.size;
        console.log('🧹 Cleaned up old file:', file.key, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      }
      
      console.log(`🧹 Cleanup complete: Removed ${toRemove} files, freed ${(totalSizeRemoved / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  // Working localStorage media retrieval system
  const getMediaUrl = (fileId) => {
    console.log('🔍 getMediaUrl called with fileId:', fileId);
    
    if (!fileId || typeof fileId !== 'string') {
      console.log('⚠️ getMediaUrl: Invalid fileId');
      return null;
    }

    // For demo/placeholder content, return null to show placeholder
    if (fileId.startsWith('QmTest') || fileId === 'default' || fileId === 'QmDefaultAvatar') {
      console.log('🎭 getMediaUrl: Detected placeholder/demo fileId, returning null');
      return null;
    }

    console.log('📂 getMediaUrl: Checking localStorage for fileId:', fileId);
    
    try {
      // Check localStorage for the file
      const storedData = localStorage.getItem(fileId);
      if (storedData) {
        const mediaData = JSON.parse(storedData);
        if (mediaData && mediaData.base64) {
          console.log('✅ getMediaUrl: Found media in localStorage');
          console.log('📊 Media info:', {
            fileName: mediaData.fileName,
            fileType: mediaData.fileType,
            fileSize: `${(mediaData.fileSize / 1024).toFixed(1)}KB`,
            uploadDate: mediaData.uploadDate
          });
          return mediaData.base64;
        } else {
          console.log('❌ getMediaUrl: Invalid media data structure');
        }
      } else {
        console.log('❌ getMediaUrl: No data found in localStorage for fileId:', fileId);
      }
    } catch (error) {
      console.error('❌ getMediaUrl: Error parsing stored data:', error);
    }
    
    // Log available media files for debugging
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith('img_'));
    console.log('🔍 Available media files in localStorage:', allKeys);
    
    console.log('❌ getMediaUrl: No media found for fileId:', fileId);
    return null;
  };

  // Debug function to test contract connection
  // New contract initialization function with proper error handling
  const initializeContract = async (web3Provider, userAccount, retries = 3) => {
    setIsInitializing(true);
    setContractError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Initializing contract (attempt ${attempt}/${retries})...`);
        
        // Validate provider
        if (!web3Provider) {
          throw new Error('Provider not available');
        }
        
        // Get signer
        const web3Signer = await web3Provider.getSigner();
        if (!web3Signer) {
          throw new Error('Signer not available');
        }
        
        // Validate contract address
        if (!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) {
          throw new Error('Invalid contract address');
        }
        
        // Validate ABI
        if (!CONTRACT_ABI || !CONTRACT_ABI.abi || !Array.isArray(CONTRACT_ABI.abi)) {
          throw new Error('Invalid contract ABI');
        }
        
        // Create contract instance with enhanced configuration
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI.abi,
          web3Signer
        );
        
        // Validate contract deployment by calling a simple read function with retry logic
        console.log('🔍 Validating contract deployment...');
        let contentCounter;
        let validationAttempts = 0;
        const maxValidationAttempts = 3;
        
        while (validationAttempts < maxValidationAttempts) {
          try {
            // Add timeout to contract calls
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Contract call timeout')), 10000)
            );
            
            contentCounter = await Promise.race([
              contractInstance.contentCounter(),
              timeoutPromise
            ]);
            
            console.log('✅ Contract is deployed and responsive. Content counter:', contentCounter.toString());
            break;
            
          } catch (validationError) {
            validationAttempts++;
            console.warn(`⚠️ Contract validation attempt ${validationAttempts} failed:`, validationError.message);
            
            if (validationAttempts >= maxValidationAttempts) {
              // If all validation attempts fail, try with a fallback provider
              console.log('🔄 Trying with fallback RPC provider...');
              
              try {
                const fallbackProvider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
                const fallbackContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, fallbackProvider);
                const fallbackCounter = await fallbackContract.contentCounter();
                console.log('✅ Fallback validation successful. Content counter:', fallbackCounter.toString());
                
                // Contract exists, the issue might be with the user's provider
                console.log('⚠️ Contract exists but user provider may have issues. Proceeding with initialization...');
                break;
                
              } catch (fallbackError) {
                throw new Error(`Contract validation failed: ${validationError.message}. Fallback also failed: ${fallbackError.message}`);
              }
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // Set contract and signer
        setSigner(web3Signer);
        setContract(contractInstance);
        setContractError(null);
        
        // Load user data if account is available
        if (userAccount) {
          try {
            await loadUserData(contractInstance, userAccount);
          } catch (loadError) {
            console.warn('⚠️ Failed to load user data during initialization:', loadError.message);
            // Don't fail initialization if user data loading fails
          }
        }
        
        console.log('✅ Contract initialized successfully');
        setIsInitializing(false);
        return { success: true, message: 'Contract initialized successfully' };
        
      } catch (error) {
        console.error(`❌ Contract initialization attempt ${attempt} failed:`, error);
        
        const errorMessage = getContractErrorMessage(error);
        setContractError(errorMessage);
        
        if (attempt === retries) {
          setContract(null);
          setSigner(null);
          setIsInitializing(false);
          return { success: false, message: errorMessage };
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };
  
  // Helper function to get user-friendly error messages
  const getContractErrorMessage = (error) => {
    if (error.message.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    } else if (error.message.includes('Invalid contract address')) {
      return 'Contract address is invalid. Please check the configuration.';
    } else if (error.message.includes('Invalid contract ABI')) {
      return 'Contract ABI is invalid. Please check the contract files.';
    } else if (error.message.includes('call revert exception') || error.message.includes('execution reverted')) {
      return 'Contract is not deployed or not responding on BSC Testnet.';
    } else if (error.message.includes('missing revert data') || error.code === 'BAD_DATA') {
      return 'Contract call failed - this may be due to network issues or provider configuration. Please try refreshing the page or switching MetaMask networks.';
    } else if (error.message.includes('could not decode result data')) {
      return 'Contract response could not be decoded - this may indicate a network or provider issue. Please try again.';
    } else if (error.message.includes('Contract call timeout')) {
      return 'Contract call timed out. Please check your connection to BSC Testnet.';
    } else if (error.message.includes('insufficient funds')) {
      return 'Insufficient BNB for gas fees. Please add more BNB to your wallet.';
    } else if (error.message.includes('user rejected') || error.code === 'ACTION_REJECTED' || error.code === 4001) {
      return 'Transaction was rejected by user.';
    } else if (error.message.includes('Provider not available')) {
      return 'Wallet provider not available. Please install and connect MetaMask.';
    } else {
      return `Contract initialization failed: ${error.message}`;
    }
  };
  
  // Enhanced contract function call wrapper with retry logic
  const callContractFunction = async (contractFunction, functionName, ...args) => {
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📞 Calling ${functionName} (attempt ${attempt}/${maxRetries})...`);
        
        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contract call timeout')), 15000)
        );
        
        const result = await Promise.race([
          contractFunction(...args),
          timeoutPromise
        ]);
        
        console.log(`✅ ${functionName} successful`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ ${functionName} attempt ${attempt} failed:`, error.message);
        
        // Don't retry certain errors
        if (error.code === 'ACTION_REJECTED' || error.code === 4001 || 
            error.message.includes('user rejected')) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying ${functionName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };
  
  const testContractConnection = async () => {
    console.log('🔧 Testing contract connection...');
    
    if (!contract) {
      const errorMsg = contractError || 'Contract not available. Please connect your wallet and ensure you\'re on BSC Testnet.';
      console.error('❌ Contract not available:', errorMsg);
      return { success: false, message: errorMsg };
    }

    try {
      // Test basic contract read function with enhanced error handling
      const contentCounter = await callContractFunction(
        contract.contentCounter.bind(contract),
        'contentCounter'
      );
      console.log('📊 Content counter:', contentCounter.toString());
      
      // Test user data if available
      if (account) {
        const userData = await callContractFunction(
          contract.getUser.bind(contract),
          'getUser',
          account
        );
        console.log('👤 User data:', {
          username: userData.username,
          isCreator: userData.isCreator,
          exists: userData.exists
        });
      }
      
      return { success: true, message: 'Contract connection working perfectly' };
    } catch (error) {
      console.error('❌ Contract connection test failed:', error);
      const errorMessage = getContractErrorMessage(error);
      setContractError(errorMessage);
      return { success: false, message: errorMessage };
    }
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
    isInitializing,
    initializeContract,
    connectWallet,
    disconnectWallet,
    switchToBSCTestnet,
    registerUser,
    becomeCreator,
    updateProfile,
    loadUserData,
    uploadMedia,
    getMediaUrl,
    // Debug function to list stored images
    debugStoredImages: () => {
      console.log('📋 === STORED IMAGES DEBUG ===');
      
      // Check localStorage for image files
      const imageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('img_') || key.startsWith('ipfs_') || key.includes('media_')
      );
      console.log(`📄 LocalStorage image keys (${imageKeys.length}):`, imageKeys);
      
      let totalSize = 0;
      imageKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            totalSize += data.length;
            const mediaData = JSON.parse(data);
            console.log(`🔍 ${key}:`, {
              fileName: mediaData.fileName || mediaData.originalName || 'Unknown',
              fileType: mediaData.fileType || mediaData.type || 'Unknown',
              fileSize: `${((mediaData.fileSize || mediaData.size || 0) / 1024).toFixed(1)}KB`,
              uploadDate: mediaData.uploadDate || 'Unknown',
              hasBase64: !!(mediaData.base64 || mediaData.dataUrl),
              base64Length: (mediaData.base64 || mediaData.dataUrl || '').length
            });
          }
        } catch (error) {
          console.error(`❌ Error parsing ${key}:`, error);
        }
      });
      
      console.log(`💾 Total image storage: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log('📋 === END DEBUG ===');
    },
    
    // Test function to create and upload a test image
    testImageUpload: async () => {
      console.log('🧠 Creating test image...');
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      // Draw test pattern
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(0, 0, 300, 200);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST IMAGE', 150, 80);
      ctx.font = '16px Arial';
      ctx.fillText(new Date().toLocaleString(), 150, 120);
      
      const testBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      const testFile = new File([testBlob], `test-image-${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      });
      
      console.log('📤 Uploading test image...', {
        name: testFile.name,
        size: `${(testFile.size / 1024).toFixed(1)}KB`
      });
      
      try {
        const fileId = await uploadMedia(testFile);
        const url = getMediaUrl(fileId);
        
        console.log('✅ Test upload completed:', {
          fileId,
          hasUrl: !!url,
          urlLength: url?.length
        });
        
        return { success: true, fileId, url };
      } catch (error) {
        console.error('❌ Test upload failed:', error);
        return { success: false, error: error.message };
      }
    },
    testContractConnection
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Context;