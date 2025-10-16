// src/services/followService.js
// Wrapper service per operazioni di follow che usa SupabaseService
import { SupabaseService } from './supabaseService';
import { createFollowNotification } from './notificationService';

/**
 * Follow a user
 * @param {string} followerAddress - Address of the user doing the follow
 * @param {string} followedAddress - Address of the user being followed
 * @param {string} followerUsername - Username of the follower (optional)
 * @returns {Promise<{success: boolean, action?: string, error?: string}>}
 */
export const followUser = async (followerAddress, followedAddress, followerUsername = null) => {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🔵 followService.followUser CHIAMATA');
  console.log('═══════════════════════════════════════');
  console.log('📊 Parametri ricevuti:');
  console.log('   - followerAddress:', followerAddress);
  console.log('   - followedAddress:', followedAddress);
  console.log('   - followerType:', typeof followerAddress);
  console.log('   - followedType:', typeof followedAddress);

  try {
    // Validazione parametri
    if (!followerAddress || !followedAddress) {
      console.error('❌ VALIDAZIONE FALLITA: Indirizzi mancanti');
      console.log('═══════════════════════════════════════');
      return { success: false, error: 'Follower and followed addresses are required' };
    }

    if (followerAddress === followedAddress) {
      console.error('❌ VALIDAZIONE FALLITA: Non puoi seguire te stesso');
      console.log('═══════════════════════════════════════');
      return { success: false, error: 'Cannot follow yourself' };
    }

    console.log('✅ Validazione parametri OK');
    console.log('📞 Chiamando SupabaseService.followUser...');

    const result = await SupabaseService.followUser(followerAddress, followedAddress);

    console.log('📬 Risposta da SupabaseService:');
    console.log('   - success:', result.success);
    console.log('   - action:', result.action);
    console.log('   - error:', result.error || 'none');
    console.log('   - data:', result.data || 'none');

    if (result.success) {
      console.log('✅ Follow successful:', result.action);

      // Create notification for the followed user (only if it's a new follow, not already_following)
      if (result.action === 'followed') {
        console.log('🔔 Creating follow notification...');
        try {
          await createFollowNotification(followedAddress, followerAddress, followerUsername);
          console.log('✅ Follow notification created');
        } catch (notifError) {
          console.error('⚠️ Failed to create notification (non-critical):', notifError);
          // Don't fail the follow operation if notification fails
        }
      }

      console.log('═══════════════════════════════════════');
    } else {
      console.error('❌ Follow failed:', result.error);
      console.log('═══════════════════════════════════════');
    }

    return result;
  } catch (error) {
    console.error('❌ ERRORE CATCH in followService.followUser:');
    console.error('   - Message:', error.message);
    console.error('   - Stack:', error.stack);
    console.log('═══════════════════════════════════════');
    return { success: false, error: error.message };
  }
};

/**
 * Unfollow a user
 * @param {string} followerAddress - Address of the user doing the unfollow
 * @param {string} followedAddress - Address of the user being unfollowed
 * @returns {Promise<{success: boolean, action?: string, error?: string}>}
 */
export const unfollowUser = async (followerAddress, followedAddress) => {
  try {
    console.log('🔄 followService.unfollowUser:', { followerAddress, followedAddress });

    if (!followerAddress || !followedAddress) {
      return { success: false, error: 'Follower and followed addresses are required' };
    }

    const result = await SupabaseService.unfollowUser(followerAddress, followedAddress);

    if (result.success) {
      console.log('✅ Unfollow successful:', result.action);
    } else {
      console.error('❌ Unfollow failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Error in followService.unfollowUser:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get list of addresses that a user is following
 * @param {string} userAddress - Address of the user
 * @returns {Promise<{success: boolean, data?: Array<{followed_address: string}>, error?: string}>}
 */
export const getFollowing = async (userAddress) => {
  try {
    console.log('🔄 followService.getFollowing for:', userAddress);
    console.log('📊 Type:', typeof userAddress, '| Value:', userAddress);

    if (!userAddress) {
      console.error('❌ User address is required');
      return { success: false, error: 'User address is required', data: [] };
    }

    console.log('📞 Calling SupabaseService.getFollowing...');
    const result = await SupabaseService.getFollowing(userAddress);
    console.log('📬 SupabaseService.getFollowing result:', {
      success: result.success,
      dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
      dataLength: result.data?.length || 0,
      error: result.error || 'none'
    });

    if (result.success) {
      console.log('✅ getFollowing successful:', result.data.length, 'following');
      console.log('📋 Following addresses:', result.data);

      // Validazione extra: assicurati che result.data sia un array
      if (!Array.isArray(result.data)) {
        console.error('⚠️ WARNING: result.data is not an array!', result.data);
        return { success: false, error: 'Invalid data format', data: [] };
      }
    } else {
      console.error('❌ getFollowing failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Error in followService.getFollowing:', error);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get list of addresses that follow a user (followers)
 * @param {string} userAddress - Address of the user
 * @returns {Promise<{success: boolean, data?: Array<{follower_address: string}>, error?: string}>}
 */
export const getFollowers = async (userAddress) => {
  try {
    console.log('🔄 followService.getFollowers for:', userAddress);

    if (!userAddress) {
      return { success: false, error: 'User address is required', data: [] };
    }

    const result = await SupabaseService.getFollowers(userAddress);

    if (result.success) {
      console.log('✅ getFollowers successful:', result.data.length, 'followers');
    } else {
      console.error('❌ getFollowers failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Error in followService.getFollowers:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Check if a user is following another user
 * @param {string} followerAddress - Address of the potential follower
 * @param {string} followedAddress - Address of the user being checked
 * @returns {Promise<{success: boolean, isFollowing?: boolean, error?: string}>}
 */
export const isFollowing = async (followerAddress, followedAddress) => {
  try {
    console.log('🔄 followService.isFollowing:', { followerAddress, followedAddress });

    if (!followerAddress || !followedAddress) {
      return { success: false, error: 'Both addresses are required', isFollowing: false };
    }

    const result = await SupabaseService.isFollowing(followerAddress, followedAddress);

    if (result.success) {
      console.log('✅ isFollowing check:', result.isFollowing);
    } else {
      console.error('❌ isFollowing check failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Error in followService.isFollowing:', error);
    return { success: false, error: error.message, isFollowing: false };
  }
};

/**
 * Get follow statistics for a user
 * @param {string} userAddress - Address of the user
 * @returns {Promise<{success: boolean, data?: {followersCount: number, followingCount: number}, error?: string}>}
 */
export const getFollowStats = async (userAddress) => {
  try {
    console.log('🔄 followService.getFollowStats for:', userAddress);

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
        data: { followersCount: 0, followingCount: 0 }
      };
    }

    // Get followers and following in parallel
    const [followersResult, followingResult] = await Promise.all([
      SupabaseService.getFollowers(userAddress),
      SupabaseService.getFollowing(userAddress)
    ]);

    if (followersResult.success && followingResult.success) {
      const stats = {
        followersCount: followersResult.data.length,
        followingCount: followingResult.data.length
      };
      console.log('✅ Follow stats:', stats);
      return { success: true, data: stats };
    } else {
      const error = followersResult.error || followingResult.error;
      console.error('❌ Failed to get follow stats:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('❌ Error in followService.getFollowStats:', error);
    return {
      success: false,
      error: error.message,
      data: { followersCount: 0, followingCount: 0 }
    };
  }
};

export default {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  isFollowing,
  getFollowStats
};
