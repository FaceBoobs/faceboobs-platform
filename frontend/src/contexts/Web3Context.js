import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CONTRACT_ABI from '../contracts/SocialPlatform.json';
import { SupabaseService } from '../services/supabaseService';
import { supabase } from '../supabaseClient';

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
        await loadUserData(userAccount);
      }

      console.log('✅ Contract initialized successfully');
    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      setContractError('Failed to initialize contract. Please check your connection.');
      setContract(null);
      setSigner(null);
    }
  };

  const loadUserData = async (userAccount) => {
    try {
      console.log('🔍 Loading user data from Supabase for:', userAccount);

      // Load user data from Supabase ONLY
      const { data: userData, success } = await SupabaseService.getUser(userAccount);

      if (success && userData) {
        // User exists in Supabase
        const userObj = {
          address: userAccount,
          username: userData.username || null,
          avatarHash: userData.avatar_url || 'QmDefaultAvatar',
          bio: userData.bio || '',
          isCreator: userData.is_creator || false,
          followersCount: userData.followers_count || 0,
          followingCount: userData.following_count || 0,
          totalEarnings: '0' // Earnings are only tracked on blockchain
        };

        setUser(userObj);
        console.log('✅ User data loaded from Supabase');
      } else {
        // User doesn't exist in Supabase - create them automatically
        console.log('ℹ️ User not found in Supabase, creating new record...');
        await checkOrCreateSupabaseUser(userAccount);
        setUser(null); // User is created but not registered yet
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      setUser(null);
    }
  };

  const checkOrCreateSupabaseUser = async (walletAddress) => {
    try {
      console.log('🔍 Checking if user exists in Supabase...');

      const { data: existingUser } = await SupabaseService.getUser(walletAddress.toLowerCase());

      if (!existingUser) {
        console.log('📝 Creating new user record in Supabase...');

        const newUserData = {
          wallet_address: walletAddress.toLowerCase(),
          username: null,
          bio: null,
          avatar_url: null,
          is_creator: false,
          followers_count: 0,
          following_count: 0
        };

        const result = await SupabaseService.createUser(newUserData);

        if (result.success) {
          console.log('✅ User created in Supabase on first connection');
        } else {
          console.error('❌ Failed to create user in Supabase:', result.error);
        }
      } else {
        console.log('✅ User already exists in Supabase');
      }
    } catch (error) {
      console.error('❌ Error checking/creating Supabase user:', error);
    }
  };


  const registerUser = async (username, bio, avatarFile) => {
    if (!account) {
      return { success: false, message: 'Please connect your wallet first.' };
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

      // Save user to Supabase ONLY (no blockchain call)
      console.log('📝 Saving user data to Supabase...');
      console.log('Account address:', account);
      console.log('Username:', username.trim());
      console.log('Bio:', bio || '');
      console.log('Avatar hash:', avatarHash);

      const userData = {
        wallet_address: account.toLowerCase(),
        username: username.trim(),
        bio: bio || '',
        avatar_url: avatarHash !== 'QmDefaultAvatar' ? avatarHash : null,
        is_creator: false,
        followers_count: 0,
        following_count: 0
      };

      console.log('📤 Data to insert in Supabase:', userData);

      const supabaseResult = await SupabaseService.createOrUpdateUser(userData);

      if (!supabaseResult.success) {
        console.error('❌ Failed to save user to Supabase:', supabaseResult.error);
        console.error('❌ Error details:', supabaseResult);
        return { success: false, message: 'Failed to register user: ' + supabaseResult.error };
      }

      console.log('✅ User saved to Supabase successfully');
      console.log('✅ Supabase response:', supabaseResult.data);

      await loadUserData(account);

      return { success: true, message: 'Registration successful!' };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed: ' + error.message };
    } finally {
      setLoading(false);
    }
  };

  const becomeCreator = async () => {
    if (!account) {
      return { success: false, message: 'Please connect your wallet first.' };
    }

    if (!user) {
      return { success: false, message: 'Please register your account first before becoming a creator.' };
    }

    if (user.isCreator) {
      return { success: false, message: 'You are already a creator!' };
    }

    try {
      setLoading(true);

      // Update Supabase ONLY (no blockchain call)
      console.log('📝 Updating is_creator in Supabase...');
      const supabaseUpdate = {
        wallet_address: account.toLowerCase(),
        is_creator: true
      };

      const result = await SupabaseService.createOrUpdateUser(supabaseUpdate);

      if (!result.success) {
        console.error('⚠️ Failed to update is_creator in Supabase:', result.error);
        return { success: false, message: 'Failed to become creator: ' + result.error };
      }

      console.log('✅ is_creator updated in Supabase');

      // Reload user data
      await loadUserData(account);

      return { success: true, message: 'Congratulations! You are now a creator!' };

    } catch (error) {
      console.error('❌ Become creator error:', error);
      return { success: false, message: 'Failed to become creator: ' + error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (username, bio, avatarFile) => {
    if (!account) {
      return { success: false, message: 'Please connect your wallet first.' };
    }

    if (!user) {
      return { success: false, message: 'Please register your account first.' };
    }

    if (!username || username.trim() === '') {
      return { success: false, message: 'Username is required.' };
    }

    try {
      setLoading(true);

      let avatarUrl = user.avatarHash || null;
      let avatarBlockchainId = null;

      // If new avatar file is uploaded
      if (avatarFile) {
        console.log('📤 Uploading avatar to Supabase Storage...');

        // Step 1: Upload to Supabase Storage 'avatars' bucket
        const timestamp = Date.now();
        const fileExtension = avatarFile.name.split('.').pop();
        const fileName = `avatar_${account.toLowerCase()}_${timestamp}.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Failed to upload avatar:', uploadError);
          throw new Error('Failed to upload avatar: ' + uploadError.message);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
        console.log('✅ Avatar uploaded to Supabase:', avatarUrl);

        // Step 2: Register avatar on blockchain as FREE content (price=0, isPaid=false)
        console.log('⛓️ Registering avatar on blockchain as free content...');

        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const web3Signer = await web3Provider.getSigner();
          const contractInstance = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI.abi,
            web3Signer
          );

          // Create content with price=0 and isPaid=false (FREE content)
          const tx = await contractInstance.createContent(avatarUrl, 0, false);
          console.log('⏳ Waiting for blockchain confirmation...');

          const receipt = await tx.wait();
          console.log('✅ Blockchain transaction confirmed:', receipt.hash);

          // Extract contentId from ContentCreated event
          const contentCreatedEvent = receipt.logs.find(
            log => log.fragment && log.fragment.name === 'ContentCreated'
          );

          if (contentCreatedEvent) {
            avatarBlockchainId = contentCreatedEvent.args[0].toString();
            console.log('✅ Avatar registered on blockchain with ID:', avatarBlockchainId);
          } else {
            console.warn('⚠️ ContentCreated event not found in transaction logs');
          }

        } catch (blockchainError) {
          console.error('❌ Blockchain registration failed:', blockchainError);
          // Don't fail the entire profile update if blockchain registration fails
          // The avatar is still uploaded to Supabase
          console.log('⚠️ Continuing with profile update without blockchain registration');
        }
      }

      // Step 3: Update Supabase with avatar URL and blockchain ID
      console.log('📝 Updating profile in Supabase...');
      const supabaseUpdate = {
        wallet_address: account.toLowerCase(),
        username: username.trim(),
        bio: bio || null,
        avatar_url: avatarUrl,
        avatar_blockchain_id: avatarBlockchainId
      };

      const result = await SupabaseService.createOrUpdateUser(supabaseUpdate);

      if (!result.success) {
        console.error('⚠️ Failed to update profile in Supabase:', result.error);
        return { success: false, message: 'Failed to update profile: ' + result.error };
      }

      console.log('✅ Profile updated in Supabase');

      // Reload user data
      await loadUserData(account);

      return { success: true, message: 'Profile updated successfully!' };

    } catch (error) {
      console.error('❌ Update profile error:', error);
      return { success: false, message: 'Failed to update profile: ' + error.message };
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