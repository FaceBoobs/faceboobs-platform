// src/components/CommentModal.js
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, User } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { SupabaseService } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';

const CommentModal = ({ isOpen, onClose, contentId, contentAuthor }) => {
  const { account, user, getMediaUrl } = useWeb3();
  const { toast } = useToast();

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const modalRef = useRef(null);
  const textareaRef = useRef(null);
  const commentsEndRef = useRef(null);

  // Fetch comments from Supabase when modal opens
  useEffect(() => {
    const loadComments = async () => {
      if (isOpen && contentId) {
        setIsLoadingComments(true);
        setComments([]); // Reset comments when loading
        setLoadError(false); // Reset error state
        try {
          console.log('📥 [CommentModal] Fetching comments for post:', contentId);

          // Validate contentId
          if (!contentId || isNaN(parseInt(contentId))) {
            console.warn('⚠️ [CommentModal] Invalid post ID:', contentId);
            setComments([]);
            setLoadError(false);
            setIsLoadingComments(false);
            return;
          }

          const result = await SupabaseService.getCommentsForPost(contentId);

          if (result.success) {
            console.log('✅ [CommentModal] Loaded comments:', result.data);
            console.log('📊 [CommentModal] Number of comments:', result.data?.length);

            // Debug each comment
            result.data?.forEach((comment, index) => {
              console.log(`💬 Comment ${index + 1}:`, {
                id: comment.id,
                username: comment.username,
                content: comment.content,
                has_content: !!comment.content,
                content_length: comment.content?.length || 0
              });
            });

            setComments(result.data || []);
            setLoadError(false);
          } else {
            // Don't show error toast - just log and set error state
            console.warn('⚠️ [CommentModal] Failed to load comments:', result.error);
            setComments([]);
            setLoadError(true);
          }
        } catch (error) {
          // Don't show error toast - just log and set error state
          console.warn('⚠️ [CommentModal] Error loading comments:', error);
          setComments([]);
          setLoadError(true);
        } finally {
          setIsLoadingComments(false);
        }
      }
    };
    loadComments();
  }, [isOpen, contentId]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Format timestamp helper
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'just now';

    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'just now';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    if (!account || !user) {
      toast.error('Please connect your wallet to comment');
      return;
    }

    setIsSubmitting(true);

    try {
      const commentData = {
        post_id: parseInt(contentId),
        user_address: account.toLowerCase(),
        username: user.username || `User${account.substring(0, 6)}`,
        content: commentText.trim(),
        avatar: user.profileImage || user.avatarHash || null
      };

      console.log('📤 [CommentModal] Creating comment:', commentData);
      console.log('📝 [CommentModal] Comment text length:', commentData.content.length);
      const result = await SupabaseService.createComment(commentData);

      if (result.success) {
        console.log('✅ [CommentModal] Comment created successfully');
        console.log('📦 [CommentModal] Returned data:', result.data);
        console.log('💬 [CommentModal] Returned content:', result.data?.content);

        toast.success('Comment posted!');

        // Append new comment to the list
        setComments(prevComments => {
          const updated = [...prevComments, result.data];
          console.log('📊 [CommentModal] Total comments after add:', updated.length);
          return updated;
        });

        // Clear the input
        setCommentText('');

        // Keep focus on textarea for more comments
        textareaRef.current?.focus();
      } else {
        console.error('❌ [CommentModal] Failed to create comment:', result.error);
        // Show user-friendly error message
        toast.error('Could not post comment. Please try again.');
      }
    } catch (error) {
      console.error('❌ [CommentModal] Error posting comment:', error);
      // Show user-friendly error message
      toast.error('Could not post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4">
      <div
        ref={modalRef}
        className="bg-white md:rounded-xl shadow-2xl w-full md:max-w-lg h-full md:h-auto md:max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageCircle className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              Comments {isLoadingComments ? '(...)' : `(${comments.length})`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          {isLoadingComments ? (
            // Loading Skeleton
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 && loadError ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageCircle size={48} className="text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2 text-gray-700">Could not load comments</p>
              <p className="text-sm text-center text-gray-600">
                You can still add a new comment below
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageCircle size={48} className="text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2">No comments yet</p>
              <p className="text-sm text-center">
                Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 animate-fade-in">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {(() => {
                    const avatarUrl = comment.users?.avatar_url || comment.avatar;
                    const mediaSrc = avatarUrl ? getMediaUrl(avatarUrl) : null;

                    return mediaSrc ? (
                      <img
                        src={mediaSrc}
                        alt={comment.users?.username || comment.username || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null;
                  })()}
                  <div
                    className="w-10 h-10 bg-gradient-to-br from-pink-400 to-white rounded-full flex items-center justify-center"
                    style={{ display: (comment.users?.avatar_url || comment.avatar) && getMediaUrl(comment.users?.avatar_url || comment.avatar) ? 'none' : 'flex' }}
                  >
                    <span className="text-pink-800 font-semibold text-sm">
                      {(comment.users?.username || comment.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {comment.users?.username || comment.username || `User${comment.user_address?.substring(0, 6)}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(comment.created_at)}
                      </span>
                    </div>
                    {comment.content ? (
                      <p className="text-sm text-gray-700 leading-relaxed break-words">
                        {comment.content}
                      </p>
                    ) : (
                      <p className="text-sm text-red-500 italic">
                        [Comment text missing - Debug: ID {comment.id}]
                      </p>
                    )}
                  </div>

                  {/* Comment actions - could add later */}
                  {/* <div className="flex items-center space-x-4 mt-1 ml-3">
                    <button className="text-xs text-gray-500 hover:text-blue-500">
                      Reply
                    </button>
                    <button className="text-xs text-gray-500 hover:text-red-500">
                      Like
                    </button>
                  </div> */}
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment Input */}
        <div className="border-t border-gray-200 p-4">
          {account && user ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex space-x-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-white rounded-full flex items-center justify-center">
                    <span className="text-pink-800 font-semibold text-sm">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>

                {/* Input Area */}
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a comment..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={isSubmitting}
                    maxLength={500}
                  />
                  
                  {/* Character Counter and Actions */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {commentText.length}/500 characters
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 hidden sm:block">
                        Ctrl+Enter to send
                      </span>
                      <button
                        type="submit"
                        disabled={!commentText.trim() || isSubmitting}
                        className="flex items-center space-x-2 bg-blue-500 text-pink-800 px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Send size={16} />
                        )}
                        <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-800 text-sm">
                Connect your wallet and register to join the conversation
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CommentModal;