// src/pages/Notifications.js
import React, { useState } from 'react';
import { Bell, Heart, UserPlus, MessageCircle, Check, Filter } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getNotificationsByType,
    formatTimestamp,
    getNotificationIcon,
    getNotificationColor,
    simulateNotification
  } = useNotifications();

  const filters = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'like', label: 'Likes', icon: Heart },
    { id: 'follow', label: 'Follows', icon: UserPlus },
    { id: 'comment', label: 'Comments', icon: MessageCircle }
  ];

  const getFilteredNotifications = () => {
    if (selectedFilter === 'all') {
      return notifications;
    }
    return getNotificationsByType(selectedFilter);
  };

  const filteredNotifications = getFilteredNotifications();

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.postId) {
      // Navigate to post (in a real app, this would go to the specific post)
      navigate('/');
    } else if (notification.storyId) {
      // Navigate to stories
      navigate('/');
    } else if (notification.type === 'follow') {
      // Navigate to the user's profile
      navigate('/');
    }
  };

  const getAvatarUrl = (avatarHash) => {
    // Use actual uploaded avatar or return null for placeholder
    if (!avatarHash || avatarHash.startsWith('QmMock') || avatarHash.startsWith('QmNew')) {
      return null; // Will show user initial instead
    }
    return `https://ipfs.io/ipfs/${avatarHash}`;
  };

  const getFilterCount = (filterType) => {
    if (filterType === 'all') return notifications.length;
    return getNotificationsByType(filterType).length;
  };

  const getUnreadFilterCount = (filterType) => {
    const filtered = filterType === 'all' 
      ? notifications 
      : getNotificationsByType(filterType);
    return filtered.filter(n => !n.read).length;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="mr-3" size={28} />
              Notifications
            </h1>
            <p className="text-gray-600 mt-1">
              Stay updated with your latest activity
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Check size={16} />
                <span>Mark all read ({unreadCount})</span>
              </button>
            )}
            
            {/* Demo buttons for testing */}
            <div className="flex space-x-2">
              <button
                onClick={() => simulateNotification('like')}
                className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                + Like
              </button>
              <button
                onClick={() => simulateNotification('follow')}
                className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                + Follow
              </button>
              <button
                onClick={() => simulateNotification('comment')}
                className="bg-green-100 text-green-600 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors text-sm"
              >
                + Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {filters.map((filter) => {
            const IconComponent = filter.icon;
            const count = getFilterCount(filter.id);
            const unreadCount = getUnreadFilterCount(filter.id);
            
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
                  selectedFilter === filter.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <IconComponent size={18} />
                  <span>{filter.label}</span>
                  {count > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-1">
                      {count}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="absolute top-3 right-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-gray-100">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
                      {getAvatarUrl(notification.user.avatar) ? (
                        <img
                          src={getAvatarUrl(notification.user.avatar)}
                          alt={notification.user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-pink-800 font-semibold">
                          {notification.user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Notification Type Icon */}
                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center border-2 border-white text-lg ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {notification.user.username}
                        </span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-2">
                      {notification.message}
                    </p>

                    {/* Action buttons based on notification type */}
                    <div className="flex items-center space-x-3 text-sm">
                      {notification.type === 'follow' && (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          View Profile
                        </button>
                      )}
                      {(notification.postId || notification.storyId) && (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          View {notification.postId ? 'Post' : 'Story'}
                        </button>
                      )}
                      {notification.type === 'comment' && (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {selectedFilter !== 'all' ? selectedFilter : ''} notifications
              </h3>
              <p className="text-gray-500">
                {selectedFilter === 'all' 
                  ? 'You\'re all caught up! New notifications will appear here.'
                  : `No ${selectedFilter} notifications yet.`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {notifications.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {getNotificationsByType('like').length}
              </div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getNotificationsByType('follow').length}
              </div>
              <div className="text-sm text-gray-600">Follows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getNotificationsByType('comment').length}
              </div>
              <div className="text-sm text-gray-600">Comments</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;