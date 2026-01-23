// src/pages/Notifications.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Mail, Check, CheckCheck, Bell } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationsContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Notifications = () => {
  const { account, user, loading: web3Loading } = useWeb3();
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    notifications: allNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  const [markingAll, setMarkingAll] = useState(false);

  // Filter to show only unread notifications
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Show only unread notifications
    const unreadNotifications = allNotifications.filter(notif => !notif.is_read);
    console.log('📬 Showing unread notifications:', unreadNotifications.length);
    setNotifications(unreadNotifications);
  }, [allNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      console.log('✅ Marking all notifications as read');

      await markAllAsRead();
      toast.success('All notifications marked as read');
      // Clear the list since all are now read
      setNotifications([]);
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      toast.error('Error marking notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    console.log('🔔 Notification clicked:', notification.id);

    // Mark as read immediately in database
    if (!notification.is_read) {
      console.log('✅ Marking notification as read:', notification.id);
      await markAsRead(notification.id);
    }

    // Remove notification from list (make it disappear)
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notification.id)
    );

    console.log('✅ Notification removed from list');

    // Navigate based on notification type
    switch (notification.type) {
      case 'follow':
        navigate(`/profile/${notification.from_address}`);
        break;
      case 'like':
      case 'comment':
        if (notification.post_id) {
          navigate('/'); // Navigate to home feed (could be improved to navigate to specific post)
        }
        break;
      case 'message':
        navigate('/messages');
        break;
      default:
        console.log('Unknown notification type:', notification.type);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return <UserPlus size={20} className="text-blue-500" />;
      case 'like':
        return <Heart size={20} className="text-pink-500" />;
      case 'comment':
        return <MessageCircle size={20} className="text-purple-500" />;
      case 'message':
        return <Mail size={20} className="text-green-500" />;
      default:
        return <Check size={20} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (web3Loading || loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Access Required</h2>
          <p className="text-yellow-600">Please connect your wallet to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="mr-3" size={28} />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <CheckCheck size={18} />
              <span>{markingAll ? 'Marking...' : 'Mark all as read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No notifications yet</h2>
            <p className="text-gray-500">
              When someone follows you, likes your posts, or comments, you'll see it here!
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer ${
                notification.is_read
                  ? 'border-gray-200 hover:border-gray-300'
                  : 'border-pink-200 bg-pink-50 hover:border-pink-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">
                            {notification.from_username ||
                              `${notification.from_address?.slice(0, 6)}...${notification.from_address?.slice(-4)}`}
                          </span>
                          {' '}
                          <span className="text-gray-700">{notification.content}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="ml-3 flex-shrink-0">
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty state at bottom if there are notifications */}
      {notifications.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">You're all caught up!</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
