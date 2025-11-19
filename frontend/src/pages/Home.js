// src/pages/Home.js
import React, { useState, useEffect, useRef } from 'react';
import { Lock, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { useLikes } from '../contexts/LikesContext';
import { useComments } from '../contexts/CommentsContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { SupabaseService } from '../services/supabaseService';
import { getFollowing } from '../services/followService';
import LikeButton from '../components/LikeButton';
import CommentButton from '../components/CommentButton';
import ShareButton from '../components/ShareButton';
import PostDetailModal from '../components/PostDetailModal';
import SuggestedProfiles from '../components/SuggestedProfiles';

const Home = () => {
  const { contract, user, account, loading: web3Loading, becomeCreator } = useWeb3();
  const { initializeMultipleLikes } = useLikes();
  const { initializeMultipleComments } = useComments();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [contents, setContents] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [followingAddresses, setFollowingAddresses] = useState([]);
  const [hasFollows, setHasFollows] = useState(true);

  // Ref to track processed notification postId to prevent infinite loop
  const processedPostIdRef = useRef(null);
  const scrollAttemptedRef = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!web3Loading && !account) {
      console.log('🔒 Not authenticated, redirecting to home with prompt');
      toast.error('Please connect your wallet to access the feed');
    }
  }, [account, web3Loading, navigate, toast]);

  useEffect(() => {
    if (account) {
      loadFollowingAndFeed();
      loadStoriesData();
    }
  }, [account]);

  // Listen for refresh events from post creation
  useEffect(() => {
    const handleRefreshFeed = () => {
      console.log('Refresh feed requested');
      if (account) {
        loadFollowingAndFeed();
        loadStoriesData();
      }
    };

    window.addEventListener('refreshFeed', handleRefreshFeed);
    return () => window.removeEventListener('refreshFeed', handleRefreshFeed);
  }, [account]);

  // Scroll to post from notification when location state has scrollToPostId
  useEffect(() => {
    const scrollToPostId = location.state?.scrollToPostId;

    // Only process if:
    // 1. We have a scrollToPostId
    // 2. We haven't attempted scroll for this postId yet
    // 3. We have loaded contents
    if (scrollToPostId && processedPostIdRef.current !== scrollToPostId && !loading && contents.length > 0) {
      console.log('📬 Processing notification click for post:', scrollToPostId);

      // Mark as processed IMMEDIATELY to prevent re-entry
      processedPostIdRef.current = scrollToPostId;
      scrollAttemptedRef.current = false;

      // Clear the state IMMEDIATELY to prevent loop
      navigate(location.pathname, { replace: true, state: {} });

      // Try to find the post in current feed
      const post = contents.find(c => c.id === scrollToPostId);

      if (post) {
        console.log('✅ Post found in feed, scrolling to it:', post.id);

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
            toast.error('Post not visible in feed');
          }
        }, 300);
      } else {
        console.log('❌ Post not in feed:', scrollToPostId);
        toast.error('Post not in your feed');
      }
    }
  }, [location.state, contents, loading, navigate, toast]);

  // Reset processed postId when navigating away from home
  useEffect(() => {
    return () => {
      processedPostIdRef.current = null;
    };
  }, [location.pathname]);

  // Combined function that loads following list AND immediately loads posts
  const loadFollowingAndFeed = async () => {
    try {
      setLoading(true);
      console.log('🔵 [Home] Loading feed for:', account);

      if (!account) {
        console.log('⚠️ [Home] Account not available yet');
        setLoading(false);
        return;
      }

      // 1. Load following list
      console.log('🔄 [Home] Calling getFollowing from followService...');
      const followingResult = await getFollowing(account);

      if (!followingResult.success || !followingResult.data) {
        console.error('❌ [Home] Failed to load following list:', followingResult.error);
        setFollowingAddresses([]);
        setHasFollows(false);
        setContents([]);
        setLoading(false);
        return;
      }

      const addresses = followingResult.data;
      console.log('✅ [Home] Following addresses loaded:', addresses.length, 'addresses');
      console.log('📋 [Home] Following addresses:', addresses);

      setFollowingAddresses(addresses);
      setHasFollows(addresses.length > 0);

      // If user doesn't follow anyone, show empty feed
      if (addresses.length === 0) {
        console.log('📭 User is not following anyone');
        setContents([]);
        setLoading(false);
        return;
      }

      // 2. Load posts from followed users IMMEDIATELY
      console.log('🔵 [Home] Loading posts from followed creators...');

      const result = await SupabaseService.getPostsByCreators(addresses);

      if (!result.success) {
        console.error('❌ Error loading posts:', result.error);
        toast.error('Failed to load posts: ' + result.error);
        setContents([]);
        setLoading(false);
        return;
      }

      console.log(`✅ Loaded ${result.data.length} posts from followed creators`);

      // Convert Supabase posts to expected format
      const contentData = result.data.map(post => ({
        id: post.id,
        blockchainContentId: post.blockchain_content_id || null, // ID from blockchain contract
        creator: post.creator_address,
        creatorData: {
          username: post.username || `User${post.creator_address?.substring(0, 6) || 'Unknown'}`,
          profileImage: '', // TODO: Add user profile image lookup
          address: post.creator_address,
          isCreator: true
        },
        content: post.image_url, // base64 image data from image_url field
        description: post.description || '',
        isPaid: post.is_paid || false,
        price: post.price ? post.price.toString() : '0',
        timestamp: Math.floor(new Date(post.created_at).getTime() / 1000),
        likes: post.likes || 0,
        comments: [],
        purchaseCount: post.purchase_count || 0
      }));

      setContents(contentData);

      // Initialize likes and comments
      if (contentData.length > 0 && account) {
        const contentIds = contentData.map(content => content.id.toString());
        await initializeMultipleLikes(contentIds);
        await initializeMultipleComments(contentIds);
      }

      // Optionally sync with blockchain if contract is available
      if (contract && contract.getFollowing) {
        try {
          const blockchainFollowing = await contract.getFollowing(account);
          console.log('🔗 [Home] Blockchain following:', blockchainFollowing.length, 'addresses');

          // You can compare and sync here if needed
          if (blockchainFollowing.length !== addresses.length) {
            console.warn('⚠️ [Home] Blockchain and database following lists differ!');
          }
        } catch (blockchainError) {
          console.warn('⚠️ [Home] Blockchain sync failed (using database only):', blockchainError);
        }
      }

    } catch (error) {
      console.error('❌ [Home] Error loading feed:', error);
      console.error('❌ [Home] Error details:', error.message, error.stack);
      setFollowingAddresses([]);
      setHasFollows(false);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStoriesData = async () => {
    try {
      console.log('Loading stories from followed users...');

      // Get stories only from users the current user follows
      const result = await SupabaseService.getFollowingStories(account);

      if (!result.success) {
        console.error('Error loading stories:', result.error);
        return;
      }

      if (result.noFollows) {
        console.log('📭 Not following anyone, no stories to show');
        setStories([]);
        return;
      }

      console.log(`Loaded ${result.data.length} stories from followed users`);

      // Convert to expected format
      const storiesData = result.data.map(story => ({
        id: story.id,
        creator: story.creator_address,
        creatorData: {
          username: story.username || `User${story.creator_address?.substring(0, 6) || 'Unknown'}`,
          profileImage: '', // TODO: Add user profile image lookup
          address: story.creator_address,
          isCreator: true
        },
        content: story.image_url, // base64 image data from image_url field
        timestamp: Math.floor(new Date(story.created_at).getTime() / 1000),
        expiryTime: Math.floor(new Date(story.expires_at).getTime() / 1000)
      }));

      setStories(storiesData);

    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const deletePost = async (postId) => {
    try {
      const result = await SupabaseService.deletePost(postId, account);

      if (!result.success) {
        console.error('Error deleting post:', result.error);
        toast.error('Failed to delete post: ' + result.error);
        return;
      }

      // Remove from local state
      setContents(prev => prev.filter(post => post.id !== postId));
      toast.success('✅ Post deleted successfully');

    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const buyContent = async (contentId, price, blockchainContentId) => {
    console.log('🛒 Starting content purchase...', {
      supabaseId: contentId,
      blockchainContentId,
      price
    });

    if (!contract) {
      toast.error('Contract not available. Please connect your wallet.');
      return;
    }

    if (!account) {
      toast.error('Please connect your wallet first.');
      return;
    }

    // Check if blockchain content ID exists
    if (!blockchainContentId) {
      console.error('❌ No blockchain content ID found for this post');
      toast.error('This post is not registered on blockchain. Cannot purchase.');
      return;
    }

    try {
      // Convert price from BNB to Wei
      // price comes as string like "9.996" (in BNB) from database
      const priceInWei = ethers.parseEther(price.toString());
      console.log('💰 Price conversion:', {
        priceInBNB: price,
        priceInWei: priceInWei.toString()
      });

      // Step 1: Call smart contract to purchase content
      console.log('📞 Calling smart contract buyContent with blockchain ID:', blockchainContentId);
      toast.info('🔐 Opening MetaMask for transaction confirmation...');

      const tx = await contract.buyContent(blockchainContentId, {
        value: priceInWei, // Pass Wei value to contract
        gasLimit: 300000 // Set a reasonable gas limit
      });

      console.log('⏳ Transaction sent:', tx.hash);
      toast.info('⏳ Transaction sent! Waiting for confirmation...');

      // Step 2: Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);

      // Step 3: Save purchase to Supabase
      console.log('💾 Saving purchase to Supabase...');
      const purchaseData = {
        user_address: account.toLowerCase(),
        post_id: parseInt(contentId), // Save Supabase post ID
        amount: price.toString(), // Save original price in BNB
        transaction_hash: receipt.hash,
        created_at: new Date().toISOString()
      };

      const saveResult = await SupabaseService.createPurchase(purchaseData);

      if (!saveResult.success) {
        console.error('⚠️ Failed to save purchase to Supabase:', saveResult.error);
        // Still show success since blockchain tx succeeded
        toast.warning('Content purchased but failed to sync with database');
      } else {
        console.log('✅ Purchase saved to Supabase:', saveResult.data);
      }

      // Create notification for the content creator
      try {
        // Find the post to get creator info
        const post = contents.find(p => p.id === parseInt(contentId));
        if (post && post.creator_address) {
          // Don't create notification if user purchases their own content
          if (post.creator_address.toLowerCase() !== account.toLowerCase()) {
            const notificationData = {
              user_address: post.creator_address.toLowerCase(),
              type: 'purchase',
              title: 'New Purchase',
              message: `${user?.username || `User${account.substring(0, 6)}`} purchased your content for ${price} BNB`,
              post_id: parseInt(contentId),
              from_user_address: account.toLowerCase(),
              from_username: user?.username || `User${account.substring(0, 6)}`,
              from_avatar_url: user?.profileImage || user?.avatarHash || null
            };

            await SupabaseService.createNotification(notificationData);
            console.log('✅ Purchase notification created');
          }
        }
      } catch (notifError) {
        console.error('Failed to create purchase notification:', notifError);
        // Don't fail the purchase if notification fails
      }

      // Step 4: Show success message
      toast.success('🎉 Content purchased successfully!');

      // Step 5: Reload feed to show unlocked content
      await loadFollowingAndFeed();

    } catch (error) {
      console.error('❌ Purchase failed:', error);

      // Handle specific error cases
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient BNB balance');
      } else if (error.message?.includes('user rejected')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Purchase failed: ' + (error.reason || error.message));
      }
    }
  };

  const checkContentAccess = async (contentId) => {
    if (!account) return false;

    try {
      const result = await SupabaseService.checkContentAccess(account, contentId);
      return result.success ? result.hasAccess : false;
    } catch (error) {
      console.error('Error checking content access:', error);
      return false;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatTimeRemaining = (expiryTime) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiryTime - now;

    if (remaining <= 0) return 'Expired';
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m left`;
    return `${Math.floor(remaining / 3600)}h left`;
  };

  const handleStoryClick = (story, index) => {
    setSelectedStory(story);
    setCurrentStoryIndex(index);
    setShowStoryViewer(true);
  };

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setSelectedStory(stories[nextIndex]);
    } else {
      setShowStoryViewer(false);
      setSelectedStory(null);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(prevIndex);
      setSelectedStory(stories[prevIndex]);
    }
  };

  const StoriesCarousel = () => {
    if (stories.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {/* Add Story Button */}
          {user?.isCreator && (
            <div 
              className="flex-shrink-0 text-center cursor-pointer"
              onClick={() => navigate('/create-post')}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                <Plus size={24} className="text-pink-800" />
              </div>
              <p className="text-xs mt-1 text-gray-600 max-w-16 truncate">Your Story</p>
            </div>
          )}
          
          {/* Stories */}
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="flex-shrink-0 text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => handleStoryClick(story, index)}
            >
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-white rounded-full p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img 
                      src={story.content}
                      alt={`${story.creatorData.username}'s story`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">
                  {formatTimeRemaining(story.expiryTime)}
                </div>
              </div>
              <p className="text-xs mt-1 text-gray-600 max-w-16 truncate">
                {story.creatorData.username}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ContentCard = ({ content }) => {
    const [hasAccess, setHasAccess] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
      if (!content?.id) return;
      
      const loadAccess = async () => {
        const access = await checkContentAccess(content.id);
        setHasAccess(access);
      };
      loadAccess();
    }, [content]);

    if (!content?.id || !content?.creatorData) {
      console.warn('Invalid content object:', content);
      return null;
    }

    const handlePurchase = async () => {
      setPurchasing(true);
      await buyContent(content.id, content.price, content.blockchainContentId);
      // After successful purchase, reload access state
      const access = await checkContentAccess(content.id);
      setHasAccess(access);
      setPurchasing(false);
    };

    const handleDeleteContent = () => {
      if (window.confirm('Are you sure you want to delete this post?')) {
        deletePost(content.id);
        setShowMenu(false);
      }
    };

    const isOwnPost = account && content.creator === account;

    return (
      <div id={`post-${content.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
              {content.creatorData.profileImage ? (
                <img 
                  src={content.creatorData.profileImage}
                  alt={`${content.creatorData.username}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-pink-800 font-semibold">
                  {(content.creatorData?.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{content.creatorData.username}</h3>
              <p className="text-sm text-gray-500">{formatTimeAgo(content.timestamp)}</p>
            </div>
            <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
              Creator
            </div>
          </div>
          
          {isOwnPost && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                  <button
                    onClick={handleDeleteContent}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative w-full">
          {content.isPaid && !hasAccess ? (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center w-full max-h-[500px] md:max-h-[900px]">
              <img
                src={content.content}
                alt="Preview"
                className="w-full h-auto object-contain blur-lg max-h-[500px] md:max-h-[900px]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white bg-black bg-opacity-50 p-6 rounded-lg">
                  <Lock size={48} className="mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Premium Content</h3>
                  <p className="text-sm opacity-90 mb-4">
                    Unlock this exclusive content for {content.price} BNB
                  </p>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    {purchasing ? 'Purchasing...' : `Buy for ${content.price} BNB`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center w-full max-h-[500px] md:max-h-[900px]">
              <img
                src={content.content}
                alt="Content"
                className="w-full h-auto object-contain cursor-pointer max-h-[500px] md:max-h-[900px]"
                onClick={() => {
                  setSelectedPost(content);
                  setShowPostDetail(true);
                }}
              />
            </div>
          )}
        </div>

        <div className="p-4">
          {content.description && (
            <p className="text-gray-700 mb-3">{content.description}</p>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <LikeButton contentId={content.id.toString()} />
              <button
                onClick={() => {
                  setSelectedPost(content);
                  setShowPostDetail(true);
                }}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 transition-colors"
              >
                <CommentButton
                  contentId={content.id.toString()}
                  contentAuthor={content.creatorData.username}
                />
              </button>
              <ShareButton
                contentId={content.id.toString()}
                contentAuthor={content.creatorData.username}
                contentDescription={content.description || "Amazing content on FaceBoobs"}
              />
            </div>
            
            {content.isPaid && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>💰 {content.price} BNB</span>
                {content.blockchainContentId && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    BC-ID: {content.blockchainContentId}
                  </span>
                )}
                {!content.blockchainContentId && content.isPaid && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                    ⚠️ No BC-ID
                  </span>
                )}
              </div>
            )}
          </div>
          
          {hasAccess && content.isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <span className="text-green-800 text-sm font-medium">✅ You own this content</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StoryViewer = () => {
    if (!showStoryViewer || !selectedStory) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="relative w-full h-full">
          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex space-x-1 z-10">
            {stories.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full ${
                  index < currentStoryIndex
                    ? 'bg-white'
                    : index === currentStoryIndex
                    ? 'bg-white'
                    : 'bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Story header */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center">
                <span className="text-pink-800 text-sm font-semibold">
                  {(selectedStory.creatorData?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-pink-800 font-semibold text-sm">
                  {selectedStory.creatorData?.username || 'Unknown'}
                </p>
                <p className="text-gray-300 text-xs">
                  {formatTimeAgo(selectedStory.timestamp)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowStoryViewer(false)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Story content */}
          <div
            className="h-full w-full flex items-center justify-center cursor-pointer"
            onClick={handleNextStory}
          >
            <img
              src={selectedStory.content}
              alt={`${selectedStory.creatorData.username}'s story`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation buttons */}
          <div className="absolute inset-0 flex">
            {/* Left half - previous story */}
            {currentStoryIndex > 0 && (
              <div
                className="w-1/2 h-full cursor-pointer flex items-center justify-start pl-4"
                onClick={handlePrevStory}
              >
                <div className="text-white text-2xl opacity-0 hover:opacity-100 transition-opacity">
                  ‹
                </div>
              </div>
            )}

            {/* Right half - next story */}
            <div
              className="w-1/2 h-full cursor-pointer flex items-center justify-end pr-4 ml-auto"
              onClick={handleNextStory}
            >
              <div className="text-white text-2xl opacity-0 hover:opacity-100 transition-opacity">
                {currentStoryIndex < stories.length - 1 ? '›' : '✓'}
              </div>
            </div>
          </div>

          {/* Time remaining indicator */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-50 rounded-full px-3 py-1 text-center">
              <span className="text-white text-xs">
                {formatTimeRemaining(selectedStory.expiryTime)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (web3Loading || loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full text-center py-12">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white p-8 mx-4 max-w-md mx-auto">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="opacity-90 mb-6">Connect your wallet to access your personalized feed</p>
          <div className="text-sm opacity-75">
            Your feed shows posts from creators you follow
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Stories Section - Full Width */}
      <div className="w-full mb-4">
        <StoriesCarousel />
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-2 md:gap-4">
        {/* Main Feed */}
        <div className="w-full min-w-0">
          {!loading && contents.length === 0 && !hasFollows && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white p-8 mb-6 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-bold mb-2">Your Feed is Empty</h2>
              <p className="opacity-90 mb-4">Start following creators to see their posts in your feed!</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/explore')}
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Discover Creators
                </button>
              </div>
            </div>
          )}

          {!loading && contents.length === 0 && hasFollows && (
            <div className="bg-gray-50 rounded-xl p-8 mb-6 text-center border border-gray-200">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-800">No Posts Yet</h2>
              <p className="text-gray-600 mb-4">The creators you follow haven't posted anything yet. Check back later!</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/explore')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Find More Creators
                </button>
                {!user?.isCreator && (
                  <button
                    onClick={async () => {
                      try {
                        const result = await becomeCreator();
                        if (result?.success) {
                          toast.success('🎉 ' + result.message);
                          if (result.isCreatorNow) {
                            setTimeout(() => window.location.reload(), 1000);
                          }
                        } else if (result?.message) {
                          toast.error('❌ ' + result.message);
                        }
                      } catch (error) {
                        console.error('Become creator error:', error);
                        toast.error('❌ Failed to become creator. Please try again.');
                      }
                    }}
                    disabled={web3Loading}
                    className="border border-white text-white px-4 py-2 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors disabled:opacity-50"
                  >
                    {web3Loading ? 'Processing...' : 'Become Creator'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {contents.map((content) => (
              <ContentCard key={content.id} content={content} />
            ))}
          </div>
        </div>

        {/* Suggested Profiles Sidebar */}
        {(
          <div className="hidden lg:block sticky top-4 self-start space-y-3 w-full">
            {/* Presale Banner */}
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-xl shadow-lg p-6 text-white overflow-hidden relative">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full translate-y-12 -translate-x-12"></div>

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Token - Large and Prominent */}
                <div className="text-pink-200 font-extrabold text-4xl mb-4">
                  $FBS
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2">
                  Presale Coming Soon
                </h3>

                {/* Subtitle */}
                <p className="text-sm opacity-90 mb-4">
                  Be the first to invest in FaceBoobs and get exclusive early access
                </p>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    toast.success('🔔 You will be notified when the presale starts!');
                  }}
                  className="w-full bg-white text-purple-600 font-semibold py-3 px-6 rounded-lg hover:bg-purple-50 hover:scale-105 transition-all cursor-pointer shadow-md mb-3"
                >
                  Notify Me
                </button>

                {/* Coming Date Box - Small */}
                <div className="bg-pink-100 text-purple-800 font-medium text-xs py-2 px-4 rounded-full inline-block">
                  Coming December 2025
                </div>
              </div>
            </div>

            <SuggestedProfiles />
          </div>
        )}
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

      {/* Story Viewer Modal */}
      <StoryViewer />
    </div>
  );
};

export default Home;