// src/pages/Profile.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Edit, UserPlus, UserMinus, Grid, Trash2 } from 'lucide-react';
import { useSolanaApp } from '../contexts/SolanaAppContext';
import { useToast } from '../contexts/ToastContext';
import EditProfileModal from '../components/EditProfileModal';
import PostDetailModal from '../components/PostDetailModal';
import VideoCallButton from '../components/VideoCall/VideoCallButton';
import { SupabaseService } from '../services/supabaseService';
import { supabase } from '../supabaseClient';

const Profile = () => {
  const { account, user, getMediaUrl, loading: appLoading, refreshUser } = useSolanaApp();
  const { toast } = useToast();
  const { address } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // In Supabase the unique key is wallet_address
  const isOwnProfile = !address || address?.toLowerCase() === account?.toLowerCase();
  const profileAddress = (address || account || '').toLowerCase();

  const [profileData, setProfileData] = useState(null);
  const [userContents, setUserContents] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [userPurchases, setUserPurchases] = useState([]); // purchased blockchain_content_id

  const processedPostIdRef = useRef(null);

  useEffect(() => {
    if (profileAddress) loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileAddress, account, user?.wallet_address]);

  // Load user purchases once when account is available (only when viewing others)
  useEffect(() => {
    if (account && !isOwnProfile) loadUserPurchases();
    else setUserPurchases([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, isOwnProfile]);

  useEffect(() => {
    const handleRefreshFeed = () => {
      if (profileAddress) loadProfileData();
    };
    window.addEventListener('refreshFeed', handleRefreshFeed);
    return () => window.removeEventListener('refreshFeed', handleRefreshFeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileAddress]);

  // Scroll to post from notification
  useEffect(() => {
    const scrollToPostId = location.state?.scrollToPostId;

    if (scrollToPostId && processedPostIdRef.current !== scrollToPostId && !loading && userContents.length > 0) {
      processedPostIdRef.current = scrollToPostId;
      navigate(location.pathname, { replace: true, state: {} });

      const post = userContents.find((c) => c.id === scrollToPostId);
      if (post) {
        setTimeout(() => {
          const el = document.getElementById(`post-${scrollToPostId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-purple-400', 'ring-opacity-50');
            setTimeout(() => el.classList.remove('ring-4', 'ring-purple-400', 'ring-opacity-50'), 2000);
          } else {
            toast.error('Post not visible in profile');
          }
        }, 300);
      } else {
        toast.error('Post not found in profile');
      }
    }
  }, [location.state, userContents, loading, navigate, toast, location.pathname]);

  useEffect(() => {
    return () => {
      processedPostIdRef.current = null;
    };
  }, [location.pathname]);

  const loadUserPurchases = async () => {
    try {
      if (!account) {
        setUserPurchases([]);
        return;
      }

      const result = await SupabaseService.getUserPurchases(account.toLowerCase());
      if (result.success && result.data) {
        const purchasedIds = result.data.map((p) => p.blockchain_content_id).filter(Boolean);
        setUserPurchases(purchasedIds);
      } else {
        setUserPurchases([]);
      }
    } catch (e) {
      console.error('❌ Error loading user purchases:', e);
      setUserPurchases([]);
    }
  };

  const loadProfileData = async () => {
    if (!profileAddress) return;

    try {
      setLoading(true);

      // 1) Load user profile from Supabase
      let userData = null;

      try {
        const userFromDB = await SupabaseService.getUser(profileAddress);

        if (userFromDB.success && userFromDB.data) {
          userData = {
            username: userFromDB.data.username || 'Anonymous User',
            bio: userFromDB.data.bio || '',
            avatarUrl: userFromDB.data.avatar_url || null,
            isCreator: userFromDB.data.is_creator || false,
            followersCount: userFromDB.data.followers_count || 0,
            followingCount: userFromDB.data.following_count || 0,
            totalEarnings: '0'
          };
        } else if (isOwnProfile && user) {
          // fallback to context user (still supabase-driven)
          userData = {
            username: user.username || 'Anonymous User',
            bio: user.bio || '',
            avatarUrl: user.avatar_url || null,
            isCreator: user.is_creator || false,
            followersCount: user.followers_count || 0,
            followingCount: user.following_count || 0,
            totalEarnings: '0'
          };
        }
      } catch (e) {
        console.error('❌ [Profile] Error loading from Supabase:', e);
        if (isOwnProfile && user) {
          userData = {
            username: user.username || 'Anonymous User',
            bio: user.bio || '',
            avatarUrl: user.avatar_url || null,
            isCreator: user.is_creator || false,
            followersCount: user.followers_count || 0,
            followingCount: user.following_count || 0,
            totalEarnings: '0'
          };
        }
      }

      if (!userData) {
        setProfileData(null);
        setUserContents([]);
        return;
      }

      setProfileData({
        address: profileAddress,
        ...userData
      });

      // 2) Load posts by creator from Supabase
      try {
        console.log('🔍 Fetching posts for address:', profileAddress);
        const postsResult = await SupabaseService.getPostsByCreator(profileAddress);
        console.log('📦 Posts result:', postsResult.success ? `${postsResult.data.length} posts found` : 'Failed');
        if (postsResult.success) {
          const userPosts = postsResult.data.map((post) => ({
            id: post.id,
            creator: post.creator_address,
            creatorData: {
              username: post.username || `User${post.creator_address?.substring(0, 6) || 'Unknown'}`,
              profileImage: '',
              address: post.creator_address,
              isCreator: true
            },
            content: post.media_url || post.image_url,
            contentHash: post.content_hash,
            description: post.description || '',
            isPaid: post.is_paid || false,
            price: post.price ? post.price.toString() : '0',
            blockchainContentId: post.blockchain_content_id || null,
            timestamp: Math.floor(new Date(post.created_at).getTime() / 1000),
            purchaseCount: post.purchase_count || 0
          }));

          setUserContents(userPosts);
        } else {
          setUserContents([]);
        }
      } catch (e) {
        console.error('❌ Failed to load user posts:', e);
        setUserContents([]);
      }

      // 3) Following status (Supabase)
      if (!isOwnProfile && account) {
        try {
          const followResult = await SupabaseService.isFollowing(account.toLowerCase(), profileAddress);
          if (followResult.success) setIsFollowing(!!followResult.isFollowing);
        } catch (e) {
          console.log('Unable to check following status:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

 const handleFollow = async () => {
  try {
    if (!account) {
      toast.error('Connect your wallet first');
      return;
    }

    const willUnfollow = isFollowing; // stato prima del click

    const result = willUnfollow
      ? await SupabaseService.unfollowUser(account.toLowerCase(), profileAddress)
      : await SupabaseService.followUser(account.toLowerCase(), profileAddress);

    if (!result.success) {
      toast.error('Follow action failed: ' + (result.error || 'Unknown error'));
      return;
    }

    // aggiorna subito la UI
    setIsFollowing(!willUnfollow);

    // ricarica profilo per aggiornare counts (followers/following)
    await loadProfileData();

    toast.success(willUnfollow ? 'Unfollowed successfully' : 'Following!');
  } catch (e) {
    console.error('❌ Follow error:', e);
    toast.error('Follow action failed: ' + (e?.message || String(e)));
  }
};


  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleSaveProfile = async (newProfile) => {
    if (!account) {
      toast.error('Connect your wallet first');
      return;
    }

    if (!newProfile?.username || newProfile.username.trim() === '') {
      toast.error('Username is required');
      return;
    }

    try {
      // 1) optional avatar upload
      let avatarUrl = profileData?.avatarUrl || null;

      if (newProfile.avatarFile) {
        const fileExt = newProfile.avatarFile.name.split('.').pop();
        const fileName = `avatars/${account.toLowerCase()}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, newProfile.avatarFile, {
          upsert: true
        });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = urlData?.publicUrl || null;
      }

      // 2) update user row
      const result = await SupabaseService.createOrUpdateUser({
        wallet_address: account.toLowerCase(),
        username: newProfile.username.trim(),
        bio: newProfile.bio || null,
        avatar_url: avatarUrl
      });

      if (!result.success) throw new Error(result.error || 'Failed to update profile');

      setShowEditModal(false);
      await refreshUser();
      await loadProfileData();
      toast.success('Profile updated!');
    } catch (e) {
      console.error('Error updating profile:', e);
      toast.error(e?.message || 'Failed to update profile. Please try again.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      const deleteResult = await SupabaseService.deletePost(postId, profileAddress);
      if (!deleteResult.success) throw new Error(deleteResult.error);

      setUserContents((prev) => prev.filter((c) => c.id !== postId));
      window.dispatchEvent(new CustomEvent('refreshFeed'));
      toast.success('✅ Post deleted successfully!');
    } catch (e) {
      console.error('Error deleting post:', e);
      toast.error('Failed to delete post: ' + (e?.message || String(e)));
    }
  };

  if (loading || appLoading) {
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
              {profileData.avatarUrl && getMediaUrl(profileData.avatarUrl) ? (
                <img
                  src={getMediaUrl(profileData.avatarUrl)}
                  alt={`${profileData.username}'s avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className="text-pink-800 text-2xl font-bold w-full h-full flex items-center justify-center"
                style={{ display: profileData.avatarUrl && getMediaUrl(profileData.avatarUrl) ? 'none' : 'flex' }}
              >
                {profileData.username?.charAt(0)?.toUpperCase() || 'U'}
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

              {/* Earnings: off-chain not implemented; keep UI minimal */}
              {profileData.isCreator && (
                <div className="text-center">
                  <div className="font-bold text-gray-900">0</div>
                  <div className="text-gray-600">SOL Earned</div>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500 mt-2">{formatAddress(profileData.address)}</div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                disabled={appLoading}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                    isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                  <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                </button>
                <VideoCallButton creatorAddress={profileData.address} />
              </>
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
              <p className="text-gray-400">{isOwnProfile ? 'Share your first post!' : "This user hasn't posted anything yet."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {userContents.map((content) => {
                const isPaid = !!content.isPaid;
                const blockchainId = content.blockchainContentId;
                const hasPurchased = isOwnProfile || !isPaid || (blockchainId && userPurchases.includes(blockchainId));
                const isLocked = isPaid && !hasPurchased;

                return (
                  <div key={content.id} id={`post-${content.id}`} className="relative group transition-all">
                    {isOwnProfile && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePost(content.id);
                        }}
                        className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg z-50"
                        title="Delete post"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative"
                      onClick={() => navigate(`/post/${content.id}`)}
                    >
                      <img
                        src={content.content}
                        alt="Post content"
                        className={`w-full h-full object-cover transition-all ${isLocked ? 'blur-md scale-110' : ''}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400';
                          e.target.parentNode.appendChild(placeholder);
                        }}
                      />

                      {isLocked && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
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

                          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full shadow-xl">
                            <span className="text-white text-sm font-extrabold tracking-wide">PREMIUM</span>
                          </div>

                          <div className="mt-2 bg-black bg-opacity-60 px-3 py-1 rounded-full">
                            <span className="text-white text-xs font-semibold">{content.price} SOL</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PostDetailModal
        isOpen={showPostDetail}
        onClose={() => {
          setShowPostDetail(false);
          setSelectedPost(null);
        }}
        content={selectedPost}
      />

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={profileData}
        onSave={handleSaveProfile}
        loading={appLoading}
      />
    </div>
  );
};

export default Profile;
