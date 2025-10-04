// src/components/Navbar.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Home, MessageCircle, User, PlusSquare, DollarSign, LogOut } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Navbar = ({ user, account, onConnect, onDisconnect, onBecomeCreator, loading }) => {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src={`${process.env.PUBLIC_URL}/images/fbs-logo.png`}
              alt="FaceBoobs Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-xl text-gray-900">FaceBoobs</span>
          </Link>

          {/* Navigation Items - Desktop */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {account && user ? (
              <>
                {/* Notification Dropdown */}
                <NotificationDropdown />
                
                <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center">
                    <span className="text-pink-800 font-semibold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{formatAddress(account)}</div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <User size={16} />
                      <span>Profile</span>
                    </Link>
                    
                    {!user.isCreator && (
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
              </>
            ) : (
              <button
                onClick={onConnect}
                disabled={loading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && (
          <div className="md:hidden border-t border-gray-200">
            <div className="flex justify-around py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;