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
      console.log('🔧 ========== INITIALIZING CONTRACT ==========');
      console.log('🔧 User account:', userAccount);

      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);
      console.log('✅ Signer created');

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI.abi,
        web3Signer
      );

      setContract(contractInstance);
      setContractError(null);
      console.log('✅ Contract instance created');

      if (userAccount) {
        console.log('🔄 Starting user initialization flow...');

        // STEP 1: FIRST ensure user exists in Supabase with valid username
        console.log('📝 Step 1: Check/Create user in Supabase...');
        await checkOrCreateSupabaseUser(userAccount);
        console.log('✅ Step 1 complete');

        // STEP 2: THEN auto-register on blockchain (using Supabase data)
        console.log('⛓️ Step 2: Auto-register on blockchain...');
        await autoRegisterOnBlockchain(contractInstance, userAccount);
        console.log('✅ Step 2 complete');

        // STEP 3: FINALLY load user data from Supabase
        console.log('📊 Step 3: Load user data...');
        await loadUserData(userAccount);
        console.log('✅ Step 3 complete');

        console.log('🎉 User initialization complete!');
      }

      console.log('✅ Contract initialized successfully');
      console.log('🔧 ========== INITIALIZATION COMPLETE ==========');
    } catch (error) {
      console.error('❌ ========== CONTRACT INITIALIZATION ERROR ==========');
      console.error('❌ Error:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Contract initialization failed');
      console.error('❌ ========== ERROR END ==========');
      setContractError('Failed to initialize contract. Please check your connection.');
      setContract(null);
      setSigner(null);
    }
  };

  const autoRegisterOnBlockchain = async (contractInstance, userAddress) => {
    try {
      console.log('🔍 ========== AUTO-REGISTER BLOCKCHAIN DEBUG ==========');
      console.log('🔍 Checking if user is registered on blockchain...');
      console.log('🔍 User address:', userAddress);
      console.log('🔍 Contract address:', CONTRACT_ADDRESS);

      // Check if user exists on blockchain using users mapping
      const userOnBlockchain = await contractInstance.users(userAddress);
      const isRegistered = userOnBlockchain.exists;

      console.log('📊 Blockchain registration status:', {
        exists: isRegistered,
        username: userOnBlockchain.username || '(none)',
        isCreator: userOnBlockchain.isCreator,
        address: userAddress
      });

      if (!isRegistered) {
        console.log('📝 User NOT registered on blockchain, checking Supabase...');

        // Get user data from Supabase
        const { data: userData, success } = await SupabaseService.getUser(userAddress);

        console.log('📊 Supabase user data:', {
          success,
          hasData: !!userData,
          username: userData?.username || '(none)',
          bio: userData?.bio || '(none)',
          avatar_url: userData?.avatar_url || '(none)'
        });

        if (success && userData) {
          // Generate default username if missing
          let username = userData.username;
          if (!username || username.trim() === '') {
            username = `User_${userAddress.substring(0, 8)}`;
            console.log('⚠️ No username in Supabase, using default:', username);
          }

          // Validate username is not empty
          if (!username || username.trim() === '') {
            console.error('❌ Cannot register: username is empty even after default generation');
            return;
          }

          console.log('✅ Proceeding with blockchain registration...');
          console.log('📋 Registration parameters:', {
            username: username,
            avatarHash: userData.avatar_url || 'QmDefaultAvatar',
            bio: userData.bio || ''
          });

          try {
            // Call registerUser with required parameters
            const tx = await contractInstance.registerUser(
              username,
              userData.avatar_url || 'QmDefaultAvatar',
              userData.bio || ''
            );
            console.log('⏳ Registration transaction sent:', tx.hash);
            console.log('⏳ Waiting for blockchain confirmation...');

            const receipt = await tx.wait();
            console.log('✅ Transaction confirmed:', {
              hash: receipt.hash,
              blockNumber: receipt.blockNumber,
              status: receipt.status,
              gasUsed: receipt.gasUsed?.toString()
            });

            console.log('✅ User registered on blockchain successfully!');

            // Verify registration
            const userAfterReg = await contractInstance.users(userAddress);
            console.log('📊 Verification - User after registration:', {
              exists: userAfterReg.exists,
              username: userAfterReg.username,
              isCreator: userAfterReg.isCreator
            });
          } catch (regError) {
            console.error('❌ ========== BLOCKCHAIN REGISTRATION ERROR ==========');
            console.error('❌ Error details:', {
              error: regError,
              message: regError.message,
              code: regError.code,
              reason: regError.reason,
              data: regError.data
            });

            // Handle specific error cases
            if (regError.message && regError.message.toLowerCase().includes('already registered')) {
              console.log('ℹ️ User already registered on blockchain (concurrent registration)');
            } else if (regError.message && regError.message.toLowerCase().includes('username cannot be empty')) {
              console.error('❌ CRITICAL: Username is empty! This should not happen.');
            } else if (regError.code === 'ACTION_REJECTED' || regError.code === 4001) {
              console.log('❌ User rejected the registration transaction');
            } else {
              console.error('❌ Blockchain registration failed with unknown error');
            }
            console.error('❌ ========== ERROR END ==========');
          }
        } else {
          console.log('⚠️ User not found in Supabase or failed to fetch data');
          console.log('⚠️ Skipping blockchain registration - user needs to complete profile first');
        }
      } else {
        console.log('✅ User already registered on blockchain');
        console.log('📊 Existing blockchain data:', {
          username: userOnBlockchain.username,
          isCreator: userOnBlockchain.isCreator,
          followersCount: userOnBlockchain.followersCount?.toString(),
          followingCount: userOnBlockchain.followingCount?.toString()
        });
      }
      console.log('🔍 ========== AUTO-REGISTER COMPLETE ==========');
    } catch (error) {
      // Don't block app loading if blockchain check fails
      console.error('⚠️ ========== AUTO-REGISTER FATAL ERROR ==========');
      console.error('⚠️ Error:', error);
      console.error('⚠️ Message:', error.message);
      console.error('⚠️ Stack:', error.stack);
      console.warn('⚠️ Blockchain registration check failed - app will continue without blockchain registration');
      console.error('⚠️ ========== FATAL ERROR END ==========');
    }
  };

  const loadUserData = async (userAccount) => {
    try {
      console.log('🔍 ========== LOADING USER DATA ==========');
      console.log('🔍 Loading user data from Supabase for:', userAccount);

      // Load user data from Supabase ONLY
      const { data: userData, success } = await SupabaseService.getUser(userAccount);

      console.log('📊 Load user result:', {
        success,
        hasData: !!userData,
        username: userData?.username || '(none)'
      });

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
        console.log('✅ User data loaded from Supabase:', {
          username: userObj.username,
          isCreator: userObj.isCreator,
          address: userObj.address
        });
      } else {
        // User doesn't exist in Supabase - this should not happen if initializeContract ran correctly
        console.warn('⚠️ User not found in Supabase after initialization!');
        console.warn('⚠️ This indicates a problem with the initialization flow');
        setUser(null);
      }
      console.log('🔍 ========== LOAD USER DATA COMPLETE ==========');
    } catch (error) {
      console.error('❌ ========== LOAD USER DATA ERROR ==========');
      console.error('❌ Error loading user data:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ ========== ERROR END ==========');
      setUser(null);
    }
  };

  const checkOrCreateSupabaseUser = async (walletAddress) => {
    try {
      console.log('🔍 ========== CHECK/CREATE SUPABASE USER DEBUG ==========');
      console.log('🔍 Checking if user exists in Supabase...');
      console.log('🔍 Wallet address:', walletAddress);

      const { data: existingUser, success: getUserSuccess } = await SupabaseService.getUser(walletAddress.toLowerCase());

      console.log('📊 Supabase check result:', {
        success: getUserSuccess,
        userExists: !!existingUser,
        username: existingUser?.username || '(none)'
      });

      if (!existingUser) {
        console.log('📝 User does NOT exist in Supabase, creating new record...');

        // Generate default username from wallet address
        const defaultUsername = `User_${walletAddress.substring(0, 8)}`;
        console.log('📝 Using default username:', defaultUsername);

        const newUserData = {
          wallet_address: walletAddress.toLowerCase(),
          username: defaultUsername, // FIX: Use default username instead of null
          bio: null,
          avatar_url: null,
          is_creator: false,
          followers_count: 0,
          following_count: 0
        };

        console.log('📋 New user data to insert:', newUserData);

        const result = await SupabaseService.createUser(newUserData);

        if (result.success) {
          console.log('✅ User created in Supabase on first connection');
          console.log('📊 Created user data:', result.data);
        } else {
          console.error('❌ Failed to create user in Supabase:', result.error);
          console.error('❌ Error details:', result);
        }
      } else {
        console.log('✅ User already exists in Supabase');
        console.log('📊 Existing user data:', {
          username: existingUser.username,
          is_creator: existingUser.is_creator,
          bio: existingUser.bio || '(none)',
          avatar_url: existingUser.avatar_url || '(none)'
        });

        // If user exists but has no username, update with default
        if (!existingUser.username || existingUser.username.trim() === '') {
          console.log('⚠️ User exists but has no username, updating with default...');
          const defaultUsername = `User_${walletAddress.substring(0, 8)}`;

          const updateResult = await SupabaseService.createOrUpdateUser({
            wallet_address: walletAddress.toLowerCase(),
            username: defaultUsername
          });

          if (updateResult.success) {
            console.log('✅ Updated user with default username:', defaultUsername);
          } else {
            console.error('❌ Failed to update username:', updateResult.error);
          }
        }
      }
      console.log('🔍 ========== CHECK/CREATE COMPLETE ==========');
    } catch (error) {
      console.error('❌ ========== SUPABASE USER CHECK/CREATE ERROR ==========');
      console.error('❌ Error:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========== ERROR END ==========');
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
    console.log('🌟 ========== BECOME CREATOR FLOW ==========');

    if (!account) {
      console.error('❌ No account connected');
      return { success: false, message: 'Please connect your wallet first.' };
    }

    console.log('📊 Current state:', {
      account,
      hasUser: !!user,
      username: user?.username || '(none)',
      isCreator: user?.isCreator,
      hasContract: !!contract
    });

    if (!user) {
      console.error('❌ User not loaded');
      return { success: false, message: 'Please register your account first before becoming a creator.' };
    }

    if (user.isCreator) {
      console.warn('⚠️ User is already a creator');
      return { success: false, message: 'You are already a creator!' };
    }

    if (!contract) {
      console.error('❌ Contract not initialized');
      return { success: false, message: 'Smart contract not initialized. Please check your network connection.' };
    }

    try {
      setLoading(true);

      // Step 0: Check if user is registered on blockchain, if not register them
      console.log('🔍 Step 0: Checking blockchain registration...');
      const userOnBlockchain = await contract.users(account);

      console.log('📊 Blockchain user data:', {
        exists: userOnBlockchain.exists,
        username: userOnBlockchain.username || '(none)',
        isCreator: userOnBlockchain.isCreator,
        address: account
      });

      if (!userOnBlockchain.exists) {
        console.log('📝 User NOT registered on blockchain, registering now...');

        // Generate username if missing
        const username = user.username || `User_${account.substring(0, 8)}`;
        console.log('📋 Registration parameters:', {
          username,
          avatarUrl: user.avatarUrl || 'QmDefaultAvatar',
          bio: user.bio || ''
        });

        // Register user on blockchain first
        const registerTx = await contract.registerUser(
          username,
          user.avatarUrl || 'QmDefaultAvatar',
          user.bio || ''
        );
        console.log('⏳ Registration transaction sent:', registerTx.hash);

        const registerReceipt = await registerTx.wait();
        console.log('✅ Registration transaction confirmed:', {
          hash: registerReceipt.hash,
          blockNumber: registerReceipt.blockNumber,
          status: registerReceipt.status
        });

        // Verify registration
        const userAfterReg = await contract.users(account);
        console.log('📊 User after registration:', {
          exists: userAfterReg.exists,
          username: userAfterReg.username,
          isCreator: userAfterReg.isCreator
        });
      } else {
        console.log('✅ User already registered on blockchain');
      }

      // Step 1: Call blockchain becomeCreator function
      console.log('⛓️ Step 1: Calling becomeCreator on blockchain...');
      const tx = await contract.becomeCreator();
      console.log('⏳ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString()
      });

      // Verify creator status on blockchain
      const userAfterCreator = await contract.users(account);
      console.log('📊 User after becomeCreator:', {
        exists: userAfterCreator.exists,
        username: userAfterCreator.username,
        isCreator: userAfterCreator.isCreator
      });

      // Step 2: Update Supabase after blockchain confirmation
      console.log('📝 Step 2: Updating is_creator in Supabase...');
      const supabaseUpdate = {
        wallet_address: account.toLowerCase(),
        is_creator: true
      };

      const result = await SupabaseService.createOrUpdateUser(supabaseUpdate);

      if (!result.success) {
        console.error('⚠️ Failed to update is_creator in Supabase:', result.error);
        console.error('⚠️ Error details:', result);
        // Even if Supabase update fails, the blockchain transaction succeeded
        console.log('⚠️ You are registered as creator on blockchain, but database update failed');
      } else {
        console.log('✅ is_creator updated in Supabase');
        console.log('✅ Supabase response:', result.data);
      }

      // Step 3: Reload user data
      console.log('🔄 Step 3: Reloading user data...');
      await loadUserData(account);

      console.log('🎉 ========== BECOME CREATOR SUCCESS ==========');
      return { success: true, message: 'Congratulations! You are now a creator!' };

    } catch (error) {
      console.error('❌ ========== BECOME CREATOR ERROR ==========');
      console.error('❌ Error details:', {
        error,
        name: error.name,
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      });

      // Handle specific error cases
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        console.log('❌ User rejected transaction');
        return { success: false, message: 'Transaction was rejected by user' };
      } else if (error.message?.includes('Already a creator')) {
        console.log('⚠️ Already a creator on blockchain');
        return { success: false, message: 'You are already registered as a creator on the blockchain!' };
      } else if (error.message?.includes('User not registered')) {
        console.error('❌ CRITICAL: User not registered on blockchain!');
        return { success: false, message: 'Your account is not registered on the blockchain. Please reload the page and try again.' };
      } else if (error.message?.includes('Username cannot be empty')) {
        console.error('❌ CRITICAL: Username is empty!');
        return { success: false, message: 'Username is required. Please complete your profile first.' };
      }

      console.error('❌ Unknown error:', error.message);
      console.error('❌ ========== ERROR END ==========');
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
        console.log('🖼️ File selezionato:', {
          name: avatarFile.name,
          size: avatarFile.size,
          type: avatarFile.type
        });
        console.log('📤 Uploading to Storage...');

        // Step 1: Upload to Supabase Storage 'avatars' bucket
        const timestamp = Date.now();
        const fileExtension = avatarFile.name.split('.').pop();
        const fileName = `avatar_${account.toLowerCase()}_${timestamp}.${fileExtension}`;

        console.log('📁 Nome file generato:', fileName);

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
        console.log('✅ Upload completato, URL:', avatarUrl);

        // Step 2: Register avatar on blockchain as FREE content (price=0, isPaid=false)
        console.log('⛓️ Chiamata contract.createContent...');
        console.log('📋 Parametri blockchain:', {
          url: avatarUrl,
          price: 0,
          isPaid: false
        });

        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const web3Signer = await web3Provider.getSigner();
          const contractInstance = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI.abi,
            web3Signer
          );

          console.log('🔐 Opening MetaMask for transaction...');
          // Create content with price=0 and isPaid=false (FREE content)
          const tx = await contractInstance.createContent(avatarUrl, 0, false);
          console.log('✅ Transaction sent! Hash:', tx.hash);
          console.log('⏳ Waiting for blockchain confirmation...');

          const receipt = await tx.wait();
          console.log('✅ Transazione confermata! Receipt:', {
            hash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString()
          });

          // Extract contentId from ContentCreated event
          console.log('🔍 Searching for ContentCreated event in logs...');
          console.log('📊 Total logs:', receipt.logs.length);

          // Parse logs using contract interface (more robust for ethers.js v6)
          avatarBlockchainId = null;
          for (const log of receipt.logs) {
            try {
              const parsedLog = contractInstance.interface.parseLog({
                topics: [...log.topics],
                data: log.data
              });

              if (parsedLog && parsedLog.name === 'ContentCreated') {
                avatarBlockchainId = parsedLog.args[0].toString(); // contentId is first argument
                console.log('✅ ContentCreated event found!');
                console.log('✅ Transazione confermata, blockchain_id:', avatarBlockchainId);
                console.log('📋 Event args:', {
                  contentId: parsedLog.args[0].toString(),
                  creator: parsedLog.args[1],
                  price: parsedLog.args[2].toString()
                });
                break;
              }
            } catch (error) {
              // Skip logs that don't match our contract ABI
              continue;
            }
          }

          if (!avatarBlockchainId) {
            console.warn('⚠️ ContentCreated event not found in transaction logs');
            console.log('🔍 Available logs:', receipt.logs.map((log, idx) => ({
              index: idx,
              address: log.address,
              topics: log.topics.map(t => t.substring(0, 10) + '...')
            })));
          }

        } catch (blockchainError) {
          console.error('❌ Blockchain registration failed:', blockchainError);
          console.error('📋 Error details:', {
            code: blockchainError.code,
            message: blockchainError.message,
            reason: blockchainError.reason
          });
          // Don't fail the entire profile update if blockchain registration fails
          // The avatar is still uploaded to Supabase
          console.log('⚠️ Continuing with profile update without blockchain registration');
        }
      }

      // Step 3: Update Supabase with avatar URL and blockchain ID
      console.log('💾 Aggiornamento database...');
      const supabaseUpdate = {
        wallet_address: account.toLowerCase(),
        username: username.trim(),
        bio: bio || null,
        avatar_url: avatarUrl,
        avatar_blockchain_id: avatarBlockchainId
      };

      console.log('📋 Dati da salvare:', supabaseUpdate);

      const result = await SupabaseService.createOrUpdateUser(supabaseUpdate);

      if (!result.success) {
        console.error('❌ Failed to update profile in Supabase:', result.error);
        return { success: false, message: 'Failed to update profile: ' + result.error };
      }

      console.log('✅ Profile updated in Supabase successfully!');

      // Reload user data
      console.log('🔄 Reloading user data...');
      await loadUserData(account);
      console.log('✅ Foto profilo aggiornata! New user data:', {
        username: username.trim(),
        avatarUrl: avatarUrl,
        blockchainId: avatarBlockchainId
      });

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

  // Retrieve media from localStorage OR return direct URL
  const getMediaUrl = (fileId) => {
    if (!fileId || typeof fileId !== 'string') {
      return null;
    }

    // TEMPORARY: Allow base64 data URLs (for backward compatibility)
    // TODO: Migrate all base64 to Supabase Storage URLs
    if (fileId.startsWith('data:image') || fileId.startsWith('data:video') || fileId.startsWith('data:audio')) {
      console.warn('⚠️ [getMediaUrl] Base64 data URL detected - allowing temporarily:', fileId.substring(0, 50) + '...');
      return fileId;
    }

    // If fileId is already a direct URL (e.g., Supabase Storage URL), return it directly
    if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
      console.log('🌐 [getMediaUrl] Direct URL detected:', fileId.substring(0, 50) + '...');
      return fileId;
    }

    // For demo/placeholder content, return null to show placeholder
    if (fileId.startsWith('QmTest') || fileId === 'default' || fileId === 'QmDefaultAvatar') {
      return null;
    }

    // Try to retrieve from localStorage (for old base64 stored images)
    try {
      const storedData = localStorage.getItem(fileId);
      if (storedData) {
        const mediaData = JSON.parse(storedData);
        if (mediaData && mediaData.base64) {
          console.log('💾 [getMediaUrl] Found in localStorage:', fileId);
          return mediaData.base64;
        }
      }
    } catch (error) {
      console.error('Error retrieving media:', error);
    }

    console.log('❌ [getMediaUrl] No media found for:', fileId);
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