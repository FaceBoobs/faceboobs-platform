// src/contexts/LikesContext.js
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from './ToastContext';
import { useWeb3 } from './Web3Context';
import SupabaseService from '../services/supabaseService';

const LikesContext = createContext();

export const useLikes = () => {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
};

export const LikesProvider = ({ children }) => {
  const { toast } = useToast();
  const { account, user } = useWeb3();

  // State to store likes data
  // Structure: { contentId: { count: number, isLiked: boolean, likers: [addresses] } }
  const [likesData, setLikesData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load user's likes when account changes
  useEffect(() => {
    if (account) {
      loadUserLikes();
    }
  }, [account]);

  // Get like data for a specific content
  const getLikeData = useCallback((contentId) => {
    return likesData[contentId] || { count: 0, isLiked: false, likers: [] };
  }, [likesData]);

  // Load user's likes from Supabase
  const loadUserLikes = useCallback(async () => {
    if (!account) return;

    try {
      setLoading(true);
      const result = await SupabaseService.getUserLikes(account);

      if (result.success) {
        // Update local state with user's liked posts
        setLikesData(prevData => {
          const newData = { ...prevData };
          result.data.forEach(postId => {
            if (newData[postId]) {
              newData[postId].isLiked = true;
            } else {
              newData[postId] = { count: 0, isLiked: true, likers: [] };
            }
          });
          return newData;
        });
      }
    } catch (error) {
      console.error('Error loading user likes:', error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Toggle like for a content using Supabase
  const toggleLike = useCallback(async (contentId, userAddress) => {
    if (!contentId || !userAddress) {
      toast.error('Please connect your wallet to like posts');
      return { success: false };
    }

    if (!account) {
      toast.error('Please connect your wallet');
      return { success: false };
    }

    try {
      setLoading(true);

      // Optimistic update
      const currentData = likesData[contentId] || { count: 0, isLiked: false, likers: [] };
      const isCurrentlyLiked = currentData.isLiked;

      setLikesData(prevData => ({
        ...prevData,
        [contentId]: {
          ...currentData,
          isLiked: !isCurrentlyLiked,
          count: isCurrentlyLiked ? currentData.count - 1 : currentData.count + 1
        }
      }));

      // Update in Supabase
      const result = await SupabaseService.toggleLike(
        parseInt(contentId),
        userAddress,
        user?.username || `User${userAddress.substring(0, 6)}`
      );

      if (result.success) {
        // Show success message
        toast.success(result.action === 'liked' ? '❤️ Liked!' : '💔 Unliked');

        // Refresh the specific post's likes
        await loadPostLikes(contentId);

        return { success: true, action: result.action };
      } else {
        // Revert optimistic update on failure
        setLikesData(prevData => ({
          ...prevData,
          [contentId]: currentData
        }));
        toast.error('Failed to update like: ' + result.error);
        return { success: false };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [account, user, likesData, toast]);

  // Load likes for a specific post
  const loadPostLikes = useCallback(async (postId) => {
    try {
      const result = await SupabaseService.getLikesForPost(parseInt(postId));

      if (result.success) {
        const likers = result.data.map(like => like.user_address);
        const isLiked = account ? likers.includes(account) : false;

        setLikesData(prevData => ({
          ...prevData,
          [postId]: {
            count: likers.length,
            isLiked,
            likers
          }
        }));
      }
    } catch (error) {
      console.error('Error loading post likes:', error);
    }
  }, [account]);

  // Initialize likes for content from Supabase
  const initializeLikes = useCallback(async (contentId) => {
    if (!likesData[contentId]) {
      await loadPostLikes(contentId);
    }
  }, [likesData, loadPostLikes]);

  // Batch initialize multiple contents from Supabase
  const initializeMultipleLikes = useCallback(async (contentIds) => {
    try {
      const promises = contentIds.map(async (contentId) => {
        if (!likesData[contentId]) {
          await loadPostLikes(contentId);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error initializing multiple likes:', error);
    }
  }, [likesData, loadPostLikes]);

  // Get total likes across all content for a user's profile
  const getTotalLikesForUser = useCallback((userContentIds) => {
    return userContentIds.reduce((total, contentId) => {
      return total + (likesData[contentId]?.count || 0);
    }, 0);
  }, [likesData]);

  // Check if user has liked specific content
  const hasUserLiked = useCallback((contentId, userAddress) => {
    const data = likesData[contentId];
    return data ? data.likers.includes(userAddress) : false;
  }, [likesData]);

  const value = {
    // State
    likesData,
    loading,

    // Actions
    toggleLike,
    initializeLikes,
    initializeMultipleLikes,
    loadUserLikes,
    loadPostLikes,

    // Getters
    getLikeData,
    getTotalLikesForUser,
    hasUserLiked
  };

  return (
    <LikesContext.Provider value={value}>
      {children}
    </LikesContext.Provider>
  );
};

export default LikesContext;