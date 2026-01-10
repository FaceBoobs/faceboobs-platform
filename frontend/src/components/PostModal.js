// src/components/PostModal.js
// Instagram-style post modal for viewing full post with comments
import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Send } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useLikes } from '../contexts/LikesContext';
import { useComments } from '../contexts/CommentsContext';

const PostModal = ({ post, onClose }) => {
  const { account, user } = useWeb3();
  const { isLiked, likeCount, toggleLike } = useLikes();
  const { comments, addComment } = useComments();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!post) return null;

  const handleLike = async () => {
    if (!account) return;
    await toggleLike(post.id.toString());
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !account) return;

    try {
      setSubmitting(true);
      await addComment(post.id.toString(), commentText, user?.username || 'Anonymous');
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown date';

    // Handle both timestamp numbers and ISO date strings
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const postLiked = isLiked(post.id.toString());
  const postLikeCount = likeCount(post.id.toString());
  const postComments = comments(post.id.toString()) || [];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side: Image */}
        <div className="w-2/3 bg-black flex items-center justify-center relative">
          <img
            src={post.content}
            alt="Post content"
            className="max-h-[90vh] max-w-full object-contain"
          />

          {/* Close button on image for mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Right side: Info and comments */}
        <div className="w-1/3 flex flex-col min-w-[320px]">
          {/* Header with profile */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {post.creatorData?.profileImage ? (
                  <img
                    src={post.creatorData.profileImage}
                    alt={post.creatorData.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{post.creatorData?.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <span className="font-semibold text-gray-900">
                {post.creatorData?.username || 'Anonymous'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors hidden lg:block"
            >
              <X size={24} />
            </button>
          </div>

          {/* Description/Caption */}
          <div className="p-4 border-b">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {post.creatorData?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold mr-2">{post.creatorData?.username}</span>
                  <span className="text-gray-700">{post.description || 'No description'}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(post.timestamp)}
                </p>
              </div>
            </div>
          </div>

          {/* Comments section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {postComments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">Be the first to comment!</p>
              </div>
            ) : (
              postComments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {comment.username?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold mr-2">{comment.username}</span>
                      <span className="text-gray-700">{comment.content || comment.text}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(comment.created_at || comment.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions bar */}
          <div className="border-t">
            <div className="p-4">
              <div className="flex gap-4 mb-3">
                <button
                  onClick={handleLike}
                  className={`transition-colors ${
                    postLiked ? 'text-pink-500' : 'text-gray-700 hover:text-pink-500'
                  }`}
                >
                  <Heart size={24} fill={postLiked ? 'currentColor' : 'none'} />
                </button>
                <button className="text-gray-700 hover:text-blue-500 transition-colors">
                  <MessageCircle size={24} />
                </button>
                <button className="text-gray-700 hover:text-green-500 transition-colors">
                  <Share2 size={24} />
                </button>
              </div>

              {postLikeCount > 0 && (
                <p className="font-semibold text-sm mb-2">
                  {postLikeCount} {postLikeCount === 1 ? 'like' : 'likes'}
                </p>
              )}

              <p className="text-xs text-gray-500">{formatTime(post.timestamp)}</p>
            </div>

            {/* Add comment input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a comment..."
                  disabled={submitting || !account}
                  className="flex-1 text-sm border-none focus:outline-none focus:ring-0 disabled:opacity-50"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submitting || !account}
                  className="text-blue-500 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:text-blue-600 transition-colors"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
