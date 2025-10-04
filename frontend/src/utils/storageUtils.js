// src/utils/storageUtils.js
// Centralized localStorage utilities for data persistence

const STORAGE_KEYS = {
  LIKES: 'socialweb3_likes',
  COMMENTS: 'socialweb3_comments',
  NOTIFICATIONS: 'socialweb3_notifications',
  DELETED_POSTS: 'socialweb3_deleted_posts',
  NOTIFICATION_READ_STATUS: 'socialweb3_notification_read_status',
  USER_PREFERENCES: 'socialweb3_user_preferences',
  STORIES: 'socialweb3_stories'
};

// Generic localStorage utilities
export const storage = {
  // Get data from localStorage
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  // Set data to localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  },

  // Remove data from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  },

  // Clear all app data
  clearAll: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

// Likes persistence utilities
export const likesStorage = {
  get: () => storage.get(STORAGE_KEYS.LIKES, {}),
  set: (likesData) => storage.set(STORAGE_KEYS.LIKES, likesData),

  // Get like data for specific content
  getContentLikes: (contentId) => {
    const allLikes = likesStorage.get();
    return allLikes[contentId] || { count: 0, isLiked: false, likers: [] };
  },

  // Update likes for specific content
  updateContentLikes: (contentId, likeData) => {
    const allLikes = likesStorage.get();
    allLikes[contentId] = likeData;
    return likesStorage.set(allLikes);
  },

  // Toggle like for content
  toggleLike: (contentId, userAddress) => {
    const allLikes = likesStorage.get();
    const currentData = allLikes[contentId] || { count: 0, isLiked: false, likers: [] };

    if (currentData.isLiked) {
      // Remove like
      currentData.count = Math.max(0, currentData.count - 1);
      currentData.isLiked = false;
      currentData.likers = currentData.likers.filter(addr => addr !== userAddress);
    } else {
      // Add like
      currentData.count += 1;
      currentData.isLiked = true;
      if (!currentData.likers.includes(userAddress)) {
        currentData.likers.push(userAddress);
      }
    }

    allLikes[contentId] = currentData;
    likesStorage.set(allLikes);
    return currentData;
  }
};

// Comments persistence utilities
export const commentsStorage = {
  get: () => storage.get(STORAGE_KEYS.COMMENTS, {}),
  set: (commentsData) => storage.set(STORAGE_KEYS.COMMENTS, commentsData),

  // Get comments for specific content
  getContentComments: (contentId) => {
    const allComments = commentsStorage.get();
    return allComments[contentId] || [];
  },

  // Add comment to content
  addComment: (contentId, comment) => {
    const allComments = commentsStorage.get();
    if (!allComments[contentId]) {
      allComments[contentId] = [];
    }

    const newComment = {
      id: Date.now().toString(),
      text: comment.text,
      author: comment.author,
      authorAddress: comment.authorAddress,
      timestamp: Date.now(),
      ...comment
    };

    allComments[contentId].unshift(newComment);
    commentsStorage.set(allComments);
    return newComment;
  },

  // Get comment count for content
  getCommentCount: (contentId) => {
    const comments = commentsStorage.getContentComments(contentId);
    return comments.length;
  },

  // Remove comment
  removeComment: (contentId, commentId) => {
    const allComments = commentsStorage.get();
    if (allComments[contentId]) {
      allComments[contentId] = allComments[contentId].filter(c => c.id !== commentId);
      commentsStorage.set(allComments);
      return true;
    }
    return false;
  }
};

// Notifications persistence utilities
export const notificationsStorage = {
  get: () => storage.get(STORAGE_KEYS.NOTIFICATIONS, []),
  set: (notifications) => storage.set(STORAGE_KEYS.NOTIFICATIONS, notifications),

  // Add new notification
  add: (notification) => {
    const notifications = notificationsStorage.get();
    const newNotification = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false,
      ...notification
    };

    notifications.unshift(newNotification);

    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(50);
    }

    notificationsStorage.set(notifications);
    return newNotification;
  },

  // Mark notification as read
  markAsRead: (notificationId) => {
    const notifications = notificationsStorage.get();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notificationsStorage.set(notifications);
      return true;
    }
    return false;
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    const notifications = notificationsStorage.get();
    notifications.forEach(n => n.read = true);
    notificationsStorage.set(notifications);
    return notifications.length;
  },

  // Get unread count
  getUnreadCount: () => {
    const notifications = notificationsStorage.get();
    return notifications.filter(n => !n.read).length;
  },

  // Remove old notifications (older than 30 days)
  cleanup: () => {
    const notifications = notificationsStorage.get();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filteredNotifications = notifications.filter(n => n.timestamp > thirtyDaysAgo);

    if (filteredNotifications.length !== notifications.length) {
      notificationsStorage.set(filteredNotifications);
      return notifications.length - filteredNotifications.length;
    }
    return 0;
  }
};

// Deleted posts persistence utilities
export const deletedPostsStorage = {
  get: () => storage.get(STORAGE_KEYS.DELETED_POSTS, []),
  set: (deletedPosts) => storage.set(STORAGE_KEYS.DELETED_POSTS, deletedPosts),

  // Add post to deleted list
  add: (postId) => {
    const deletedPosts = deletedPostsStorage.get();
    const postIdStr = postId.toString();

    if (!deletedPosts.includes(postIdStr)) {
      deletedPosts.push(postIdStr);
      deletedPostsStorage.set(deletedPosts);
    }
    return deletedPosts;
  },

  // Check if post is deleted
  isDeleted: (postId) => {
    const deletedPosts = deletedPostsStorage.get();
    return deletedPosts.includes(postId.toString());
  },

  // Remove post from deleted list (restore)
  restore: (postId) => {
    const deletedPosts = deletedPostsStorage.get();
    const filteredPosts = deletedPosts.filter(id => id !== postId.toString());
    deletedPostsStorage.set(filteredPosts);
    return filteredPosts;
  }
};

// User preferences utilities
export const preferencesStorage = {
  get: () => storage.get(STORAGE_KEYS.USER_PREFERENCES, {}),
  set: (preferences) => storage.set(STORAGE_KEYS.USER_PREFERENCES, preferences),

  // Get specific preference
  getPreference: (key, defaultValue = null) => {
    const preferences = preferencesStorage.get();
    return preferences[key] || defaultValue;
  },

  // Set specific preference
  setPreference: (key, value) => {
    const preferences = preferencesStorage.get();
    preferences[key] = value;
    return preferencesStorage.set(preferences);
  }
};

// Stories persistence utilities
export const storiesStorage = {
  // Get all stories from localStorage
  getAll: () => {
    const allKeys = Object.keys(localStorage);
    const storyKeys = allKeys.filter(key => key.startsWith('story_'));
    const stories = [];
    const currentTime = Math.floor(Date.now() / 1000);

    storyKeys.forEach(storyKey => {
      try {
        const storyDataString = localStorage.getItem(storyKey);
        if (storyDataString) {
          const storyData = JSON.parse(storyDataString);

          // Check if story has expired (24 hours)
          if (storyData.expiryTime && currentTime > storyData.expiryTime) {
            localStorage.removeItem(storyKey);
            return; // Skip expired story
          }

          stories.push(storyData);
        }
      } catch (error) {
        console.error('Error loading story:', storyKey, error);
      }
    });

    // Sort by timestamp (newest first)
    return stories.sort((a, b) => b.timestamp - a.timestamp);
  },

  // Save a story to localStorage
  save: (storyData) => {
    const storyKey = `story_${storyData.id}`;
    return storage.set(storyKey, storyData);
  },

  // Get story by ID
  getById: (storyId) => {
    const storyKey = `story_${storyId}`;
    return storage.get(storyKey, null);
  },

  // Remove story by ID
  remove: (storyId) => {
    const storyKey = `story_${storyId}`;
    return storage.remove(storyKey);
  },

  // Cleanup expired stories
  cleanupExpired: () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const allKeys = Object.keys(localStorage);
    const storyKeys = allKeys.filter(key => key.startsWith('story_'));
    let cleanedCount = 0;

    storyKeys.forEach(storyKey => {
      try {
        const storyDataString = localStorage.getItem(storyKey);
        if (storyDataString) {
          const storyData = JSON.parse(storyDataString);

          // Check if story has expired (24 hours)
          if (storyData.expiryTime && currentTime > storyData.expiryTime) {
            localStorage.removeItem(storyKey);
            cleanedCount++;
          }
        }
      } catch (error) {
        console.error('Error checking story expiry:', storyKey, error);
      }
    });

    return cleanedCount;
  },

  // Get stories by creator address
  getByCreator: (creatorAddress) => {
    const allStories = storiesStorage.getAll();
    return allStories.filter(story => story.creator === creatorAddress);
  },

  // Get active stories count
  getActiveCount: () => {
    const allStories = storiesStorage.getAll();
    return allStories.length;
  }
};

// Export storage keys for consistency
export { STORAGE_KEYS };

// Data migration utilities (for future updates)
export const migrationUtils = {
  // Check if data migration is needed
  checkMigration: () => {
    const version = storage.get('data_version', 1);
    const currentVersion = 1;
    return version < currentVersion;
  },

  // Run data migrations
  migrate: () => {
    // Future migration logic goes here
    storage.set('data_version', 1);
  }
};

// Debug utilities for development
export const debugStorage = {
  // Log all stored data
  logAll: () => {
    console.group('📦 LocalStorage Debug');
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const data = storage.get(key);
      console.log(`${name}:`, data);
    });
    console.groupEnd();
  },

  // Get storage size estimation
  getStorageSize: () => {
    let total = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        total += data.length;
      }
    });
    return {
      bytes: total,
      kb: (total / 1024).toFixed(2),
      mb: (total / (1024 * 1024)).toFixed(2)
    };
  }
};