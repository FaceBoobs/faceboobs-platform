// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Home,
  MessageCircle,
  User,
  PlusSquare,
  DollarSign,
  LogOut,
  Menu,
  X,
  Bell,
  Video
} from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { useNotifications } from '../contexts/NotificationsContext';
import SolanaConnectButton from './SolanaConnectButton';

const Navbar = ({ user, account, onDisconnect, onBecomeCreator, loading }) => {
  const { unreadCount: unreadNotificationsCount } = useNotifications();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getMediaUrl = (url) => url;

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!account) {
        setUnreadMessagesCount(0);
        return;
      }
      const result = await SupabaseService.countUnreadMessages(account);
      if (result.success) setUnreadMessagesCount(result.count);
    };

    loadUnreadCount();

    const handleRefreshUnreadCount = () => loadUnreadCount();
    window.addEventListener('refreshUnreadCount', handleRefreshUnreadCount);

    return () => {
      window.removeEventListener('refreshUnreadCount', handleRefreshUnreadCount);
    };
  }, [account]);

  useEffect(() => {
    if (!account) return;

    const subscription = SupabaseService.subscribeToUserMessages(account, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const m = payload.new;
        if (m.receiver_address === account.toLowerCase() && !m.is_read) {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      }

      if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
        const oldM = payload.old;
        const newM = payload.new;

        if (
          oldM.receiver_address === account.toLowerCase() &&
          !oldM.is_read &&
          newM.is_read
        ) {
          setUnreadMessagesCount((prev) => Math.max(0, prev - 1));
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [account]);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' }
  ];

  // Supabase schema: is_creator
  if (user?.is_creator) {
    navItems.push(
      { icon: PlusSquare, label: 'Create', path: '/create' },
      { icon: DollarSign, label: 'Earnings', path: '/earnings' },
      { icon: Video, label: 'Video Calls', path: '/settings/videocall' }
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-gray-50 shadow-lg border-r border-gray-200 flex-col py-6 px-3 z-50">
        <Link to="/" className="mb-8 flex justify-center">
          <img
            src={`${process.env.PUBLIC_URL}/images/fbs-logo.png`}
            alt="FaceBoobs Logo"
            className="h-16 w-16 object-contain"
          />
        </Link>

        {account && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-2">
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

              <Link
                to="/notifications"
                className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  location.pathname === '/notifications'
                    ? 'bg-white text-pink-500 font-bold shadow-sm'
                    : 'text-gray-700 hover:text-pink-400'
                }`}
              >
                <Bell size={22} />
                <span className="text-sm">Notifications</span>

                {unreadNotificationsCount > 0 && (
                  <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                    {unreadNotificationsCount > 99 ? '99' : unreadNotificationsCount}
                  </div>
                )}
              </Link>
            </div>

            {/* Profile dropdown */}
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    location.pathname === '/profile'
                      ? 'bg-white text-pink-500 font-bold shadow-sm'
                      : 'text-gray-700 hover:text-pink-400'
                  }`}
                >
                  <User size={22} />
                  <span className="text-sm">Profile</span>
                </button>

                {showUserMenu && (
                  <div className="absolute left-full bottom-0 ml-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <User size={16} />
                      <span>View Profile</span>
                    </Link>

                    {!user?.is_creator && (
                      <div className="border-t border-gray-100 my-1">
                        <div className="px-4 py-2 text-sm text-gray-500">Want to earn money?</div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onBecomeCreator?.();
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
                          onDisconnect?.();
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

          </div>
        )}
      </nav>

      {/* Desktop top bar */}
      <div className="hidden md:block fixed top-0 left-56 right-0 bg-white shadow-sm border-b border-gray-200 px-6 py-3 z-40">
        <div className="flex items-center justify-end">
          <SolanaConnectButton />
        </div>
      </div>

      {/* Mobile */}
      {account && (
        <>
          <header className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md py-3 px-4 z-40 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img
                src={`${process.env.PUBLIC_URL}/images/fbs-logo.png`}
                alt="FaceBoobs Logo"
                className="h-10 w-10 object-contain"
              />
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-gray-700 hover:text-pink-500 transition-colors"
            >
              <Menu size={28} />
            </button>
          </header>

          <div
            className={`md:hidden fixed inset-y-0 right-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col h-full pb-20 overflow-y-auto">
              <div className="flex-1 py-4 px-3 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isMessages = item.path === '/messages';
                  const showBadge = isMessages && unreadMessagesCount > 0;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={22} />
                      <span>{item.label}</span>
                      {showBadge && (
                        <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                        </div>
                      )}
                    </Link>
                  );
                })}

                <Link
                  to="/notifications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    location.pathname === '/notifications'
                      ? 'bg-pink-50 text-pink-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bell size={22} />
                  <span>Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <div className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </div>
                  )}
                </Link>
              </div>

              <div className="border-t border-gray-200 p-4 space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.avatar_url && getMediaUrl(user.avatar_url) ? (
                      <img
                        src={getMediaUrl(user.avatar_url)}
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
                      style={{ display: user?.avatar_url && getMediaUrl(user.avatar_url) ? 'none' : 'flex' }}
                    >
                      {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{user?.username || 'User'}</p>
                    <p className="text-xs text-gray-500">View Profile</p>
                  </div>
                </Link>

                {!user?.is_creator && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onBecomeCreator?.();
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Become a Creator'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onDisconnect?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            />
          )}
        </>
      )}
    </>
  );
};

export default Navbar;
