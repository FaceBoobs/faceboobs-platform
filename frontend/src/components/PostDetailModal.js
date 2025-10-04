// src/components/PostDetailModal.js
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Lock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { useComments } from '../contexts/CommentsContext';
import LikeButton from './LikeButton';
import ShareButton from './ShareButton';

const PostDetailModal = ({ isOpen, onClose, content }) => {
  const { user, getMediaUrl } = useWeb3();
  const { toast } = useToast();
  const { getComments, addComment } = useComments();
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const contentComments = content ? getComments(content.id.toString()) : [];

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

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
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
        <div className="flex-1 md:flex-1 bg-black flex items-center justify-center min-h-0">
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
                  contentDescription="Check out this amazing post on SocialWeb3"
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
                  {contentComments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {comment.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900 mr-2">{comment.author}</span>
                          <span className="text-gray-800">{comment.text}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">{formatTimeAgo(comment.timestamp)}</span>
                          <button className="text-xs text-gray-600 font-semibold hover:text-gray-800">
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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