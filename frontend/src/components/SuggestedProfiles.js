import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import SupabaseService from '../services/supabaseService';

const SuggestedProfiles = () => {
  const { user: currentUser, account, getMediaUrl } = useWeb3();
  const { toast } = useToast();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(new Set());

  // Load suggested profiles
  const loadSuggestedProfiles = async () => {
    try {
      setLoading(true);

      // Get all users from Supabase (excluding current user)
      const response = await SupabaseService.getAllUsers();

      if (response.success && response.data) {
        // Filter out current user
        const otherUsers = response.data.filter(user =>
          user.address !== account?.toLowerCase()
        );

        // Shuffle array and take first 3
        const shuffled = [...otherUsers].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        // Transform to match expected format
        const transformedUsers = selected.map(user => ({
          id: user.id,
          username: user.username || `User${user.address?.substring(0, 6)}`,
          walletAddress: user.address,
          avatarHash: user.avatar_hash,
          bio: user.bio || '',
          isCreator: user.is_creator || false,
          createdAt: user.created_at
        }));

        setSuggestedUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Error loading suggested profiles:', error);
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
    if (!currentUser || !account) {
      toast.error('Please connect your wallet to follow users');
      return;
    }

    try {
      setFollowLoading(prev => new Set([...prev, userToFollow.id]));

      const isCurrentlyFollowing = followingUsers.has(userToFollow.id);

      if (isCurrentlyFollowing) {
        // Unfollow logic (placeholder - implement when follow system is ready)
        setFollowingUsers(prev => {
          const updated = new Set(prev);
          updated.delete(userToFollow.id);
          return updated;
        });
        toast.success(`Unfollowed ${userToFollow.username}`);
      } else {
        // Follow logic (placeholder - implement when follow system is ready)
        setFollowingUsers(prev => new Set([...prev, userToFollow.id]));
        toast.success(`Following ${userToFollow.username}`);
      }

    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    } finally {
      setFollowLoading(prev => {
        const updated = new Set(prev);
        updated.delete(userToFollow.id);
        return updated;
      });
    }
  };

  // Load profiles on component mount
  useEffect(() => {
    loadSuggestedProfiles();
  }, [account]);

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
            <div key={user.id} className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
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

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
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
                onClick={() => handleFollow(user)}
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