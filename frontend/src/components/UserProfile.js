import React from 'react';
import { User, Users, Heart, Star, Verified } from 'lucide-react';
import { ethers } from 'ethers';

const UserProfile = ({ userData, isOwnProfile = false, isFollowing = false, onFollow, onUnfollow }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEarnings = (earnings) => {
    return ethers.formatEther(earnings || 0);
  };

  const handleFollowToggle = () => {
    if (isFollowing) {
      onUnfollow && onUnfollow();
    } else {
      onFollow && onFollow();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      
      {/* Profile Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-6">
          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && (
          <div className="absolute top-4 right-6">
            <button
              onClick={handleFollowToggle}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        )}

        {/* User Info */}
        <div className="pt-12">
          <div className="flex items-center space-x-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {userData.username || 'Anonymous User'}
            </h1>
            {userData.isCreator && (
              <div className="flex items-center space-x-1">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-600">Creator</span>
              </div>
            )}
            {userData.verified && (
              <Verified className="h-5 w-5 text-blue-500" />
            )}
          </div>

          <p className="text-gray-600 text-sm mb-2">
            {formatAddress(userData.address)}
          </p>

          {userData.bio && (
            <p className="text-gray-700 mb-4">{userData.bio}</p>
          )}

          {/* Stats */}
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {userData.followersCount || 0}
                </span>
              </div>
              <span className="text-xs text-gray-500">Followers</span>
            </div>
            
            <div className="text-center">
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {userData.followingCount || 0}
                </span>
              </div>
              <span className="text-xs text-gray-500">Following</span>
            </div>

            {userData.isCreator && (
              <div className="text-center">
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-gray-900">
                    {formatEarnings(userData.totalEarnings)} BNB
                  </span>
                </div>
                <span className="text-xs text-gray-500">Earned</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;