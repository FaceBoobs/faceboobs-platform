// src/services/notificationService.js
// Service for managing user notifications (follow, like, comment, message)

import { supabase } from '../supabaseClient';

/**
 * Create a follow notification
 * @param {string} userAddress - Address of the user being followed
 * @param {string} followerAddress - Address of the user who followed
 * @param {string} followerUsername - Username of the follower
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createFollowNotification = async (userAddress, followerAddress, followerUsername = null) => {
  try {
    console.log('🔔 Creating follow notification:', {
      userAddress,
      followerAddress,
      followerUsername
    });

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_address: userAddress.toLowerCase(),
        type: 'follow',
        from_address: followerAddress.toLowerCase(),
        from_username: followerUsername,
        content: 'started following you',
        is_read: false
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Follow notification created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating follow notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a like notification
 * @param {string} userAddress - Address of the post owner
 * @param {string} likerAddress - Address of the user who liked
 * @param {string} likerUsername - Username of the liker
 * @param {number} postId - ID of the post that was liked
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createLikeNotification = async (userAddress, likerAddress, likerUsername, postId) => {
  try {
    // Don't create notification if user likes their own post
    if (userAddress.toLowerCase() === likerAddress.toLowerCase()) {
      return { success: true, data: null };
    }

    console.log('🔔 Creating like notification:', {
      userAddress,
      likerAddress,
      likerUsername,
      postId
    });

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_address: userAddress.toLowerCase(),
        type: 'like',
        from_address: likerAddress.toLowerCase(),
        from_username: likerUsername,
        content: 'liked your post',
        post_id: postId,
        is_read: false
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Like notification created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating like notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a comment notification
 * @param {string} userAddress - Address of the post owner
 * @param {string} commenterAddress - Address of the user who commented
 * @param {string} commenterUsername - Username of the commenter
 * @param {number} postId - ID of the post that was commented on
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createCommentNotification = async (userAddress, commenterAddress, commenterUsername, postId) => {
  try {
    // Don't create notification if user comments on their own post
    if (userAddress.toLowerCase() === commenterAddress.toLowerCase()) {
      return { success: true, data: null };
    }

    console.log('🔔 Creating comment notification:', {
      userAddress,
      commenterAddress,
      commenterUsername,
      postId
    });

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_address: userAddress.toLowerCase(),
        type: 'comment',
        from_address: commenterAddress.toLowerCase(),
        from_username: commenterUsername,
        content: 'commented on your post',
        post_id: postId,
        is_read: false
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Comment notification created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating comment notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a message notification
 * @param {string} userAddress - Address of the message receiver
 * @param {string} senderAddress - Address of the message sender
 * @param {string} senderUsername - Username of the sender
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createMessageNotification = async (userAddress, senderAddress, senderUsername) => {
  try {
    console.log('🔔 Creating message notification:', {
      userAddress,
      senderAddress,
      senderUsername
    });

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_address: userAddress.toLowerCase(),
        type: 'message',
        from_address: senderAddress.toLowerCase(),
        from_username: senderUsername,
        content: 'sent you a message',
        is_read: false
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Message notification created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating message notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unread notifications count for a user
 * @param {string} userAddress - Address of the user
 * @returns {Promise<number>}
 */
export const getUnreadNotificationsCount = async (userAddress) => {
  try {
    console.log('🔍 Getting unread notifications count for:', userAddress);

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_address', userAddress.toLowerCase())
      .eq('is_read', false);

    if (error) throw error;

    console.log('✅ Unread notifications count:', count || 0);
    return count || 0;
  } catch (error) {
    console.error('❌ Error getting unread notifications count:', error);
    return 0;
  }
};

/**
 * Get all notifications for a user
 * @param {string} userAddress - Address of the user
 * @param {number} limit - Maximum number of notifications to fetch
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getNotifications = async (userAddress, limit = 50) => {
  try {
    console.log('🔍 Getting notifications for:', userAddress);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log('✅ Fetched notifications:', data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Mark a single notification as read
 * @param {number} notificationId - ID of the notification
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    console.log('✅ Marking notification as read:', notificationId);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;

    console.log('✅ Notification marked as read');
    return { success: true };
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userAddress - Address of the user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markAllNotificationsAsRead = async (userAddress) => {
  try {
    console.log('✅ Marking all notifications as read for:', userAddress);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_address', userAddress.toLowerCase())
      .eq('is_read', false);

    if (error) throw error;

    console.log('✅ All notifications marked as read');
    return { success: true };
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unread messages count for a user
 * @param {string} userAddress - Address of the user
 * @returns {Promise<number>}
 */
export const getUnreadMessagesCount = async (userAddress) => {
  try {
    console.log('🔍 Getting unread messages count for:', userAddress);

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_address', userAddress.toLowerCase())
      .eq('is_read', false);

    if (error) throw error;

    console.log('✅ Unread messages count:', count || 0);
    return count || 0;
  } catch (error) {
    console.error('❌ Error getting unread messages count:', error);
    return 0;
  }
};

/**
 * Mark messages as read for a specific conversation
 * @param {string} userAddress - Address of the current user (receiver)
 * @param {string} otherUserAddress - Address of the other user (sender)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markMessagesAsRead = async (userAddress, otherUserAddress) => {
  try {
    console.log('✅ Marking messages as read:', {
      receiver: userAddress,
      sender: otherUserAddress
    });

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_address', userAddress.toLowerCase())
      .eq('sender_address', otherUserAddress.toLowerCase())
      .eq('is_read', false);

    if (error) throw error;

    console.log('✅ Messages marked as read');
    return { success: true };
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete old read notifications (cleanup utility)
 * @param {number} daysOld - Delete notifications older than this many days
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
 */
export const cleanupOldNotifications = async (daysOld = 30) => {
  try {
    console.log(`🗑️ Cleaning up notifications older than ${daysOld} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', cutoffDate.toISOString())
      .select();

    if (error) throw error;

    console.log('✅ Cleaned up notifications:', data?.length || 0);
    return { success: true, deletedCount: data?.length || 0 };
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createFollowNotification,
  createLikeNotification,
  createCommentNotification,
  createMessageNotification,
  getUnreadNotificationsCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadMessagesCount,
  markMessagesAsRead,
  cleanupOldNotifications
};
