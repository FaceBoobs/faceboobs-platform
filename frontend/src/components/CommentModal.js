// src/components/CommentModal.js
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, User } from 'lucide-react';
import { useComments } from '../contexts/CommentsContext';
import { useWeb3 } from '../contexts/Web3Context';

const CommentModal = ({ isOpen, onClose, contentId, contentAuthor }) => {
  const { getComments, addComment, initializeComments, formatTimestamp } = useComments();
  const { account, user } = useWeb3();
  
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);
  const textareaRef = useRef(null);
  const commentsEndRef = useRef(null);

  const comments = getComments(contentId);

  // Initialize comments when modal opens
  useEffect(() => {
    if (isOpen && contentId) {
      initializeComments(contentId);
    }
  }, [isOpen, contentId, initializeComments]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addComment(contentId, commentText, account, user?.username);
    
    if (result.success) {
      setCommentText('');
      // Keep focus on textarea for more comments
      textareaRef.current?.focus();
    }
    setIsSubmitting(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageCircle className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              Comments ({comments.length})
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
          {comments.length === 0 ? (
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
                  {comment.avatar ? (
                    <img
                      src={comment.avatar}
                      alt={comment.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-white rounded-full flex items-center justify-center">
                      <User size={20} className="text-pink-800" />
                    </div>
                  )}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {comment.author}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {comment.text}
                    </p>
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