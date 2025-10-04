import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Wallet, Eye, AlertCircle, Smartphone } from 'lucide-react';
import Home from '../pages/Home';
import Search from '../pages/Search';

const ViewOnlyMode = ({ onConnect, loading }) => {
  const [showBanner, setShowBanner] = useState(true);

  const detectMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const isMobile = detectMobile();

  const ViewOnlyBanner = () => {
    if (!showBanner) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Eye className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">View-Only Mode</h3>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-700 mb-3">
              You're browsing in view-only mode. You can see posts and content, but need a Web3 wallet for full functionality.
            </p>

            {isMobile && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Mobile Device Detected</p>
                    <p className="text-sm text-orange-700">
                      For full Web3 functionality, use a browser with a Web3 wallet like MetaMask Mobile or Trust Wallet.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center space-x-2 transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>

              <div className="text-sm text-gray-600">
                <p className="font-medium">With a wallet you can:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Create and share posts</li>
                  <li>Like and comment on content</li>
                  <li>Follow other users</li>
                  <li>Become a creator and earn</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReadOnlyIndicator = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">
          View-Only: Connect a wallet to interact with content
        </span>
      </div>
    </div>
  );

  return (
    <>
      <ViewOnlyBanner />

      <Routes>
        <Route
          path="/"
          element={
            <div>
              <ReadOnlyIndicator />
              <Home viewOnly={true} />
            </div>
          }
        />
        <Route
          path="/search"
          element={
            <div>
              <ReadOnlyIndicator />
              <Search viewOnly={true} />
            </div>
          }
        />
        <Route
          path="/profile"
          element={
            <div className="text-center py-8">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet Required</h2>
              <p className="text-gray-600 mb-6">
                You need to connect a Web3 wallet to view profiles and user content.
              </p>
              <button
                onClick={onConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          }
        />
        <Route
          path="/create-post"
          element={
            <div className="text-center py-8">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Required for Creating Posts</h2>
              <p className="text-gray-600 mb-6">
                Connect your Web3 wallet to create and share posts on the platform.
              </p>
              <button
                onClick={onConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          }
        />
        <Route
          path="/notifications"
          element={
            <div className="text-center py-8">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Required for Notifications</h2>
              <p className="text-gray-600 mb-6">
                Connect your Web3 wallet to view your notifications and activity.
              </p>
              <button
                onClick={onConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          }
        />
        <Route
          path="/messages"
          element={
            <div className="text-center py-8">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Required for Messages</h2>
              <p className="text-gray-600 mb-6">
                Connect your Web3 wallet to send and receive messages.
              </p>
              <button
                onClick={onConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

export default ViewOnlyMode;