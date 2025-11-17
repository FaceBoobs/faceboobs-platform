// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Home, MessageCircle, User, PlusSquare, DollarSign, LogOut } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { SupabaseService } from '../services/supabaseService';
import { useWeb3 } from '../contexts/Web3Context';

const Navbar = ({ user, account, onConnect, onDisconnect, onBecomeCreator, loading }) => {
  const { getMediaUrl } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Load initial unread messages count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!account) {
        setUnreadMessagesCount(0);
        return;
      }

      const result = await SupabaseService.countUnreadMessages(account);
      if (result.success) {
        setUnreadMessagesCount(result.count);
        console.log('📊 [Navbar] Loaded unread count:', result.count);
      }
    };

    loadUnreadCount();

    // Listen for manual refresh requests (e.g., after marking messages as read)
    const handleRefreshUnreadCount = () => {
      console.log('🔄 [Navbar] Refreshing unread count on request');
      loadUnreadCount();
    };

    window.addEventListener('refreshUnreadCount', handleRefreshUnreadCount);

    return () => {
      window.removeEventListener('refreshUnreadCount', handleRefreshUnreadCount);
    };
  }, [account]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!account) return;

    console.log('📡 [Navbar] Subscribing to real-time messages for:', account);

    const subscription = SupabaseService.subscribeToUserMessages(account, (payload) => {
      console.log('🔔 [Navbar] New message event:', payload.eventType);

      // If a new message is inserted and user is the receiver
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;

        // If current user is the receiver and message is not read
        if (newMessage.receiver_address === account.toLowerCase() && !newMessage.is_read) {
          console.log('📩 [Navbar] New unread message received, incrementing count');
          setUnreadMessagesCount(prev => prev + 1);
        }
      }

      // If messages are updated (marked as read)
      if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
        const oldMessage = payload.old;
        const newMessage = payload.new;

        // If message was unread and now is read, and current user was the receiver
        if (oldMessage.receiver_address === account.toLowerCase() &&
            !oldMessage.is_read && newMessage.is_read) {
          console.log('✅ [Navbar] Message marked as read, decrementing count');
          setUnreadMessagesCount(prev => Math.max(0, prev - 1));
        }
      }
    });

    return () => {
      console.log('🔌 [Navbar] Unsubscribing from messages');
      subscription?.unsubscribe();
    };
  }, [account]);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
  ];

  if (user?.isCreator) {
    navItems.push(
      { icon: PlusSquare, label: 'Create', path: '/create-post' },
      { icon: DollarSign, label: 'Earnings', path: '/earnings' }
    );
  }

  return (
    <>
      {/* Desktop - Vertical Sidebar Left */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-gray-50 shadow-lg border-r border-gray-200 flex-col py-6 px-3 z-50">
        {/* Logo at top - centered and larger */}
        <Link to="/" className="mb-8 flex justify-center">
          <img
            src={`${process.env.PUBLIC_URL}/images/fbs-logo.png`}
            alt="FaceBoobs Logo"
            className="h-16 w-16 object-contain"
          />
        </Link>

        {/* Navigation Items - Vertical Center */}
        {user && (
          <div className="flex-1 flex flex-col space-y-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isMessages = item.path === '/messages';
              const showBadge = isMessages && unreadMessagesCount > 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    isActive
                      ? 'bg-white text-pink-500 font-bold shadow-sm'
                      : 'text-gray-700 hover:text-pink-400'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-sm">{item.label}</span>
                  {showBadge && (
                    <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                      {unreadMessagesCount > 99 ? '99' : unreadMessagesCount}
                    </div>
                  )}
                </Link>
              );
            })}

            {/* Notifications Item */}
            <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-400 transition-all">
              <NotificationDropdown
                iconSize={22}
                className="relative"
              />
              <span className="text-sm cursor-pointer" onClick={() => navigate('/notifications')}>Notifications</span>
            </div>
          </div>
        )}

        {/* Bottom - Profile */}
        {account && user ? (
          <div className="mt-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-400 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user?.avatarHash && getMediaUrl(user.avatarHash) ? (
                    <img
                      src={getMediaUrl(user.avatarHash)}
                      alt={`${user?.username || 'User'}'s avatar`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span
                    className="text-white font-semibold text-sm w-full h-full flex items-center justify-center"
                    style={{ display: user?.avatarHash && getMediaUrl(user.avatarHash) ? 'none' : 'flex' }}
                  >
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium">Profile</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute left-full bottom-0 ml-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>

                  {!user?.isCreator && (
                    <div className="border-t border-gray-100 my-1">
                      <div className="px-4 py-2 text-sm text-gray-500">
                        Want to earn money?
                      </div>
                      <button
                        onClick={() => {
                          console.log('🎯 Become Creator button clicked in Navbar');
                          setShowUserMenu(false);
                          onBecomeCreator && onBecomeCreator();
                        }}
                        disabled={loading}
                        className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Processing...' : 'Become a Creator'}
                      </button>
                    </div>
                  )}

                  <div className="border-t border-gray-100 my-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onDisconnect();
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:text-pink-400 disabled:opacity-50 transition-all"
            title="Connect Wallet"
          >
            <User size={22} />
            <span className="text-sm font-medium">Connect</span>
          </button>
        )}
      </nav>

      {/* Mobile - Horizontal Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 shadow-lg border-t border-pink-300 z-50">
          <div className="flex justify-around items-center py-3 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isMessages = item.path === '/messages';
              const showBadge = isMessages && unreadMessagesCount > 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-pink-600 scale-110'
                      : 'text-white'
                  }`}
                >
                  <Icon size={22} />
                  {showBadge && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadMessagesCount > 99 ? '99' : unreadMessagesCount}
                    </div>
                  )}
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Profile Icon on Mobile */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative flex flex-col items-center justify-center space-y-1 px-3 py-2"
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
                {user?.avatarHash && getMediaUrl(user.avatarHash) ? (
                  <img
                    src={getMediaUrl(user.avatarHash)}
                    alt={`${user?.username || 'User'}'s avatar`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="text-pink-600 font-semibold text-xs w-full h-full flex items-center justify-center"
                  style={{ display: user?.avatarHash && getMediaUrl(user.avatarHash) ? 'none' : 'flex' }}
                >
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-xs font-medium text-white">Profile</span>

              {/* Mobile Dropdown */}
              {showUserMenu && (
                <div className="absolute bottom-16 right-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>

                  {!user?.isCreator && (
                    <div className="border-t border-gray-100 my-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onBecomeCreator && onBecomeCreator();
                        }}
                        disabled={loading}
                        className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 font-medium disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Become a Creator'}
                      </button>
                    </div>
                  )}

                  <div className="border-t border-gray-100 my-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onDisconnect();
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </button>
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;
