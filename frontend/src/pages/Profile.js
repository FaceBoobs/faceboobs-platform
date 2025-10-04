// src/pages/Profile.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { Edit, UserPlus, UserMinus, Grid, Trash2 } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import EditProfileModal from '../components/EditProfileModal';
import SupabaseService from '../services/supabaseService';

const Profile = () => {
  const { contract, user, getMediaUrl, updateProfile, loading: web3Loading } = useWeb3();
  const { toast } = useToast();
  const { address } = useParams();
  const isOwnProfile = !address || address === user?.address;
  const profileAddress = address || user?.address;

  const [profileData, setProfileData] = useState(null);
  const [userContents, setUserContents] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (profileAddress && user) {
      loadProfileData();
    }
  }, [profileAddress, user, contract]);

  // Add a refresh mechanism that can be called from outside
  useEffect(() => {
    const handleRefreshFeed = () => {
      console.log('🔄 Profile refresh requested');
      if (profileAddress && user) {
        loadProfileData();
      }
    };

    // Listen for custom refresh events (can be triggered after post creation)
    window.addEventListener('refreshFeed', handleRefreshFeed);
    return () => window.removeEventListener('refreshFeed', handleRefreshFeed);
  }, [profileAddress, user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Load user profile data from blockchain (if available) or fallback to user data
      let userData;
      if (contract) {
        try {
          userData = await contract.getUser(profileAddress);
        } catch (error) {
          console.log('Contract not available, using current user data');
        }
      }

      // Use current user data as fallback or if blockchain is not available
      if (!userData && isOwnProfile && user) {
        userData = {
          username: user.username || 'Anonymous User',
          bio: user.bio || '',
          avatarHash: user.profileImage || '',
          isCreator: user.isCreator || false,
          followersCount: 0,
          followingCount: 0,
          totalEarnings: '0'
        };
      }

      if (userData) {
        setProfileData({
          address: profileAddress,
          username: userData.username,
          bio: userData.bio,
          avatarHash: userData.avatarHash,
          isCreator: userData.isCreator,
          followersCount: Number(userData.followersCount || 0),
          followingCount: Number(userData.followingCount || 0),
          totalEarnings: userData.totalEarnings || '0'
        });
      }

      // Load posts from Supabase using the new schema
      console.log('🔄 Loading user posts from Supabase...');
      const postsResult = await SupabaseService.getPostsByCreator(profileAddress);

      if (postsResult.success) {
        console.log(`📦 Found ${postsResult.data.length} posts for user ${profileAddress}`);

        // Convert Supabase posts to expected format
        const userPosts = postsResult.data.map(post => ({
          id: post.id,
          creator: post.creator_address,
          creatorData: {
            username: post.username || `User${post.creator_address?.substring(0, 6) || 'Unknown'}`,
            profileImage: '', // TODO: Add user profile image lookup
            address: post.creator_address,
            isCreator: true
          },
          content: post.image_url, // Image data from image_url field
          contentHash: post.content_hash,
          description: post.description || '',
          isPaid: post.is_paid || false,
          price: post.price ? post.price.toString() : '0',
          timestamp: Math.floor(new Date(post.created_at).getTime() / 1000),
          purchaseCount: post.purchase_count || 0
        }));

        console.log(`✅ Loaded ${userPosts.length} user posts from Supabase`);
        setUserContents(userPosts);
      } else {
        console.error('Error loading user posts:', postsResult.error);
        setUserContents([]);
      }

      // Load following status if available
      if (!isOwnProfile && user?.address && contract) {
        try {
          const following = await contract.isFollowing(user.address, profileAddress);
          setIsFollowing(following);
        } catch (error) {
          console.log('Unable to check following status');
        }
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const tx = isFollowing 
        ? await contract.unfollowUser(profileAddress)
        : await contract.followUser(profileAddress);
      await tx.wait();
      
      setIsFollowing(!isFollowing);
      await loadProfileData();
      
    } catch (error) {
      console.error('Follow error:', error);
      toast.error('Follow action failed: ' + error.message);
    }
  };

  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleSaveProfile = async (profileData) => {
    try {
      const result = await updateProfile(
        profileData.username,
        profileData.bio,
        profileData.avatarFile
      );

      if (result.success) {
        setShowEditModal(false);
        // Reload profile data to show updated information
        await loadProfileData();
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleDeletePost = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from Supabase
      const deleteResult = await SupabaseService.deletePost(contentId, profileAddress);

      if (deleteResult.success) {
        // Remove from UI
        setUserContents(prev => prev.filter(content => content.id !== contentId));

        // Trigger a refresh event for Home page if it's listening
        window.dispatchEvent(new CustomEvent('refreshFeed'));

        toast.success('✅ Post deleted successfully!');
        console.log(`🗑️ Deleted post ${contentId} from Supabase`);
      } else {
        throw new Error(deleteResult.error);
      }

    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post: ' + error.message);
    }
  };

  // Image Modal Component
  const ImageModal = ({ src, alt, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div className="relative max-w-4xl max-h-full">
          <img 
            src={src} 
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // Removed ProfileImageGrid - using MediaDisplay component instead

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile not found</h2>
        <p className="text-gray-600">This user doesn't exist or hasn't registered yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
              {profileData.avatarHash && getMediaUrl(profileData.avatarHash) ? (
                <img 
                  src={getMediaUrl(profileData.avatarHash)}
                  alt={`${profileData.username}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-pink-800 text-2xl font-bold">
                  {profileData.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {profileData.isCreator && (
              <div className="absolute -bottom-2 -right-2 bg-purple-500 text-white rounded-full p-1">
                <span className="text-xs">✨</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{profileData.username}</h1>
              {profileData.isCreator && (
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Creator
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-4">{profileData.bio}</p>

            <div className="flex space-x-6 text-sm">
              <div className="text-center">
                <div className="font-bold text-gray-900">{userContents.length}</div>
                <div className="text-gray-600">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{profileData.followersCount}</div>
                <div className="text-gray-600">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{profileData.followingCount}</div>
                <div className="text-gray-600">Following</div>
              </div>
              {profileData.isCreator && (
                <div className="text-center">
                  <div className="font-bold text-gray-900">
                    {ethers.formatEther(profileData.totalEarnings).slice(0, 6)}
                  </div>
                  <div className="text-gray-600">BNB Earned</div>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500 mt-2">
              {formatAddress(profileData.address)}
            </div>
          </div>

          <div className="flex space-x-3">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                disabled={web3Loading}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button className="flex-1 py-4 px-6 text-center font-medium text-blue-600 border-b-2 border-blue-600">
              <Grid size={20} className="inline mr-2" />
              Posts ({userContents.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {userContents.length === 0 ? (
            <div className="text-center py-12">
              <Grid size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No posts yet</h3>
              <p className="text-gray-400">
                {isOwnProfile ? 'Share your first post!' : 'This user hasn\'t posted anything yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {userContents.map((content) => (
                <div key={content.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={content.content}
                      alt="Post content"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(content.content)}
                    />
                  </div>
                  {/* Delete button for own profile */}
                  {isOwnProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost(content.id);
                      }}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Delete post"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal
        src={selectedImage}
        alt="Profile content"
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={profileData}
        onSave={handleSaveProfile}
        loading={web3Loading}
      />
    </div>
  );
};

export default Profile;