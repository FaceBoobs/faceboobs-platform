// src/contexts/NotificationsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationsStorage } from '../utils/storageUtils';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = notificationsStorage.get();
    if (savedNotifications && savedNotifications.length > 0) {
      setNotifications(savedNotifications);
      const unread = savedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } else {
      // Initialize with mock notifications only if no saved data exists
      const mockNotifications = generateMockNotifications();
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
      // Save initial mock data
      notificationsStorage.set(mockNotifications);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      notificationsStorage.set(notifications);
      // Update unread count based on current notifications
      const unread = notifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    }
  }, [notifications]);

  // Mock notifications for demo - in a real app, these would come from the backend/blockchain
  const generateMockNotifications = () => {
    const mockNotifications = [
      {
        id: 1,
        type: 'like',
        user: {
          username: 'alice_creator',
          avatar: 'QmMockAvatar1'
        },
        message: 'liked your post',
        postId: 3,
        timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
        read: false
      },
      {
        id: 2,
        type: 'follow',
        user: {
          username: 'bob_photographer',
          avatar: 'QmMockAvatar2'
        },
        message: 'started following you',
        timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        read: false
      },
      {
        id: 3,
        type: 'comment',
        user: {
          username: 'charlie_dev',
          avatar: 'QmMockAvatar3'
        },
        message: 'commented on your post: "Amazing work! How did you create this?"',
        postId: 5,
        timestamp: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
        read: true
      },
      {
        id: 4,
        type: 'like',
        user: {
          username: 'diana_artist',
          avatar: 'QmMockAvatar4'
        },
        message: 'liked your story',
        storyId: 2,
        timestamp: Date.now() - 1000 * 60 * 60 * 8, // 8 hours ago
        read: true
      },
      {
        id: 5,
        type: 'follow',
        user: {
          username: 'eve_designer',
          avatar: 'QmMockAvatar5'
        },
        message: 'started following you',
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        read: false
      },
      {
        id: 6,
        type: 'comment',
        user: {
          username: 'frank_writer',
          avatar: 'QmMockAvatar6'
        },
        message: 'commented on your post: "This is incredible! Can you share your workflow?"',
        postId: 7,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
        read: true
      },
      {
        id: 7,
        type: 'like',
        user: {
          username: 'grace_musician',
          avatar: 'QmMockAvatar7'
        },
        message: 'liked your post',
        postId: 1,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
        read: true
      }
    ];

    return mockNotifications;
  };


  // Add a new notification
  const addNotification = (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now(),
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  // Get notifications by type
  const getNotificationsByType = (type) => {
    return notifications.filter(notification => notification.type === type);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'follow':
        return '👤';
      case 'comment':
        return '💬';
      default:
        return '🔔';
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'like':
        return 'text-red-600';
      case 'follow':
        return 'text-blue-600';
      case 'comment':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Simulate receiving new notifications (for demo)
  const simulateNotification = (type) => {
    const mockUsers = [
      { username: 'new_user1', avatar: 'QmNewAvatar1' },
      { username: 'new_user2', avatar: 'QmNewAvatar2' },
      { username: 'new_user3', avatar: 'QmNewAvatar3' }
    ];

    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
    
    let message = '';
    switch (type) {
      case 'like':
        message = Math.random() > 0.5 ? 'liked your post' : 'liked your story';
        break;
      case 'follow':
        message = 'started following you';
        break;
      case 'comment':
        message = 'commented on your post: "Great content!"';
        break;
      default:
        message = 'interacted with your content';
    }

    addNotification({
      type,
      user: randomUser,
      message,
      postId: Math.floor(Math.random() * 10) + 1
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    getNotificationsByType,
    formatTimestamp,
    getNotificationIcon,
    getNotificationColor,
    simulateNotification
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsContext;