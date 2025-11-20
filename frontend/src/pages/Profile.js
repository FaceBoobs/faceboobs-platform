// src/pages/Profile.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Edit, UserPlus, UserMinus, Grid, Trash2 } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import EditProfileModal from '../components/EditProfileModal';
import PostDetailModal from '../components/PostDetailModal';
import { SupabaseService } from '../services/supabaseService';

const Profile = () => {
  const { contract, account, user, getMediaUrl, updateProfile, loading: web3Loading } = useWeb3();
  const { toast } = useToast();
  const { address } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isOwnProfile = !address || address === user?.address;
  const profileAddress = address || user?.address;

  const [profileData, setProfileData] = useState(null);
  const [userContents, setUserContents] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userPurchases, setUserPurchases] = useState([]); // Array of purchased blockchain_content_id

  // Ref to track processed notification postId to prevent infinite loop
  const processedPostIdRef = useRef(null);

  useEffect(() => {
    if (profileAddress && user) {
      loadProfileData();
    }
  }, [profileAddress, user, contract]);

  // Load user purchases once when account is available
  useEffect(() => {
    if (account && !isOwnProfile) {
      loadUserPurchases();
    } else if (isOwnProfile) {
      // Own profile - all posts are accessible, no need to load purchases
      setUserPurchases([]);
    }
  }, [account, isOwnProfile]);

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

  // Scroll to post from notification when location state has scrollToPostId
  useEffect(() => {
    const scrollToPostId = location.state?.scrollToPostId;

    // Only process if:
    // 1. We have a scrollToPostId
    // 2. We haven't attempted scroll for this postId yet
    // 3. Posts are loaded
    if (scrollToPostId && processedPostIdRef.current !== scrollToPostId && !loading && userContents.length > 0) {
      console.log('📬 Processing notification click for post in profile:', scrollToPostId);

      // Mark as processed IMMEDIATELY to prevent re-entry
      processedPostIdRef.current = scrollToPostId;

      // Clear the state IMMEDIATELY to prevent loop
      navigate(location.pathname, { replace: true, state: {} });

      // Try to find the post in profile
      const post = userContents.find(c => c.id === scrollToPostId);

      if (post) {
        console.log('✅ Post found in profile, scrolling to it:', post.id);

        // Wait for DOM to update, then scroll
        setTimeout(() => {
          const postElement = document.getElementById(`post-${scrollToPostId}`);

          if (postElement) {
            console.log('🎯 Found post element, scrolling...');
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Optional: Add flash/highlight animation
            postElement.classList.add('ring-4', 'ring-purple-400', 'ring-opacity-50');
            setTimeout(() => {
              postElement.classList.remove('ring-4', 'ring-purple-400', 'ring-opacity-50');
            }, 2000);
          } else {
            console.warn('⚠️ Post element not found in DOM:', `post-${scrollToPostId}`);
            toast.error('Post not visible in profile');
          }
        }, 300);
      } else {
        console.log('❌ Post not in profile:', scrollToPostId);
        toast.error('Post not found in profile');
      }
    }
  }, [location.state, userContents, loading, navigate, toast, location.pathname]);

  // Reset processed postId when navigating away from profile
  useEffect(() => {
    return () => {
      processedPostIdRef.current = null;
    };
  }, [location.pathname]);

  const loadUserPurchases = async () => {
    if (!account) {
      setUserPurchases([]);
      return;
    }

    try {
      console.log('🔐 Loading user purchases for:', account);

      // Get all posts purchased by the current user
      const result = await SupabaseService.getUserPurchases(account);

      if (result.success && result.data) {
        // Extract blockchain_content_id from purchases
        const purchasedIds = result.data
          .map(purchase => purchase.blockchain_content_id)
          .filter(id => id); // Remove null/undefined

        setUserPurchases(purchasedIds);
        console.log(`✅ Loaded ${purchasedIds.length} purchases:`, purchasedIds);
      } else {
        console.log('No purchases found or error:', result.error);
        setUserPurchases([]);
      }
    } catch (error) {
      console.error('❌ Error loading user purchases:', error);
      setUserPurchases([]); // Fallback to empty array (all paid posts locked)
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('🔵 [Profile] Loading profile for address:', profileAddress);
      console.log('🔵 [Profile] Is own profile:', isOwnProfile);

      // ALWAYS load from Supabase first (primary source of truth)
      let userData = null;

      try {
        console.log('🔍 [Profile] Querying Supabase for user:', profileAddress);
        const userFromDB = await SupabaseService.getUser(profileAddress);

        console.log('📬 [Profile] Supabase query result:', {
          success: userFromDB.success,
          hasData: !!userFromDB.data,
          error: userFromDB.error
        });

        if (userFromDB.success && userFromDB.data) {
          console.log('✅ [Profile] User found in Supabase:', userFromDB.data);

          userData = {
            username: userFromDB.data.username || 'Anonymous User',
            bio: userFromDB.data.bio || '',
            avatarHash: userFromDB.data.avatar_url || userFromDB.data.avatar_hash || '',
            isCreator: userFromDB.data.is_creator || false,
            followersCount: userFromDB.data.followers_count || 0,
            followingCount: userFromDB.data.following_count || 0,
            totalEarnings: '0' // TODO: load from blockchain or Supabase
          };
          console.log('🖼️ [Profile] Avatar URL loaded:', userData.avatarHash);
        } else {
          console.warn('⚠️ [Profile] User not found in Supabase');

          // Fallback: if it's own profile and we have cached user data
          if (isOwnProfile && user) {
            console.log('🔄 [Profile] Using fallback for own profile from context');
            userData = {
              username: user.username || 'Anonymous User',
              bio: user.bio || '',
              avatarHash: user.avatarHash || '',
              isCreator: user.isCreator || false,
              followersCount: 0,
              followingCount: 0,
              totalEarnings: '0'
            };
          }
        }
      } catch (error) {
        console.error('❌ [Profile] Error loading from Supabase:', error);

        // Fallback for own profile
        if (isOwnProfile && user) {
          console.log('🔄 [Profile] Using fallback after error');
          userData = {
            username: user.username || 'Anonymous User',
            bio: user.bio || '',
            avatarHash: user.avatarHash || '',
            isCreator: user.isCreator || false,
            followersCount: 0,
            followingCount: 0,
            totalEarnings: '0'
          };
        }
      }

      // If still no userData, profile not found
      if (!userData) {
        console.error('❌ [Profile] No user data available - profile not found');
        setProfileData(null);
        setLoading(false);
        return;
      }

      // Set profile data
      console.log('✅ [Profile] Setting profile data:', userData);
      setProfileData({
        address: profileAddress,
        ...userData
      });

      // Load posts from Supabase using the new schema
      console.log('🔄 Loading user posts from Supabase...');

      try {
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
            blockchainContentId: post.blockchain_content_id || null,
            timestamp: Math.floor(new Date(post.created_at).getTime() / 1000),
            purchaseCount: post.purchase_count || 0
          }));

          console.log(`✅ Loaded ${userPosts.length} user posts from Supabase`);
          setUserContents(userPosts);
        } else {
          console.error('Error loading user posts:', postsResult.error);
          setUserContents([]);
        }
      } catch (postsError) {
        console.error('❌ Failed to load user posts:', postsError);
        setUserContents([]);
      }

      // Load following status from Supabase
      if (!isOwnProfile && user?.address) {
        try {
          console.log('🔍 Checking if following:', user.address, '->', profileAddress);
          const followResult = await SupabaseService.isFollowing(user.address, profileAddress);
          if (followResult.success) {
            setIsFollowing(followResult.isFollowing);
            console.log('✅ Following status:', followResult.isFollowing);
          }
        } catch (error) {
          console.log('Unable to check following status:', error);
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
      console.log('🔄 Follow action:', isFollowing ? 'UNFOLLOW' : 'FOLLOW');
      console.log('   Current user:', user.address);
      console.log('   Target user:', profileAddress);

      // Use Supabase ONLY (no blockchain call)
      const result = isFollowing
        ? await SupabaseService.unfollowUser(user.address, profileAddress)
        : await SupabaseService.followUser(user.address, profileAddress);

      if (result.success) {
        console.log('✅ Follow action successful:', result.action);
        setIsFollowing(!isFollowing);
        await loadProfileData();
        toast.success(isFollowing ? 'Unfollowed successfully' : 'Following!');
      } else {
        console.error('❌ Follow action failed:', result.error);
        toast.error('Follow action failed: ' + result.error);
      }

    } catch (error) {
      console.error('❌ Follow error:', error);
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

  // Removed old ImageModal component - now using PostDetailModal for consistency

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
    <div className="max-w-4xl mx-auto px-0 md:px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
              {profileData.avatarHash && getMediaUrl(profileData.avatarHash) ? (
                <img
                  src={getMediaUrl(profileData.avatarHash)}
                  alt={`${profileData.username}'s avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('❌ Failed to load avatar image:', getMediaUrl(profileData.avatarHash));
                    // Fallback to initial letter on error
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className="text-pink-800 text-2xl font-bold w-full h-full flex items-center justify-center"
                style={{ display: profileData.avatarHash && getMediaUrl(profileData.avatarHash) ? 'none' : 'flex' }}
              >
                {profileData.username.charAt(0).toUpperCase()}
              </span>
            </div>
            {profileData.isCreator && (
              <div className="absolute -bottom-2 -right-2 bg-purple-500 text-white rounded-full p-1">
                <span className="text-xs">✨</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-2 md:mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{profileData.username}</h1>
              {profileData.isCreator && (
                <span className="bg-purple-100 text-purple-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium mt-1 md:mt-0 w-fit">
                  Creator
                </span>
              )}
            </div>

            <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">{profileData.bio}</p>

            <div className="flex space-x-4 md:space-x-6 text-xs md:text-sm">
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

        <div className="p-2 md:p-6">
          {userContents.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Grid size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-500 mb-2">No posts yet</h3>
              <p className="text-gray-400">
                {isOwnProfile ? 'Share your first post!' : 'This user hasn\'t posted anything yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {userContents.map((content) => {
                // Check if post is paid and NOT purchased
                const isPaid = content.isPaid || false;
                const blockchainId = content.blockchainContentId;
                const hasPurchased = isOwnProfile || !isPaid || (blockchainId && userPurchases.includes(blockchainId));
                const isLocked = isPaid && !hasPurchased;

                // Debug log for first few posts
                if (content.id <= 5 || isLocked) {
                  console.log(`Post ${content.id}:`, {
                    isPaid,
                    blockchainId,
                    isOwnProfile,
                    userPurchasesCount: userPurchases.length,
                    hasPurchased,
                    isLocked
                  });
                }

                return (
                  <div key={content.id} id={`post-${content.id}`} className="relative group transition-all">
                    <div
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative"
                      onClick={() => {
                        navigate(`/post/${content.id}`);
                      }}
                    >
                      {/* Always show image, apply blur if locked */}
                      <img
                        src={content.content}
                        alt="Post content"
                        className={`w-full h-full object-cover transition-all ${
                          isLocked ? 'blur-md scale-110' : ''
                        }`}
                        onError={(e) => {
                          // Fallback to placeholder on error
                          e.target.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400';
                          e.target.parentNode.appendChild(placeholder);
                        }}
                      />

                      {/* Lock overlay for paid content not purchased */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
                          {/* Lock icon with background */}
                          <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-full p-4 mb-3 shadow-lg">
                            <svg
                              className="w-10 h-10 text-white drop-shadow-lg"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                          {/* Premium badge - Purple/Pink gradient to match Buy button */}
                          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full shadow-xl">
                            <span className="text-white text-sm font-extrabold tracking-wide">
                              PREMIUM
                            </span>
                          </div>
                          {/* Price */}
                          <div className="mt-2 bg-black bg-opacity-60 px-3 py-1 rounded-full">
                            <span className="text-white text-xs font-semibold">
                              {content.price} BNB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete button for own profile */}
                    {isOwnProfile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(content.id);
                        }}
                        className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20"
                        title="Delete post"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Post Detail Modal */}
      <PostDetailModal
        isOpen={showPostDetail}
        onClose={() => {
          setShowPostDetail(false);
          setSelectedPost(null);
        }}
        content={selectedPost}
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