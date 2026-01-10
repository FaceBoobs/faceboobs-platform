// src/components/PostDetailModal.js
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Lock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { useComments } from '../contexts/CommentsContext';
import { SupabaseService } from '../services/supabaseService';
import { ethers } from 'ethers';
import LikeButton from './LikeButton';
import ShareButton from './ShareButton';

const PostDetailModal = ({ isOpen, onClose, content }) => {
  const { user, getMediaUrl, contract, account } = useWeb3();
  const { toast } = useToast();
  const { getComments, addComment } = useComments();
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const contentComments = content ? getComments(content.id.toString()) : [];

  // Check content access when modal opens or account changes
  useEffect(() => {
    const checkAccess = async () => {
      if (!content?.id || !account) {
        setHasAccess(false);
        return;
      }

      try {
        const result = await SupabaseService.checkContentAccess(account, content.id);
        setHasAccess(result.success ? result.hasAccess : false);
      } catch (error) {
        console.error('Error checking content access:', error);
        setHasAccess(false);
      }
    };

    if (isOpen && content) {
      checkAccess();
    }
  }, [isOpen, content, account]);

  // Reset comment input when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNewComment('');
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !content || !user) return;

    try {
      setSubmittingComment(true);

      const result = await addComment(
        content.id.toString(),
        newComment.trim(),
        user.address,
        user.username
      );

      if (result.success) {
        setNewComment('');
      }

    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePurchase = async () => {
    if (!contract || !account || !content) {
      toast.error('Please connect your wallet first.');
      return;
    }

    // Check if blockchain content ID exists
    if (!content.blockchainContentId) {
      console.error('❌ No blockchain content ID found for this post');
      toast.error('This post is not registered on blockchain. Cannot purchase.');
      return;
    }

    try {
      setPurchasing(true);

      // Convert price from BNB to Wei
      // content.price comes as string like "9.996" (in BNB) from database
      const priceInWei = ethers.parseEther(content.price.toString());
      console.log('💰 Price conversion:', {
        priceInBNB: content.price,
        priceInWei: priceInWei.toString()
      });

      // Step 1: Call smart contract to purchase content
      console.log('🛒 Purchasing content from modal...', {
        supabaseId: content.id,
        blockchainContentId: content.blockchainContentId,
        price: content.price
      });
      toast.info('🔐 Opening MetaMask for transaction confirmation...');

      const tx = await contract.buyContent(content.blockchainContentId, {
        value: priceInWei, // Pass Wei value to contract
        gasLimit: 300000
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
        post_id: parseInt(content.id), // Save Supabase post ID
        amount: content.price.toString(), // Save original price in BNB
        transaction_hash: receipt.hash,
        created_at: new Date().toISOString()
      };

      const saveResult = await SupabaseService.createPurchase(purchaseData);

      if (!saveResult.success) {
        console.error('⚠️ Failed to save purchase to Supabase:', saveResult.error);
        toast.warning('Content purchased but failed to sync with database');
      } else {
        console.log('✅ Purchase saved to Supabase:', saveResult.data);
      }

      // Step 4: Update local state to unlock content
      setHasAccess(true);

      // Step 5: Create notification for the post creator
      try {
        // Don't create notification if user buys their own content
        if (content.creator && content.creator.toLowerCase() !== account.toLowerCase()) {
          const notificationData = {
            user_address: content.creator.toLowerCase(),
            type: 'purchase',
            title: 'New Purchase',
            message: `${user?.username || `User${account.substring(0, 6)}`} purchased your content for ${content.price} BNB`,
            post_id: parseInt(content.id),
            from_user_address: account.toLowerCase(),
            from_username: user?.username || `User${account.substring(0, 6)}`
          };

          await SupabaseService.createNotification(notificationData);
          console.log('✅ Purchase notification created');
        }
      } catch (notifError) {
        console.error('Failed to create purchase notification:', notifError);
        // Don't fail the purchase operation if notification fails
      }

      toast.success('🎉 Content purchased successfully!');

    } catch (error) {
      console.error('❌ Purchase failed:', error);

      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient BNB balance');
      } else if (error.message?.includes('user rejected')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Purchase failed: ' + (error.reason || error.message));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'just now';

    // Handle both timestamp numbers and ISO date strings
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'just now';
    }

    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOpen || !content) return null;

  // Get display image URL - check for both contentHash (localStorage) and content (base64)
  let displayUrl = null;

  // First try contentHash (for images uploaded via localStorage system)
  if (content.contentHash) {
    displayUrl = getMediaUrl(content.contentHash);
  }

  // If no contentHash or getMediaUrl returns null, try content field (base64 data from database)
  if (!displayUrl && content.content) {
    displayUrl = content.content;
  }

  const isVideo = displayUrl && displayUrl.startsWith('data:video/');


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-none md:rounded-lg w-full md:max-w-5xl h-full md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
        {/* Media Section */}
        <div className="flex-1 md:flex-1 bg-black flex items-center justify-center min-h-0 relative">
          {content.isPaid && !hasAccess ? (
            // Locked content with blur effect
            <div className="relative w-full h-full flex items-center justify-center">
              {displayUrl && (
                isVideo ? (
                  <video
                    src={displayUrl}
                    className="max-w-full max-h-full object-contain blur-xl opacity-30"
                  />
                ) : (
                  <img
                    src={displayUrl}
                    alt="Locked content preview"
                    className="max-w-full max-h-full object-contain blur-xl opacity-30"
                  />
                )
              )}
              {/* Purchase Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm p-8 rounded-lg text-center text-white max-w-md">
                  <Lock size={48} className="mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Premium Content</h3>
                  <p className="text-sm opacity-90 mb-6">
                    Unlock this exclusive content for {content.price} BNB
                  </p>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-semibold"
                  >
                    {purchasing ? 'Purchasing...' : `Buy for ${content.price} BNB`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Unlocked content - show normally
            <>
              {displayUrl ? (
                isVideo ? (
                  <video
                    src={displayUrl}
                    controls
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <img
                    src={displayUrl}
                    alt="Post content"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                )
              ) : null}
              <div
                className="flex items-center justify-center text-gray-400 text-center p-8"
                style={{ display: displayUrl ? 'none' : 'flex' }}
              >
                <div>
                  <div className="text-6xl mb-4">{isVideo ? '🎥' : '📷'}</div>
                  <p className="text-lg">Content not available</p>
                  <p className="text-sm opacity-75">{isVideo ? 'Video' : 'Media'} may still be loading</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content Section */}
        <div className="w-full md:w-96 flex flex-col md:border-l border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
                {content.creatorData?.avatarHash && getMediaUrl(content.creatorData.avatarHash) ? (
                  <img 
                    src={getMediaUrl(content.creatorData.avatarHash)}
                    alt={`${content.creatorData.username}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-pink-800 font-semibold text-sm">
                    {content.creatorData?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{content.creatorData?.username || 'Unknown'}</h3>
                <p className="text-xs text-gray-500">{formatTimeAgo(content.timestamp * 1000)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 md:p-1"
            >
              <X size={24} className="md:w-5 md:h-5" />
            </button>
          </div>

          {/* Premium Content Notice */}
          {content.isPaid && (
            <div className="p-4 bg-purple-50 border-b border-gray-200">
              <div className="flex items-center space-x-2 text-purple-700">
                <Lock size={16} />
                <span className="text-sm font-medium">
                  Premium Content - {content.price} BNB
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 border-b border-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <LikeButton contentId={content.id.toString()} size={22} />
                <button className="text-gray-700 hover:text-gray-900 transition-colors">
                  <MessageCircle size={22} />
                </button>
                <ShareButton
                  contentId={content.id.toString()}
                  contentAuthor={content.creatorData?.username || 'Unknown'}
                  contentDescription="Check out this amazing post on FaceBoobs"
                />
              </div>
              {content.isPaid && (
                <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                  💰 {Number(content.purchaseCount)} purchases
                </div>
              )}
            </div>
            
            {/* Like count */}
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {contentComments.length} {contentComments.length === 1 ? 'comment' : 'comments'}
            </div>
          </div>

          {/* Comments Section */}
          <div className="flex-1 flex flex-col">
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {contentComments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageCircle size={28} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs opacity-75">Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contentComments.map((comment) => {
                    // Safe fallback for username/author
                    const displayName = comment.author || comment.username || comment.user_address?.slice(0, 8) || 'Anonymous';
                    const avatarLetter = displayName.charAt(0).toUpperCase();

                    return (
                      <div key={comment.id} className="flex space-x-3">
                        <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {avatarLetter}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-semibold text-gray-900 mr-2">{displayName}</span>
                            <span className="text-gray-800">{comment.content || comment.text || ''}</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at || comment.timestamp)}</span>
                            <button className="text-xs text-gray-600 font-semibold hover:text-gray-800">
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="p-4 border-t border-gray-100">
              <form onSubmit={handleSubmitComment} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 text-sm placeholder-gray-500 border-none focus:outline-none resize-none"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingComment ? 'Posting...' : 'Post'}
                </button>
              </form>
              {newComment.length > 150 && (
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {newComment.length}/200
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;