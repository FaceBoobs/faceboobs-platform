// src/pages/PostDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, MessageCircle, Lock, User } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useLikes } from '../contexts/LikesContext';
import { useComments } from '../contexts/CommentsContext';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import LikeButton from '../components/LikeButton';
import CommentButton from '../components/CommentButton';
import ShareButton from '../components/ShareButton';
import RegisterPostOnBlockchain from '../components/RegisterPostOnBlockchain';
import { getWalletName, isMobileDevice } from '../utils/walletDetection';
import { ethers } from 'ethers';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, user, getMediaUrl, contract } = useWeb3();
  const { initializeLikes } = useLikes();
  const { initializeComments, getComments, addComment } = useComments();
  const { toast } = useToast();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const postComments = post ? getComments(post.id.toString()) : [];

  useEffect(() => {
    loadPost();
  }, [id, account]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Loading post:', id);

      // Load post from Supabase
      const result = await SupabaseService.getPostById(id);

      if (!result.success || !result.data) {
        setError('Post not found');
        toast.error('Post not found');
        return;
      }

      const postData = result.data;
      console.log('✅ Post loaded:', postData);
      console.log('📊 Post media fields:', {
        media_url: postData.media_url,
        image_url: postData.image_url,
        content_hash: postData.content_hash
      });

      // Initialize likes and comments for this post
      await initializeLikes(id);
      await initializeComments(id);

      // Check access if it's a paid post
      if (postData.is_paid && account) {
        const accessResult = await SupabaseService.checkContentAccess(account, id);
        setHasAccess(accessResult.success ? accessResult.hasAccess : false);
      } else {
        setHasAccess(true); // Free posts are always accessible
      }

      setPost(postData);
    } catch (err) {
      console.error('❌ Error loading post:', err);
      setError('Failed to load post');
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    // Wallet connection check
    if (!window.ethereum || !account) {
      toast.error('Please connect your wallet first.', { id: 'wallet-connect-error' });
      return;
    }

    if (!contract) {
      toast.error('Smart contract not loaded. Please refresh the page.', { id: 'contract-error' });
      return;
    }

    if (!post) {
      toast.error('Post not found.', { id: 'post-error' });
      return;
    }

    if (!post.blockchain_content_id) {
      toast.error('This post is not registered on blockchain. Cannot purchase.', { id: 'blockchain-id-error' });
      return;
    }

    try {
      setPurchasing(true);

      // Check if user is registered on blockchain
      try {
        const isRegistered = await contract.isUserRegistered(account);
        if (!isRegistered) {
          toast.info('Registering your account on blockchain...', { id: 'register-info' });
          const regTx = await contract.registerUser();
          await regTx.wait();
          toast.success('Account registered successfully!', { id: 'register-success' });
        }
      } catch (regError) {
        console.warn('Registration check failed:', regError);
        // Continue with purchase attempt
      }

      const priceInWei = ethers.parseEther(post.price.toString());

      // Detect mobile wallet
      const walletType = getWalletName();
      const mobile = isMobileDevice();

      toast.info(`🔐 Opening ${walletType} for transaction...`, {
        id: 'purchase-open',
        dismissPrevious: true
      });

      const tx = await contract.buyContent(post.blockchain_content_id, {
        value: priceInWei,
        gasLimit: 300000
      });

      console.log('⏳ Transaction sent:', tx.hash);
      toast.info('⏳ Transaction sent! Waiting for confirmation...', {
        id: 'purchase-pending',
        dismissPrevious: true
      });

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);

      // Save purchase to database
      const purchaseData = {
        user_address: account.toLowerCase(),
        post_id: parseInt(post.id),
        amount: post.price.toString(),
        transaction_hash: receipt.hash,
        created_at: new Date().toISOString()
      };

      await SupabaseService.createPurchase(purchaseData);

      toast.success('🎉 Content purchased successfully!', {
        id: 'purchase-success',
        dismissPrevious: true
      });

      setHasAccess(true);
    } catch (err) {
      console.error('❌ Purchase error:', err);

      // Clear any pending toasts
      toast.dismiss('purchase-open');
      toast.dismiss('purchase-pending');

      // Specific error messages
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        toast.error('Transaction cancelled.', { id: 'purchase-cancelled' });
      } else if (err.code === -32603 || err.message?.includes('insufficient funds')) {
        toast.error('Insufficient BNB for purchase and gas fees.', { id: 'purchase-insufficient' });
      } else if (err.message?.includes('not registered')) {
        toast.error('Account not registered. Please try again.', { id: 'purchase-not-registered' });
      } else if (err.message?.includes('network')) {
        toast.error('Network error. Check your connection.', { id: 'purchase-network' });
      } else if (err.message?.includes('gas')) {
        toast.error('Gas estimation failed.', { id: 'purchase-gas' });
      } else if (err.message?.includes('revert')) {
        toast.error('Transaction reverted. You may already own this content.', { id: 'purchase-revert' });
      } else {
        toast.error('Purchase failed. Please try again.', { id: 'purchase-failed' });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !post || !user) return;

    try {
      setSubmittingComment(true);

      const result = await addComment(
        post.id.toString(),
        newComment.trim(),
        user.wallet_address,
        user.username,
        user.avatar_url
      );

      if (result.success) {
        setNewComment('');
        toast.success('Comment added!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';

    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-purple-500" />
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Post Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The post you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-gray-900">Post</h1>
        </div>
      </div>

      {/* Post Content - Instagram style */}
      <div className="max-w-2xl mx-auto py-4">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* Post Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                {post.avatar_url && getMediaUrl(post.avatar_url) ? (
                  <img
                    src={getMediaUrl(post.avatar_url)}
                    alt={post.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <User className="h-6 w-6 text-white" style={post.avatar_url && getMediaUrl(post.avatar_url) ? { display: 'none' } : {}} />
              </div>
              <div className="ml-3">
                <h3
                  className="font-semibold text-gray-900 cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${post.creator_address}`)}
                >
                  {post.username || 'Anonymous'}
                </h3>
                <p className="text-sm text-gray-500">{formatTimestamp(post.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Show blockchain registration prompt for post owner if needed */}
          {account && post.creator_address?.toLowerCase() === account.toLowerCase() && (
            <div className="px-4 pt-4">
              <RegisterPostOnBlockchain
                post={post}
                onSuccess={(updatedPost) => setPost(updatedPost)}
              />
            </div>
          )}

          {/* Post Image/Content */}
          <div className="relative">
            {post.is_paid && !hasAccess ? (
              <div
                className="premium-content p-12 text-center bg-gray-50"
                data-premium="true"
                data-paid="true"
                onContextMenu={(e) => e.preventDefault()}
              >
                <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Premium Content</h3>
                <p className="text-gray-600 mb-6">
                  This content requires payment to view
                </p>
                <div className="flex flex-col items-center space-y-4">
                  <span className="text-3xl font-bold text-purple-600">
                    {post.price} BNB
                  </span>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="unlock-button bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-semibold"
                    data-unlock="true"
                    style={{
                      pointerEvents: 'auto',
                      zIndex: 9999,
                      position: 'relative',
                      touchAction: 'manipulation'
                    }}
                  >
                    {purchasing ? 'Processing...' : 'Purchase Access'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 flex items-center justify-center">
                {(() => {
                  // Get media URL - FIRST try media_url, fallback to image_url
                  const mediaUrl = post.media_url || post.image_url;

                  console.log('🖼️ Rendering media:', {
                    media_url: post.media_url,
                    image_url: post.image_url,
                    mediaUrl,
                    hasMedia: !!mediaUrl
                  });

                  if (!mediaUrl) {
                    return (
                      <div className="w-full h-48 flex items-center justify-center">
                        <p className="text-gray-500">No media available</p>
                      </div>
                    );
                  }

                  // Determine media source
                  // If base64 (data:image or data:video), use directly (temporary fix)
                  // Otherwise use getMediaUrl to handle Supabase URLs
                  let mediaSrc;
                  if (mediaUrl.startsWith('data:image') || mediaUrl.startsWith('data:video')) {
                    console.log('⚠️ Base64 detected - using directly (temporary fix)');
                    mediaSrc = mediaUrl;
                  } else {
                    mediaSrc = getMediaUrl(mediaUrl);
                  }

                  console.log('🔗 Media source:', mediaSrc ? mediaSrc.substring(0, 50) + '...' : 'null');

                  if (!mediaSrc) {
                    return (
                      <div className="w-full h-48 flex items-center justify-center">
                        <p className="text-gray-500">Media not found</p>
                      </div>
                    );
                  }

                  // Infer type from media URL: check if URL contains 'video'
                  const mediaType = (mediaUrl.toLowerCase().includes('video') || mediaSrc.startsWith('data:video')) ? 'video' : 'image';
                  console.log('🔍 Type inferred:', mediaType);

                  return mediaType === 'video' ? (
                    <video
                      src={mediaSrc}
                      controls
                      className="w-full max-h-[600px] object-contain"
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      onError={(e) => {
                        console.error('❌ Video load error:', e);
                      }}
                    />
                  ) : (
                    <img
                      src={mediaSrc}
                      alt="Post content"
                      className="w-full max-h-[600px] object-contain"
                      draggable="false"
                      onContextMenu={(e) => e.preventDefault()}
                      onError={(e) => {
                        console.error('❌ Image load error:', e);
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex space-x-4">
                <LikeButton contentId={post.id.toString()} />
                <CommentButton
                  contentId={post.id.toString()}
                  contentAuthor={post.username || 'Anonymous'}
                />
                <ShareButton
                  contentId={post.id.toString()}
                  contentAuthor={post.username || 'Anonymous'}
                  contentDescription={post.caption || 'Check out this post!'}
                  showLabel={true}
                />
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="mt-2">
                <p className="text-gray-800">
                  <span className="font-semibold mr-2">{post.username}</span>
                  {post.caption}
                </p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircle size={20} className="mr-2" />
              Comments ({postComments.length})
            </h3>

            {/* Comments List */}
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {postComments.length > 0 ? (
                postComments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                      {comment.avatar ? (
                        <img
                          src={getMediaUrl(comment.avatar)}
                          alt={comment.username}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-white text-xs font-semibold">
                          {comment.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {comment.username || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
              )}
            </div>

            {/* Add Comment Form */}
            {user ? (
              <form onSubmit={handleSubmitComment} className="flex items-center space-x-3 border-t border-gray-200 pt-4">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center flex-shrink-0">
                  {user.avatar_url && getMediaUrl(user.avatar_url) ? (
                    <img
                      src={getMediaUrl(user.avatar_url)}
                      alt={user.username}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white text-xs font-semibold">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={submittingComment}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="bg-purple-500 text-white px-6 py-2 rounded-full hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submittingComment ? 'Posting...' : 'Post'}
                </button>
              </form>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>Please log in to comment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
