// src/contexts/NotificationsContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { useWeb3 } from './Web3Context';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { account, user } = useWeb3();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load notifications from Supabase when account changes
  const loadNotifications = useCallback(async () => {
    if (!account) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const result = await SupabaseService.getNotifications(account, 50);

      if (result.success && result.data) {
        setNotifications(result.data);
        const unread = result.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Load notifications when account changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Setup real-time subscription for new notifications
  // TEMPORANEAMENTE DISABILITATO - Causa "Illegal constructor" error
  // TODO: Reimplementare con gestione corretta di Supabase Realtime
  /*
  useEffect(() => {
    if (!account) return;

    console.log('🔔 Setting up real-time notifications for:', account);

    let subscription = null;

    try {
      subscription = SupabaseService.subscribeToNotifications(account, (payload) => {
        try {
          console.log('🔔 New notification received:', payload);

          // The payload contains the new notification in payload.new
          const notification = payload.new;
          if (notification) {
            // Add new notification to the list
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        } catch (error) {
          console.error('❌ Error processing notification:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error setting up notification subscription:', error);
    }

    return () => {
      console.log('🔔 Cleaning up real-time notifications');
      try {
        if (subscription) {
          if (typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          } else if (subscription.channel) {
            // Alternative cleanup method for Supabase channels
            subscription.channel.unsubscribe();
          }
        }
      } catch (error) {
        console.error('❌ Error cleaning up subscription:', error);
      }
    };
  }, [account]);
  */

  // Add a new notification (optimistic update - notification is already created in Supabase)
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!account) return;

    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Update in Supabase
      const result = await SupabaseService.markNotificationAsRead(notificationId, account);

      if (!result.success) {
        console.error('Failed to mark notification as read:', result.error);
        // Reload to get correct state
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      await loadNotifications();
    }
  }, [account, loadNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!account) return;

    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);

      // Update in Supabase
      const result = await SupabaseService.markAllNotificationsAsRead(account);

      if (!result.success) {
        console.error('Failed to mark all notifications as read:', result.error);
        // Reload to get correct state
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      await loadNotifications();
    }
  }, [account, loadNotifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = useCallback((type) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'purchase':
        return '💰';
      default:
        return '🔔';
    }
  }, []);

  // Get notification color based on type
  const getNotificationColor = useCallback((type) => {
    switch (type) {
      case 'like':
        return 'text-red-600';
      case 'comment':
        return 'text-green-600';
      case 'purchase':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    loadNotifications,
    getNotificationsByType,
    formatTimestamp,
    getNotificationIcon,
    getNotificationColor
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsContext;