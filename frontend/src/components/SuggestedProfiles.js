import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import { followUser, unfollowUser, getFollowing } from '../services/followService';

const SuggestedProfiles = () => {
  const { user: currentUser, account, getMediaUrl } = useWeb3();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(new Set());

  // Load suggested profiles
  const loadSuggestedProfiles = async () => {
    try {
      setLoading(true);
      console.log('🔍 [SuggestedProfiles] Loading users from Supabase...');

      // Get all users from Supabase (excluding current user)
      const response = await SupabaseService.getAllUsers();

      console.log('📬 [SuggestedProfiles] Supabase response:', {
        success: response.success,
        dataCount: response.data?.length || 0
      });

      if (response.success && response.data) {
        console.log('📊 [SuggestedProfiles] Sample raw user from DB:', response.data[0]);
        console.log('📊 [SuggestedProfiles] Available fields:', Object.keys(response.data[0] || {}));

        // Filter out current user - try both 'address' and 'wallet_address' fields
        const otherUsers = response.data.filter(user => {
          const userAddr = user.wallet_address || user.address;
          return userAddr?.toLowerCase() !== account?.toLowerCase();
        });

        console.log('👥 [SuggestedProfiles] Other users count:', otherUsers.length);

        // Shuffle array and take first 3
        const shuffled = [...otherUsers].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        // Transform to match expected format
        const transformedUsers = selected.map(user => {
          // Handle both possible field names: wallet_address or address
          const walletAddr = user.wallet_address || user.address;

          console.log('📝 [SuggestedProfiles] Transforming user:', {
            id: user.id,
            username: user.username,
            wallet_address: user.wallet_address,
            address: user.address,
            chosen: walletAddr
          });

          return {
            id: user.id,
            username: user.username || `User${walletAddr?.substring(0, 6)}`,
            walletAddress: walletAddr, // Use wallet_address or address
            avatarHash: user.avatar_hash,
            bio: user.bio || '',
            isCreator: user.is_creator || false,
            createdAt: user.created_at
          };
        });

        console.log('✅ [SuggestedProfiles] Transformed users:', transformedUsers);
        console.log('🔍 [SuggestedProfiles] Check walletAddress field:',
          transformedUsers.map(u => ({ username: u.username, walletAddress: u.walletAddress }))
        );

        setSuggestedUsers(transformedUsers);
      }
    } catch (error) {
      console.error('❌ [SuggestedProfiles] Error loading suggested profiles:', error);
      toast.error('Failed to load suggested profiles');
    } finally {
      setLoading(false);
    }
  };

  // Refresh suggestions
  const refreshSuggestions = () => {
    loadSuggestedProfiles();
  };

  // Handle follow/unfollow
  const handleFollow = async (userToFollow) => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  SuggestedProfiles.handleFollow CLICK    ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('📊 Current state:');
    console.log('   - currentUser:', currentUser?.username, currentUser?.address);
    console.log('   - account:', account);
    console.log('   - userToFollow.username:', userToFollow.username);
    console.log('   - userToFollow.walletAddress:', userToFollow.walletAddress);
    console.log('   - userToFollow.id:', userToFollow.id);
    console.log('   - userToFollow FULL OBJECT:', userToFollow);

    // Validation 1: User must be logged in
    if (!currentUser || !account) {
      console.error('❌ Validation failed: No current user or account');
      toast.error('Please connect your wallet to follow users');
      return;
    }

    // Validation 2: Target user must have a wallet address
    if (!userToFollow.walletAddress) {
      console.error('❌ CRITICAL ERROR: userToFollow.walletAddress is undefined!');
      console.error('   Full userToFollow object:', JSON.stringify(userToFollow, null, 2));
      toast.error('Cannot follow: User wallet address is missing');
      return;
    }

    // Validation 3: Cannot follow yourself
    if (userToFollow.walletAddress.toLowerCase() === account.toLowerCase()) {
      console.error('❌ Validation failed: Cannot follow yourself');
      toast.error('You cannot follow yourself');
      return;
    }

    console.log('✅ All validations passed');

    try {
      setFollowLoading(prev => new Set([...prev, userToFollow.id]));

      const isCurrentlyFollowing = followingUsers.has(userToFollow.id);
      console.log('📊 isCurrentlyFollowing:', isCurrentlyFollowing);

      if (isCurrentlyFollowing) {
        // Unfollow
        console.log('🔄 Calling unfollowUser...');
        console.log('   - From:', account);
        console.log('   - To:', userToFollow.walletAddress);

        const result = await unfollowUser(account, userToFollow.walletAddress);

        console.log('📬 unfollowUser result:', result);

        if (result.success) {
          setFollowingUsers(prev => {
            const updated = new Set(prev);
            updated.delete(userToFollow.id);
            return updated;
          });
          toast.success(`Unfollowed ${userToFollow.username}`);
          console.log('✅ Unfollow UI updated');
        } else {
          console.error('❌ Unfollow failed:', result.error);
          toast.error(`Failed to unfollow: ${result.error}`);
        }
      } else {
        // Follow
        console.log('🔄 Calling followUser...');
        console.log('   - From (follower):', account);
        console.log('   - To (followed):', userToFollow.walletAddress);

        const result = await followUser(account, userToFollow.walletAddress);

        console.log('📬 followUser result:', result);

        if (result.success) {
          setFollowingUsers(prev => new Set([...prev, userToFollow.id]));
          toast.success(`Following ${userToFollow.username}`);
          console.log('✅ Follow UI updated');

          // Trigger refresh event so Home page updates
          window.dispatchEvent(new CustomEvent('refreshFeed'));
          console.log('📡 Sent refreshFeed event');
        } else {
          console.error('❌ Follow failed:', result.error);
          toast.error(`Failed to follow: ${result.error}`);
        }
      }

    } catch (error) {
      console.error('❌ CATCH Error in handleFollow:');
      console.error('   - Message:', error.message);
      console.error('   - Stack:', error.stack);
      toast.error('Failed to follow user: ' + error.message);
    } finally {
      setFollowLoading(prev => {
        const updated = new Set(prev);
        updated.delete(userToFollow.id);
        return updated;
      });
      console.log('╚══════════════════════════════════════════╝');
    }
  };

  // Load current user's following list
  const loadFollowingStatus = async () => {
    if (!account) return;

    try {
      console.log('🔍 [SuggestedProfiles] Loading following status for:', account);
      const result = await getFollowing(account);

      if (result.success && result.data) {
        console.log('✅ [SuggestedProfiles] Following data:', result.data);
        // result.data is array of addresses being followed
        const followedAddresses = new Set(result.data);

        // Map addresses to user IDs
        const followedIds = new Set();
        suggestedUsers.forEach(user => {
          if (followedAddresses.has(user.walletAddress?.toLowerCase())) {
            followedIds.add(user.id);
          }
        });

        setFollowingUsers(followedIds);
        console.log('✅ [SuggestedProfiles] Following IDs set:', Array.from(followedIds));
      }
    } catch (error) {
      console.error('❌ [SuggestedProfiles] Error loading following status:', error);
    }
  };

  // Load profiles on component mount
  useEffect(() => {
    loadSuggestedProfiles();
  }, [account]);

  // Load following status when suggested users change
  useEffect(() => {
    if (suggestedUsers.length > 0) {
      loadFollowingStatus();
    }
  }, [suggestedUsers, account]);

  if (!currentUser || loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Suggested for you</h3>
        <button
          onClick={refreshSuggestions}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          title="Refresh suggestions"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Suggested Users List */}
      <div className="space-y-3">
        {suggestedUsers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <UserPlus size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No suggestions available</p>
          </div>
        ) : (
          suggestedUsers.map(user => (
            <div key={user.id} className="flex items-center space-x-3 group">
              {/* Avatar - Clickable */}
              <div
                onClick={() => navigate(`/profile/${user.walletAddress}`)}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
              >
                {user.avatarHash && getMediaUrl(user.avatarHash) ? (
                  <img
                    src={getMediaUrl(user.avatarHash)}
                    alt={`${user.username}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* User Info - Clickable */}
              <div
                onClick={() => navigate(`/profile/${user.walletAddress}`)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center space-x-1">
                  <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {user.username}
                  </h4>
                  {user.isCreator && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                      Creator
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {user.bio || `${user.walletAddress?.substring(0, 6)}...${user.walletAddress?.substring(-4)}`}
                </p>
              </div>

              {/* Follow Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent navigation when clicking follow button
                  handleFollow(user);
                }}
                disabled={followLoading.has(user.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  followingUsers.has(user.id)
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading.has(user.id) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : followingUsers.has(user.id) ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* See All Link */}
      {suggestedUsers.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={refreshSuggestions}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            See more suggestions
          </button>
        </div>
      )}
    </div>
  );
};

export default SuggestedProfiles;