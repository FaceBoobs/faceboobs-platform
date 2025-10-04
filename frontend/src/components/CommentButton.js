// src/components/CommentButton.js
import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useComments } from '../contexts/CommentsContext';
import CommentModal from './CommentModal';

const CommentButton = ({ contentId, contentAuthor, className = "", size = 20 }) => {
  const { getCommentCount, initializeComments } = useComments();
  const [showModal, setShowModal] = useState(false);
  
  // Get current comment count
  const commentCount = getCommentCount(contentId);

  // Initialize comments for this content on mount
  useEffect(() => {
    if (contentId) {
      initializeComments(contentId);
    }
  }, [contentId, initializeComments]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-200 text-gray-600 hover:text-blue-500 hover:bg-blue-50 ${className}`}
      >
        <MessageCircle size={size} />
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