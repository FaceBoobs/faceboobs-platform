// followDiagnostic.js - Script di diagnostica per il sistema di follow
import { supabase } from '../supabaseClient';
import { getFollowing, followUser, isFollowing } from '../services/followService';

/**
 * Test completo del sistema di follow
 * Da usare nella console del browser:
 *
 * import { runFollowDiagnostic } from './utils/followDiagnostic';
 * runFollowDiagnostic('0xYourAddress');
 */
export const runFollowDiagnostic = async (userAddress) => {
  console.log('🔍 ===== FOLLOW SYSTEM DIAGNOSTIC =====');
  console.log('📋 Testing for address:', userAddress);
  console.log('');

  // TEST 1: Verifica connessione Supabase
  console.log('TEST 1: Supabase Connection');
  try {
    const { data, error } = await supabase.from('follows').select('count');
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    console.log('✅ Supabase connected successfully');
    console.log('📊 Total follows in database:', data);
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
  console.log('');

  // TEST 2: Verifica tabella follows
  console.log('TEST 2: Follows Table Structure');
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Cannot read follows table:', error);
      return false;
    }
    console.log('✅ Follows table accessible');
    console.log('📋 Sample row:', data[0] || 'No data yet');
  } catch (error) {
    console.error('❌ Follows table error:', error);
    return false;
  }
  console.log('');

  // TEST 3: Verifica follows dell'utente
  console.log('TEST 3: User Following List');
  try {
    const result = await getFollowing(userAddress);
    if (result.success) {
      console.log('✅ getFollowing() works correctly');
      console.log('📊 Following count:', result.data.length);
      console.log('📋 Following addresses:', result.data);
    } else {
      console.error('❌ getFollowing() failed:', result.error);
    }
  } catch (error) {
    console.error('❌ getFollowing() error:', error);
  }
  console.log('');

  // TEST 4: Verifica diretta su Supabase
  console.log('TEST 4: Direct Supabase Query');
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_solana_address', userAddress.toLowerCase());

    if (error) {
      console.error('❌ Direct query failed:', error);
    } else {
      console.log('✅ Direct query successful');
      console.log('📊 Raw follows data:', data);
    }
  } catch (error) {
    console.error('❌ Direct query error:', error);
  }
  console.log('');

  // TEST 5: Verifica case sensitivity
  console.log('TEST 5: Address Case Sensitivity Check');
  try {
    const lowerCase = await supabase
      .from('follows')
      .select('*')
      .eq('follower_solana_address', userAddress.toLowerCase());

    const upperCase = await supabase
      .from('follows')
      .select('*')
      .eq('follower_solana_address', userAddress.toUpperCase());

    const original = await supabase
      .from('follows')
      .select('*')
      .eq('follower_solana_address', userAddress);

    console.log('📊 Lowercase results:', lowerCase.data?.length || 0);
    console.log('📊 Uppercase results:', upperCase.data?.length || 0);
    console.log('📊 Original case results:', original.data?.length || 0);

    if (lowerCase.data?.length !== upperCase.data?.length) {
      console.warn('⚠️ WARNING: Case sensitivity issue detected!');
      console.log('💡 Solution: Always store addresses in lowercase');
    } else {
      console.log('✅ No case sensitivity issues');
    }
  } catch (error) {
    console.error('❌ Case sensitivity check error:', error);
  }
  console.log('');

  // TEST 6: Test completo follow/unfollow (solo se richiesto)
  console.log('TEST 6: Follow/Unfollow Test');
  console.log('⚠️ Skipping live test to avoid data pollution');
  console.log('💡 To test manually:');
  console.log('   1. Follow a user from UI');
  console.log('   2. Check browser console for "✅ Follow saved successfully"');
  console.log('   3. Refresh page (F5)');
  console.log('   4. Check browser console for "✅ Following loaded: [...]"');
  console.log('');

  console.log('🏁 ===== DIAGNOSTIC COMPLETE =====');
  return true;
};

/**
 * Test rapido: verifica se un follow esiste
 */
export const quickFollowCheck = async (followerAddress, followedAddress) => {
  console.log('🔍 Quick Follow Check');
  console.log('👤 Follower:', followerAddress);
  console.log('🎯 Followed:', followedAddress);

  const result = await isFollowing(followerAddress, followedAddress);

  if (result.success) {
    console.log(result.isFollowing ? '✅ IS FOLLOWING' : '❌ NOT FOLLOWING');
  } else {
    console.error('❌ Check failed:', result.error);
  }

  return result;
};

/**
 * Esporta tutte le follows dell'utente in formato leggibile
 */
export const exportUserFollows = async (userAddress) => {
  console.log('📤 Exporting follows for:', userAddress);

  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_solana_address', userAddress.toLowerCase());

    if (error) throw error;

    console.log('✅ Export complete:');
    console.table(data);

    return data;
  } catch (error) {
    console.error('❌ Export failed:', error);
    return null;
  }
};

// Per uso rapido nella console
window.followDiagnostic = {
  run: runFollowDiagnostic,
  check: quickFollowCheck,
  export: exportUserFollows
};

console.log('🔧 Follow Diagnostic Tools loaded!');
console.log('💡 Usage in console:');
console.log('   followDiagnostic.run("0xYourAddress")');
console.log('   followDiagnostic.check("0xFollower", "0xFollowed")');
console.log('   followDiagnostic.export("0xYourAddress")');
