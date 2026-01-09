// src/components/CommentButton.js
import React, { useState, useEffect } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useComments } from '../contexts/CommentsContext';
import CommentModal from './CommentModal';

const CommentButton = ({ contentId, contentAuthor, className = "", size = 20 }) => {
  const { getCommentCount, initializeComments } = useComments();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get current comment count
  const commentCount = getCommentCount(contentId);

  // Initialize comments for this content on mount
  useEffect(() => {
    if (contentId) {
      initializeComments(contentId);
    }
  }, [contentId, initializeComments]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple clicks while loading
    if (isLoading) return;

    setIsLoading(true);

    // Ensure comments are loaded before opening modal
    try {
      await initializeComments(contentId);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-200 text-gray-600 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label={`View ${commentCount} comments`}
      >
        {isLoading ? (
          <Loader2 size={size} className="animate-spin" />
        ) : (
          <MessageCircle size={size} />
        )}
        <span className="text-sm font-medium">
          {commentCount}
        </span>
      </button>

      {/* Comment Modal */}
      <CommentModal
        isOpen={showModal}
        onClose={handleCloseModal}
        contentId={contentId}
        contentAuthor={contentAuthor}
      />
    </>
  );
};

export default CommentButton;