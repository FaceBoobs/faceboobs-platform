// src/contexts/CommentsContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from './ToastContext';
import { useWeb3 } from './Web3Context';
import SupabaseService from '../services/supabaseService';

const CommentsContext = createContext();

export const useComments = () => {
  const context = useContext(CommentsContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
};

export const CommentsProvider = ({ children }) => {
  const { toast } = useToast();
  const { account, user } = useWeb3();

  // State to store comments data
  // Structure: { contentId: [{ id, content, user_address, username, created_at }] }
  const [commentsData, setCommentsData] = useState({});
  const [loading, setLoading] = useState(false);

  // Get comments for a specific content
  const getComments = useCallback((contentId) => {
    return commentsData[contentId] || [];
  }, [commentsData]);

  // Get comment count for a specific content
  const getCommentCount = useCallback((contentId) => {
    const comments = commentsData[contentId] || [];
    return comments.length;
  }, [commentsData]);

  // Load comments for a specific post from Supabase
  const loadComments = useCallback(async (postId) => {
    try {
      const result = await SupabaseService.getCommentsForPost(parseInt(postId));

      if (result.success) {
        setCommentsData(prevData => ({
          ...prevData,
          [postId]: result.data
        }));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, []);

  // Add a comment to a content using Supabase
  const addComment = useCallback(async (contentId, commentText, userAddress, username) => {
    if (!contentId || !commentText || !commentText.trim()) {
      toast.error('Please enter a comment');
      return { success: false };
    }

    if (!userAddress || !account) {
      toast.error('Please connect your wallet to comment');
      return { success: false };
    }

    try {
      setLoading(true);

      const commentData = {
        post_id: parseInt(contentId),
        user_address: userAddress,
        content: commentText.trim(),
        username: username || user?.username || `User${userAddress.substring(0, 6)}`,
        avatar: user?.profileImage || ''
      };

      const result = await SupabaseService.createComment(commentData);

      if (result.success) {
        // Add to local state optimistically
        setCommentsData(prevData => ({
          ...prevData,
          [contentId]: [...(prevData[contentId] || []), result.data]
        }));

        toast.success('💬 Comment added!');
        return { success: true, comment: result.data };
      } else {
        toast.error('Failed to add comment: ' + result.error);
        return { success: false };
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [account, user, toast]);

  // Initialize comments for content from Supabase
  const initializeComments = useCallback(async (contentId) => {
    if (!commentsData[contentId]) {
      await loadComments(contentId);
    }
  }, [commentsData, loadComments]);

  // Batch initialize multiple contents from Supabase
  const initializeMultipleComments = useCallback(async (contentIds) => {
    try {
      const promises = contentIds.map(async (contentId) => {
        if (!commentsData[contentId]) {
          await loadComments(contentId);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error initializing multiple comments:', error);
    }
  }, [commentsData, loadComments]);


  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }, []);

  // Get total comments count across all content for a user
  const getTotalCommentsForUser = useCallback((userContentIds) => {
    return userContentIds.reduce((total, contentId) => {
      return total + (commentsData[contentId]?.length || 0);
    }, 0);
  }, [commentsData]);

  const value = {
    // State
    commentsData,
    loading,

    // Actions
    addComment,
    loadComments,
    initializeComments,
    initializeMultipleComments,

    // Getters
    getComments,
    getCommentCount,
    getTotalCommentsForUser,
    formatTimestamp
  };

  return (
    <CommentsContext.Provider value={value}>
      {children}
    </CommentsContext.Provider>
  );
};

export default CommentsContext;