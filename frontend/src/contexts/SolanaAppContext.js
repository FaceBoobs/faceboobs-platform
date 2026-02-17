// src/contexts/SolanaAppContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SupabaseService } from '../services/supabaseService';
import { solanaService } from '../services/solanaService';
import { supabase } from '../supabaseClient';

const SolanaAppContext = createContext(null);

export const useSolanaApp = () => {
  const ctx = useContext(SolanaAppContext);
  if (!ctx) throw new Error('useSolanaApp must be used within <SolanaAppProvider>');
  return ctx;
};

export const SolanaAppProvider = ({ children }) => {
  const { publicKey, connected, connecting, wallet, sendTransaction, disconnect } = useWallet();
  const { connection } = useConnection();

  const account = useMemo(() => (publicKey ? publicKey.toBase58() : null), [publicKey]);
  const accountLower = useMemo(() => (account ? account.toLowerCase() : null), [account]);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // user loading
  const [error, setError] = useState(null);

  // Media URL helper (avatar_url/chat-media already public in your app)
  const getMediaUrl = useCallback((url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // best-effort: treat as a storage path in avatars bucket
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(url);
      return data?.publicUrl || url;
    } catch {
      return url;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!accountLower) {
      setUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await SupabaseService.getUser(accountLower);

      if (res?.success && res.data) {
        setUser(res.data);
        return;
      }

      // Create default user row if missing
      console.log('🆕 Creating new user for Solana address:', accountLower);
      const defaultUser = {
        wallet_address: accountLower,
        solana_address: accountLower,
        username: `User_${accountLower.slice(0, 8)}`,
        bio: null,
        avatar_url: null,
        is_creator: false,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString()
      };

      // Use createUser (INSERT) since we already know the user doesn't exist.
      const upsert = await SupabaseService.createUser(defaultUser);
      if (!upsert?.success) {
        console.error('❌ Failed to create user:', upsert?.error);
        throw new Error(upsert?.error || 'Failed to create user');
      }

      console.log('✅ New user registered:', accountLower);
      const res2 = await SupabaseService.getUser(accountLower);
      if (res2?.success) setUser(res2.data || null);
    } catch (e) {
      setUser(null);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [accountLower]);

  // Auto-register user when Solana wallet connects
  useEffect(() => {
    const registerOrLoadUser = async () => {
      if (!publicKey || !connected) {
        console.log('🔒 Wallet not connected');
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }

      const solanaAddress = publicKey.toString().toLowerCase();
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('🔐 Solana Wallet Connected!');
      console.log('═══════════════════════════════════════');
      console.log('📍 Solana Address:', publicKey.toString());
      console.log('📍 Normalized:', solanaAddress);

      setLoading(true);
      setError(null);

      try {
        // 1. Check if user exists
        console.log('🔍 Checking if user exists in database...');
        const userResult = await SupabaseService.getUser(solanaAddress);

        if (userResult?.success && userResult.data) {
          console.log('✅ User found:', userResult.data.username);
          setUser(userResult.data);
          console.log('═══════════════════════════════════════');
          return;
        }

        // 2. User doesn't exist - create new record
        console.log('⚠️ User not found - creating new user...');
        const newUser = {
          wallet_address: solanaAddress,
          solana_address: solanaAddress,
          username: `User_${solanaAddress.slice(0, 8)}`,
          bio: null,
          avatar_url: null,
          is_creator: false,
          followers_count: 0,
          following_count: 0,
          created_at: new Date().toISOString()
        };

        console.log('💾 Inserting user data:', {
          wallet_address: newUser.wallet_address,
          username: newUser.username
        });

        // Use createUser (INSERT) since we already know the user doesn't exist.
        // Avoids the conflict-resolution path of upsert for brand-new wallets.
        const createResult = await SupabaseService.createUser(newUser);

        if (!createResult?.success) {
          console.error('❌ Failed to create user:', createResult?.error);
          throw new Error(createResult?.error || 'Failed to create user');
        }

        console.log('✅ New user registered:', solanaAddress);

        // 3. Fetch the newly created user
        const fetchResult = await SupabaseService.getUser(solanaAddress);
        if (fetchResult?.success && fetchResult.data) {
          console.log('✅ User loaded:', fetchResult.data.username);
          setUser(fetchResult.data);
        }

        console.log('═══════════════════════════════════════');
      } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════');
        console.error('❌ ERROR registering/loading user:');
        console.error('═══════════════════════════════════════');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════');
        setUser(null);
        setError(error?.message || String(error));
      } finally {
        setLoading(false);
      }
    };

    registerOrLoadUser();
  }, [publicKey, connected]);

  // Balance helper
  const getBalanceSOL = useCallback(async () => {
    if (!publicKey) return { success: false, error: 'Wallet not connected', balanceSOL: 0 };
    try {
      const lamports = await connection.getBalance(publicKey);
      return { success: true, balanceSOL: lamports / 1e9 };
    } catch (e) {
      return { success: false, error: e?.message || String(e), balanceSOL: 0 };
    }
  }, [connection, publicKey]);

  // Send SOL helper (wraps your existing service)
  const sendSOL = useCallback(
    async (toAddress, amountSOL) => {
      if (!publicKey) return { success: false, error: 'Wallet not connected' };
      if (!toAddress) return { success: false, error: 'Missing destination address' };
      const amt = Number(amountSOL);
      if (!Number.isFinite(amt) || amt <= 0) return { success: false, error: 'Invalid amount' };

      return solanaService.sendSOL(
        { publicKey, sendTransaction },
        connection,
        toAddress,
        amt
      );
    },
    [connection, publicKey, sendTransaction]
  );

  // Become creator (Supabase-only)
  const becomeCreator = useCallback(async () => {
    if (!accountLower) return { success: false, message: 'Please connect your wallet first.' };
    if (!user) return { success: false, message: 'User not loaded yet.' };
    if (user.is_creator) return { success: false, message: 'You are already a creator.' };

    try {
      setLoading(true);
      const result = await SupabaseService.createOrUpdateUser({
        wallet_address: accountLower,
        is_creator: true
      });

      if (!result?.success) {
        return { success: false, message: result?.error || 'Failed to update creator status' };
      }

      await refreshUser();
      return { success: true, message: 'You are now a creator!' };
    } catch (e) {
      return { success: false, message: e?.message || String(e) };
    } finally {
      setLoading(false);
    }
  }, [accountLower, refreshUser, user]);

  const value = {
    // wallet state
    publicKey,
    connected,
    connecting,
    walletName: wallet?.adapter?.name || null,
    disconnectWallet: disconnect,

    // account
    account,
    accountLower,

    // user
    user,
    loading,
    error,
    refreshUser,

    // helpers
    getMediaUrl,
    getBalanceSOL,
    sendSOL,
    becomeCreator
  };

  return <SolanaAppContext.Provider value={value}>{children}</SolanaAppContext.Provider>;
};
