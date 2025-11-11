// src/components/NotificationDropdown.js
import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';
import { useWeb3 } from '../contexts/Web3Context';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    formatTimestamp,
    getNotificationIcon,
    getNotificationColor
  } = useNotifications();

  const { getMediaUrl } = useWeb3();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    // Mark all as read when opening dropdown
    if (newIsOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleNotificationClick = (notification) => {
    console.log('🔔 Notification clicked:', notification);

    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Close dropdown
    setIsOpen(false);

    // Navigate based on notification type
    if (notification.post_id && notification.from_user_address) {
      console.log('📬 Navigating to creator profile with post:', notification.post_id);
      // For post-related notifications (like, comment, purchase), go to creator's profile
      navigate(`/profile/${notification.from_user_address}`, {
        state: { scrollToPostId: notification.post_id }
      });
    } else if (notification.type === 'follow' && notification.from_user_address) {
      console.log('👤 Navigating to profile:', notification.from_user_address);
      // Navigate to the user's profile
      navigate(`/profile/${notification.from_user_address}`);
    } else {
      console.log('🏠 Navigating to home (no specific target)');
      // Default: navigate to home
      navigate('/');
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  // Recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                >
                  <Check size={14} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => {
                  const username = notification.from_username || 'Unknown User';
                  const avatarUrl = notification.from_avatar_url;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* User Avatar */}
                        <div className="flex-shrink-0 relative">
                          <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
                            {avatarUrl && getMediaUrl(avatarUrl) ? (
                              <img
                                src={getMediaUrl(avatarUrl)}
                                alt={username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span
                              className="text-pink-800 font-semibold text-sm"
                              style={avatarUrl && getMediaUrl(avatarUrl) ? { display: 'none' } : {}}
                            >
                              {username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {/* Notification Type Icon */}
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center border-2 border-white text-sm ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900 text-sm">
                              {username}
                            </span>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {formatTimestamp(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="border-t border-gray-200 p-3">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-blue-600 hover:text-blue-800 font-medium text-sm py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;