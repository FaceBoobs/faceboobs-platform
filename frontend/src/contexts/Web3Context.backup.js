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

  // Enhanced FileReader + localStorage upload system with comprehensive logging
  const uploadMedia = async (file) => {
    console.log('🚀 =========================');
    console.log('🚀 UPLOAD MEDIA STARTED');
    console.log('🚀 =========================');
    console.log('📤 uploadMedia called with file:', file);
    console.log('📤 Function call timestamp:', new Date().toISOString());
    console.log('📤 Function call stack:', new Error().stack.split('\n').slice(1, 4));

    // Step 1: File validation
    console.log('\n🔍 STEP 1: File Validation');
    console.log('----------------------------');

    if (!file) {
      console.error('❌ uploadMedia: No file provided');
      console.error('❌ UPLOAD FAILED AT: File validation - no file');
      throw new Error('No file provided');
    }
    console.log('✅ File object exists');

    console.log('📁 File details analysis:');
    console.log('  📋 Name:', file.name);
    console.log('  📋 Type:', file.type);
    console.log('  📋 Size (bytes):', file.size);
    console.log('  📋 Size (MB):', (file.size / 1024 / 1024).toFixed(2));
    console.log('  📋 Last modified:', file.lastModified ? new Date(file.lastModified).toISOString() : 'Unknown');
    console.log('  📋 File constructor:', file.constructor.name);

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    console.log('📋 Type validation:');
    console.log('  📋 Is image:', isImage);
    console.log('  📋 Is video:', isVideo);

    if (!isImage && !isVideo) {
      console.error('❌ Invalid file type:', file.type);
      console.error('❌ UPLOAD FAILED AT: File type validation');
      throw new Error('Only image and video files are supported');
    }
    console.log('✅ File type validation passed');

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    console.log('📋 Size validation:');
    console.log('  📋 File size:', file.size, 'bytes');
    console.log('  📋 Max allowed:', maxSize, 'bytes');
    console.log('  📋 Size ratio:', (file.size / maxSize * 100).toFixed(1) + '%');

    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes');
      console.error('❌ UPLOAD FAILED AT: File size validation');
      throw new Error('File too large. Maximum size is 10MB.');
    }
    console.log('✅ File size validation passed');

    console.log('✅ All file validations passed, proceeding to compression...');

    // Step 2: Image Compression (if applicable)
    console.log('\n🗜️ STEP 2: Image Compression');
    console.log('-------------------------------');

    let processedFile = file;

    if (isImage && file.size > 500 * 1024) { // Compress images larger than 500KB
      console.log('📋 Image compression needed:');
      console.log('  📋 Original size:', (file.size / 1024).toFixed(1), 'KB');
      console.log('  📋 Compression threshold: 500KB');

      try {
        console.log('🔄 Starting image compression...');
        processedFile = await compressImage(file, 1200, 0.8);

        const compressionRatio = ((file.size - processedFile.size) / file.size * 100).toFixed(1);
        console.log('✅ Image compression completed:');
        console.log(`  📋 ${file.size} bytes → ${processedFile.size} bytes`);
        console.log(`  📋 ${(file.size / 1024).toFixed(1)}KB → ${(processedFile.size / 1024).toFixed(1)}KB`);
        console.log(`  📋 Compression ratio: ${compressionRatio}%`);

      } catch (compressionError) {
        console.warn('⚠️ Image compression failed, using original file');
        console.warn('⚠️ Compression error:', compressionError.message);
        processedFile = file; // Fallback to original file
      }
    } else if (isImage) {
      console.log('📋 Image compression skipped (file < 500KB)');
    } else {
      console.log('📋 Compression skipped (not an image)');
    }

    // Step 3: Storage Space Check & Cleanup
    console.log('\n💾 STEP 3: Storage Space Management');
    console.log('------------------------------------');

    try {
      // Estimate storage usage
      const allKeys = Object.keys(localStorage);
      const imageKeys = allKeys.filter(key => key.startsWith('img_'));
      let totalStorageUsed = 0;

      for (const key of imageKeys) {
        const item = localStorage.getItem(key);
        totalStorageUsed += item ? item.length : 0;
      }

      const storageMB = (totalStorageUsed / 1024 / 1024).toFixed(2);
      const newFileMB = (processedFile.size * 1.37 / 1024 / 1024).toFixed(2); // Base64 increases size ~37%

      console.log('📊 Storage analysis:');
      console.log('  📋 Current images stored:', imageKeys.length);
      console.log('  📋 Current storage used:', storageMB, 'MB');
      console.log('  📋 New file will add ~', newFileMB, 'MB');
      console.log('  📋 Total after upload ~', (parseFloat(storageMB) + parseFloat(newFileMB)).toFixed(2), 'MB');

      // Trigger cleanup if storage is getting full (>4MB or >20 images)
      const shouldCleanup = totalStorageUsed > 4 * 1024 * 1024 || imageKeys.length > 20;

      if (shouldCleanup) {
        console.log('🧹 Triggering preventive cleanup...');
        const cleanupResult = cleanupOldImages(0.3, false);
        console.log(`✅ Cleanup completed: ${cleanupResult.cleaned} files removed`);
      } else {
        console.log('✅ Storage space sufficient, no cleanup needed');
      }

    } catch (storageError) {
      console.warn('⚠️ Storage analysis failed:', storageError.message);
    }

    // Step 4: FileReader conversion
    console.log('\n🔄 STEP 4: FileReader Conversion');
    console.log('----------------------------------');

    return new Promise((resolve, reject) => {
      console.log('📋 Creating FileReader instance...');
      const reader = new FileReader();
      console.log('✅ FileReader created');

      // Set up event handlers with detailed logging
      reader.onloadstart = (event) => {
        console.log('🔄 FileReader onloadstart triggered');
        console.log('  📋 Event type:', event.type);
        console.log('  📋 Total bytes to read:', event.total || 'Unknown');
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          console.log('🔄 FileReader progress:', percentComplete.toFixed(1) + '%');
          console.log('  📋 Loaded:', event.loaded, 'bytes');
          console.log('  📋 Total:', event.total, 'bytes');
        }
      };

      reader.onload = (event) => {
        console.log('\n✅ STEP 3: FileReader Conversion Complete');
        console.log('------------------------------------------');
        console.log('✅ FileReader onload triggered');
        console.log('📋 Event details:');
        console.log('  📋 Event type:', event.type);
        console.log('  📋 Result type:', typeof event.target.result);

        try {
          const base64String = event.target.result;
          console.log('📋 Base64 conversion results:');
          console.log('  📋 Base64 length:', base64String.length);
          console.log('  📋 Base64 size (KB):', (base64String.length / 1024).toFixed(2));
          console.log('  📋 Base64 prefix:', base64String.substring(0, 50) + '...');
          console.log('  📋 Contains data URL prefix:', base64String.startsWith('data:'));

          // Step 4: Generate file ID
          console.log('\n🆔 STEP 4: File ID Generation');
          console.log('------------------------------');
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileId = `img_${timestamp}_${randomId}`;

          console.log('📋 ID generation details:');
          console.log('  📋 Timestamp:', timestamp);
          console.log('  📋 Random ID:', randomId);
          console.log('  📋 Final fileId:', fileId);
          console.log('  📋 FileId length:', fileId.length);
          console.log('✅ FileId generated successfully');

          // Step 5: Create media data structure
          console.log('\n📦 STEP 5: Media Data Structure Creation');
          console.log('----------------------------------------');
          const mediaData = {
            id: fileId,
            base64: base64String,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            timestamp: timestamp,
            uploadDate: new Date().toISOString()
          };

          console.log('📋 Media data structure:');
          console.log('  📋 ID:', mediaData.id);
          console.log('  📋 Has base64:', !!mediaData.base64);
          console.log('  📋 Base64 length:', mediaData.base64.length);
          console.log('  📋 File name:', mediaData.fileName);
          console.log('  📋 File type:', mediaData.fileType);
          console.log('  📋 File size:', mediaData.fileSize);
          console.log('  📋 Timestamp:', mediaData.timestamp);
          console.log('  📋 Upload date:', mediaData.uploadDate);
          console.log('✅ Media data structure created');

          // Step 6: localStorage operations
          console.log('\n💾 STEP 6: LocalStorage Operations');
          console.log('-----------------------------------');

          try {
            // Pre-storage checks
            console.log('📋 Pre-storage localStorage analysis:');
            const preStorageKeys = Object.keys(localStorage);
            const preImageKeys = preStorageKeys.filter(key => key.startsWith('img_'));
            console.log('  📋 Total keys before storage:', preStorageKeys.length);
            console.log('  📋 Image keys before storage:', preImageKeys.length);
            console.log('  📋 Available storage estimate:', (localStorage.length * 1024) + ' bytes used');

            // Serialize data
            console.log('🔄 Serializing media data...');
            const serializedData = JSON.stringify(mediaData);
            console.log('📋 Serialization results:');
            console.log('  📋 Serialized length:', serializedData.length);
            console.log('  📋 Serialized size (KB):', (serializedData.length / 1024).toFixed(2));
            console.log('  📋 Serialized preview:', serializedData.substring(0, 100) + '...');
            console.log('✅ Data serialization successful');

            // Attempt storage with quota exceeded handling
            console.log('🔄 Attempting localStorage.setItem...');
            console.log('  📋 Key to store:', fileId);
            console.log('  📋 Data size:', serializedData.length, 'characters');

            const storageStartTime = Date.now();
            try {
              localStorage.setItem(fileId, serializedData);
              const storageEndTime = Date.now();
              console.log('✅ localStorage.setItem completed');
              console.log('  📋 Storage operation took:', (storageEndTime - storageStartTime), 'ms');
            } catch (quotaError) {
              if (quotaError.name === 'QuotaExceededError') {
                console.warn('⚠️ Storage quota exceeded, attempting aggressive cleanup...');

                // Perform aggressive cleanup (remove 60% of oldest files)
                const cleanupResult = cleanupOldImages(0.6, true);
                console.log(`🗑️ Aggressive cleanup completed: ${cleanupResult.cleaned} files removed, ${(cleanupResult.spaceFreed / 1024).toFixed(1)}KB freed`);

                // Try storage again after cleanup
                try {
                  localStorage.setItem(fileId, serializedData);
                  const storageEndTime = Date.now();
                  console.log('✅ localStorage.setItem completed after cleanup');
                  console.log('  📋 Storage operation took:', (storageEndTime - storageStartTime), 'ms');
                } catch (secondError) {
                  console.error('❌ Storage still failed after cleanup');
                  throw new Error('Storage quota exceeded even after cleanup. Image may be too large.');
                }
              } else {
                throw quotaError;
              }
            }

            // Post-storage verification
            console.log('🔍 Post-storage verification...');
            const postStorageKeys = Object.keys(localStorage);
            const postImageKeys = postStorageKeys.filter(key => key.startsWith('img_'));
            console.log('📋 Post-storage localStorage analysis:');
            console.log('  📋 Total keys after storage:', postStorageKeys.length);
            console.log('  📋 Image keys after storage:', postImageKeys.length);
            console.log('  📋 New keys added:', postStorageKeys.length - preStorageKeys.length);

            // Verify specific key
            const storedData = localStorage.getItem(fileId);
            console.log('📋 Specific key verification:');
            console.log('  📋 Key exists:', !!storedData);
            console.log('  📋 Stored data length:', storedData?.length || 0);
            console.log('  📋 Data matches:', storedData === serializedData);

            if (!storedData) {
              console.error('❌ STORAGE VERIFICATION FAILED: No data found for key');
              throw new Error('Storage verification failed');
            }

            // Parse verification
            console.log('🔍 Parse verification...');
            try {
              const parsedData = JSON.parse(storedData);
              console.log('📋 Parse verification results:');
              console.log('  📋 Parse successful:', true);
              console.log('  📋 Has required fields:', !!(parsedData.id && parsedData.base64));
              console.log('  📋 ID matches:', parsedData.id === fileId);
              console.log('  📋 Base64 length matches:', parsedData.base64.length === base64String.length);
              console.log('✅ Parse verification successful');
            } catch (parseError) {
              console.error('❌ PARSE VERIFICATION FAILED:', parseError);
              throw new Error('Stored data is corrupted');
            }

            console.log('✅ All storage operations successful');

          } catch (storageError) {
            console.error('\n❌ =========================');
            console.error('❌ STORAGE ERROR OCCURRED');
            console.error('❌ =========================');
            console.error('❌ Error type:', storageError.name);
            console.error('❌ Error message:', storageError.message);
            console.error('❌ Error stack:', storageError.stack);
            console.error('❌ UPLOAD FAILED AT: localStorage operations');

            if (storageError.name === 'QuotaExceededError') {
              console.error('❌ Storage quota exceeded - need to clear space');
              reject(new Error('Storage quota exceeded. Please clear some space and try again.'));
            } else {
              console.error('❌ Generic storage error occurred');
              reject(new Error('Failed to store image: ' + storageError.message));
            }
            return;
          }

          // Step 7: Final success
          console.log('\n🎉 =========================');
          console.log('🎉 UPLOAD COMPLETED SUCCESSFULLY');
          console.log('🎉 =========================');
          console.log('✅ Final fileId:', fileId);
          console.log('✅ Total process time:', Date.now() - timestamp, 'ms');
          console.log('✅ Resolving with fileId:', fileId);

          resolve(fileId);

        } catch (error) {
          console.error('\n❌ =========================');
          console.error('❌ PROCESSING ERROR OCCURRED');
          console.error('❌ =========================');
          console.error('❌ Error during upload processing:', error);
          console.error('❌ Error type:', error.name);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error stack:', error.stack);
          console.error('❌ UPLOAD FAILED AT: File processing');
          reject(new Error('Failed to process file: ' + error.message));
        }
      };

      reader.onerror = (error) => {
        console.error('\n❌ =========================');
        console.error('❌ FILEREADER ERROR OCCURRED');
        console.error('❌ =========================');
        console.error('❌ FileReader error:', error);
        console.error('❌ Error type:', error.type);
        console.error('❌ Target error:', error.target?.error);
        console.error('❌ UPLOAD FAILED AT: FileReader operation');
        reject(new Error('Failed to read file'));
      };

      reader.onabort = (event) => {
        console.error('❌ FileReader operation aborted:', event);
        console.error('❌ UPLOAD FAILED AT: FileReader aborted');
        reject(new Error('File reading was aborted'));
      };

      console.log('🔄 Starting FileReader.readAsDataURL...');
      console.log('📋 About to read file with name:', processedFile.name || file.name);
      reader.readAsDataURL(processedFile);
      console.log('🔄 FileReader.readAsDataURL called successfully');
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
  const cleanupOldImages = (targetPercentage = 0.3, forceCleanup = false) => {
    try {
      const keys = Object.keys(localStorage);
      const imageKeys = keys.filter(key => key.startsWith('img_'));

      if (imageKeys.length === 0) {
        console.log('🧹 No images to cleanup');
        return { cleaned: 0, spaceFreed: 0 };
      }

      console.log(`🧹 Starting cleanup of ${imageKeys.length} stored images...`);

      // Get file info with timestamps for sorting
      const fileInfo = imageKeys.map(key => {
        try {
          const data = localStorage.getItem(key);
          let uploadTime = 0;
          let size = data?.length || 0;

          // Try to parse metadata for upload time
          try {
            const metadata = JSON.parse(data);
            uploadTime = metadata.timestamp || metadata.uploadTime || 0;
            size = data.length; // Use actual storage size
          } catch {
            // Extract timestamp from img_timestamp_id format
            const parts = key.split('_');
            uploadTime = parseInt(parts[1]) || 0;
          }

          return { key, uploadTime, size };
        } catch {
          return { key, uploadTime: 0, size: 0 };
        }
      });

      // Sort by upload time (oldest first)
      const sortedFiles = fileInfo.sort((a, b) => a.uploadTime - b.uploadTime);

      // Determine how many files to remove
      const toRemove = forceCleanup
        ? Math.max(5, Math.floor(sortedFiles.length * 0.5)) // Aggressive cleanup if forced
        : Math.max(1, Math.floor(sortedFiles.length * targetPercentage));

      let totalSizeRemoved = 0;
      let cleanedCount = 0;

      for (let i = 0; i < Math.min(toRemove, sortedFiles.length); i++) {
        const file = sortedFiles[i];
        try {
          localStorage.removeItem(file.key);
          totalSizeRemoved += file.size;
          cleanedCount++;
          console.log(`🧹 Cleaned up old image: ${file.key} (${(file.size / 1024).toFixed(1)} KB)`);
        } catch (error) {
          console.error(`❌ Failed to remove ${file.key}:`, error);
        }
      }

      const mbFreed = (totalSizeRemoved / 1024 / 1024).toFixed(2);
      console.log(`✅ Cleanup complete: Removed ${cleanedCount} images, freed ${mbFreed} MB`);

      return { cleaned: cleanedCount, spaceFreed: totalSizeRemoved };
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return { cleaned: 0, spaceFreed: 0 };
    }
  };

  // Enhanced localStorage media retrieval system with comprehensive debugging
  const getMediaUrl = (fileId) => {
    console.log('🔍 =========================');
    console.log('🔍 GETMEDIAURL CALLED');
    console.log('🔍 =========================');
    console.log('🔍 Input fileId:', fileId);
    console.log('🔍 FileId type:', typeof fileId, 'length:', fileId?.length);

    if (!fileId || typeof fileId !== 'string') {
      console.log('⚠️ getMediaUrl: Invalid fileId - null, undefined, or not string');
      return null;
    }

    // Get all localStorage keys for analysis
    const allKeys = Object.keys(localStorage);
    const imageKeys = allKeys.filter(key => key.startsWith('img_'));
    console.log('📂 LocalStorage Analysis:');
    console.log('  📂 Total localStorage keys:', allKeys.length);
    console.log('  📂 Image keys found:', imageKeys.length);
    console.log('  📂 Available image keys:', imageKeys.slice(0, 5)); // Show first 5 for debugging

    // For demo/placeholder content, return null to show placeholder
    if (fileId.startsWith('QmTest') || fileId === 'default' || fileId === 'QmDefaultAvatar') {
      console.log('🎭 getMediaUrl: Detected placeholder/demo fileId, returning null');
      return null;
    }

    // Check exact match first
    const exactMatch = imageKeys.includes(fileId);
    console.log('🎯 Exact fileId match found:', exactMatch);

    // Process based on whether we found an exact match or not
    if (exactMatch) {
      console.log('✅ EXACT MATCH FOUND - proceeding with direct lookup');

      try {
        const storedData = localStorage.getItem(fileId);
        console.log('📦 Direct localStorage lookup result:', !!storedData);

        if (storedData) {
          console.log('📦 Stored data length:', storedData.length);
          try {
            const mediaData = JSON.parse(storedData);
            console.log('📊 Parsed media data structure:', {
              hasId: !!mediaData.id,
              hasBase64: !!mediaData.base64,
              hasFileName: !!mediaData.fileName,
              hasFileType: !!mediaData.fileType,
              hasFileSize: !!mediaData.fileSize,
              hasTimestamp: !!mediaData.timestamp,
              base64Length: mediaData.base64?.length || 0,
              base64Preview: mediaData.base64?.substring(0, 30) + '...'
            });

            // Enhanced validation for exact match base64 data
            if (mediaData &&
                mediaData.base64 &&
                typeof mediaData.base64 === 'string' &&
                mediaData.base64.length > 0 &&
                mediaData.base64.startsWith('data:')) {

              console.log('✅ SUCCESS: Found valid media in localStorage');
              console.log('📊 Media info:', {
                fileName: mediaData.fileName,
                fileType: mediaData.fileType,
                fileSize: `${(mediaData.fileSize / 1024).toFixed(1)}KB`,
                uploadDate: mediaData.uploadDate,
                base64Size: `${(mediaData.base64.length / 1024).toFixed(1)}KB`,
                validDataUrl: mediaData.base64.startsWith('data:')
              });
              return mediaData.base64;
            } else {
              console.log('❌ Invalid media data structure:', {
                hasMediaData: !!mediaData,
                hasBase64: !!mediaData?.base64,
                base64Type: typeof mediaData?.base64,
                base64Length: mediaData?.base64?.length || 0,
                startsWithData: mediaData?.base64?.startsWith?.('data:'),
                mediaDataKeys: Object.keys(mediaData || {})
              });
            }
          } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.log('❌ Raw stored data preview:', storedData.substring(0, 100) + '...');
          }
        }
      } catch (storageError) {
        console.error('❌ localStorage access error:', storageError);
      }
    } else {
      console.log('❌ NO EXACT MATCH - fileId not in localStorage keys');
      console.log('🔍 FileId being searched for:', fileId);
      console.log('🔍 Available keys sample:', imageKeys.slice(0, 3));

      // Check if fileId looks like our format
      if (fileId.startsWith('img_')) {
        console.log('🤔 FileId has correct format but not found - possible storage issue');

        // Check for partial matches (debugging)
        const partialMatches = imageKeys.filter(key =>
          key.includes(fileId.split('_')[1]) || fileId.includes(key.split('_')[1])
        );
        if (partialMatches.length > 0) {
          console.log('🔍 Partial matches found:', partialMatches);
        }

      } else {
        console.log('🤔 FileId has unexpected format - might be IPFS hash or other');
        console.log('🔍 FileId format analysis:', {
          startsWithQm: fileId.startsWith('Qm'),
          startsWithImg: fileId.startsWith('img_'),
          length: fileId.length,
          sample: fileId.substring(0, 20)
        });

        // If we have images and this doesn't look like our format, use most recent
        if (imageKeys.length > 0) {
          console.log('🔄 Attempting fallback to most recent image...');
          const sortedKeys = imageKeys.sort((a, b) => {
            const aTime = parseInt(a.split('_')[1]) || 0;
            const bTime = parseInt(b.split('_')[1]) || 0;
            return bTime - aTime; // Most recent first
          });
          const fallbackKey = sortedKeys[0];
          console.log('🔄 Using fallback key:', fallbackKey);

          try {
            const fallbackData = localStorage.getItem(fallbackKey);
            if (fallbackData) {
              const fallbackMediaData = JSON.parse(fallbackData);

              // Enhanced validation for base64 data
              if (fallbackMediaData &&
                  fallbackMediaData.base64 &&
                  typeof fallbackMediaData.base64 === 'string' &&
                  fallbackMediaData.base64.length > 0 &&
                  fallbackMediaData.base64.startsWith('data:')) {

                console.log('✅ FALLBACK SUCCESS - returning valid base64 data');
                console.log('📊 Fallback image info:', {
                  originalFileId: fileId,
                  fallbackKey: fallbackKey,
                  fileName: fallbackMediaData.fileName,
                  base64Length: fallbackMediaData.base64.length,
                  validDataUrl: fallbackMediaData.base64.startsWith('data:')
                });
                return fallbackMediaData.base64;
              } else {
                console.log('❌ Fallback data found but invalid base64:', {
                  hasMediaData: !!fallbackMediaData,
                  hasBase64: !!fallbackMediaData?.base64,
                  base64Type: typeof fallbackMediaData?.base64,
                  base64Length: fallbackMediaData?.base64?.length || 0,
                  startsWithData: fallbackMediaData?.base64?.startsWith?.('data:')
                });
              }
            } else {
              console.log('❌ No fallback data found for key:', fallbackKey);
            }
          } catch (fallbackError) {
            console.error('❌ Fallback attempt failed:', fallbackError);
          }
        }
      }
    }

    console.log('❌ FINAL RESULT: No media found for fileId:', fileId);
    console.log('❌ Available alternatives:', imageKeys.slice(0, 3)); // Show first 3 for debugging
    console.log('❌ Total images in storage:', imageKeys.length);

    // Final fallback: if we have any images at all, try the first one as last resort
    if (imageKeys.length > 0) {
      console.log('🚨 EMERGENCY FALLBACK: Trying first available image as last resort');
      try {
        const emergencyKey = imageKeys[0];
        const emergencyData = localStorage.getItem(emergencyKey);
        if (emergencyData) {
          const emergencyMediaData = JSON.parse(emergencyData);
          if (emergencyMediaData?.base64?.startsWith?.('data:')) {
            console.log('🚨 Emergency fallback successful with key:', emergencyKey);
            return emergencyMediaData.base64;
          }
        }
      } catch (emergencyError) {
        console.error('❌ Emergency fallback also failed:', emergencyError);
      }
    }

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