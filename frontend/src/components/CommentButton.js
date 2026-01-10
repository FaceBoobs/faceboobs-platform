// src/components/CommentButton.js
import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import CommentModal from './CommentModal';

const CommentButton = ({ contentId, contentAuthor, className = "", size = 20 }) => {
  const [showModal, setShowModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Fetch comment count on mount and when modal closes
  useEffect(() => {
    const fetchCommentCount = async () => {
      if (contentId) {
        try {
          const result = await SupabaseService.getCommentsForPost(contentId);
          if (result.success) {
            setCommentCount(result.data?.length || 0);
          } else {
            // Don't show error, just keep count at 0
            console.warn('⚠️ [CommentButton] Could not fetch count for post:', contentId);
            setCommentCount(0);
          }
        } catch (error) {
          console.warn('⚠️ [CommentButton] Error fetching comment count:', error);
          setCommentCount(0);
        }
      }
    };

    fetchCommentCount();
  }, [contentId, showModal]); // Refetch when modal closes

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Always open modal regardless of comment loading status
    console.log('💬 [CommentButton] Opening comments modal for post:', contentId);
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
        aria-label={`View ${commentCount} comments`}
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