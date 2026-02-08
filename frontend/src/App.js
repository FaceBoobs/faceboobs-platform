// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { SolanaWalletProvider } from './contexts/SolanaWalletContext';
import { SolanaAppProvider, useSolanaApp } from './contexts/SolanaAppContext';

import { NotificationsProvider } from './contexts/NotificationsContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { LikesProvider } from './contexts/LikesContext';
import { CommentsProvider } from './contexts/CommentsContext';

import ErrorBoundary from './components/ErrorBoundary';
import SupabaseConnectionBanner from './components/SupabaseConnectionBanner';
import SolanaConnectButton from './components/SolanaConnectButton';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Earnings from './pages/Earnings';
import Messages from './pages/Messages';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import UploadTest from './pages/UploadTest';

import LoginModal from './components/LoginModal';
import { CreatorSuccessModal } from './components/SuccessModal';
import ToastContainer from './components/Toast';

import { supabase } from './supabaseClient';
import './App.css';

// MOBILE MAINTENANCE MODE - Set to false to disable
const MOBILE_MAINTENANCE_MODE = true;
const MAINTENANCE_PASSWORD = 'vinciamolacompetizione';

function AppContent() {
  const { account, user, loading, disconnectWallet, refreshUser, becomeCreator } = useSolanaApp();
  const { toast } = useToast();

  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showCreatorSuccessModal, setShowCreatorSuccessModal] = React.useState(false);

  const [maintenancePassword, setMaintenancePassword] = React.useState('');
  const [maintenanceError, setMaintenanceError] = React.useState('');
  const [failedAttempts, setFailedAttempts] = React.useState(() => {
    return parseInt(localStorage.getItem('maintenance_failed_attempts') || '0');
  });

  const isMobile = React.useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

  const hasMaintenanceAccess = React.useMemo(() => {
    return sessionStorage.getItem('maintenance_access') === 'true';
  }, []);

  const handleMaintenanceSubmit = (e) => {
    e.preventDefault();

    if (maintenancePassword === MAINTENANCE_PASSWORD) {
      sessionStorage.setItem('maintenance_access', 'true');
      localStorage.setItem('maintenance_failed_attempts', '0');
      setMaintenanceError('');
      setFailedAttempts(0);
      setMaintenancePassword('');
      window.location.reload();
    } else {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      localStorage.setItem('maintenance_failed_attempts', newFailedAttempts.toString());
      setMaintenanceError('Wrong password');
      setMaintenancePassword('');
    }
  };

  // Global event blocking for premium content
  React.useEffect(() => {
    const premiumSelector =
      '.premium-content, .paid-content, .locked-content, .blur-content, [data-premium="true"], [data-paid="true"]';

    const preventContextMenu = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest(premiumSelector)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const preventSelection = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest(premiumSelector)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const preventDragStart = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      if ((target.tagName === 'IMG' || target.tagName === 'VIDEO') && target.closest(premiumSelector)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const preventCopy = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest(premiumSelector)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('contextmenu', preventContextMenu, true);
    document.addEventListener('selectstart', preventSelection, true);
    document.addEventListener('dragstart', preventDragStart, true);
    document.addEventListener('copy', preventCopy, true);
    document.addEventListener('cut', preventCopy, true);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu, true);
      document.removeEventListener('selectstart', preventSelection, true);
      document.removeEventListener('dragstart', preventDragStart, true);
      document.removeEventListener('copy', preventCopy, true);
      document.removeEventListener('cut', preventCopy, true);
    };
  }, []);

  // Show registration modal only if user record doesn't exist yet
  React.useEffect(() => {
    if (account && !user) {
      const profileCompleted = localStorage.getItem(`profileCompleted_${account.toLowerCase()}`);
      if (!profileCompleted) setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [account, user]);

  const handleRegister = async (username, bio, avatarFile) => {
    if (!account) {
      toast.error('Please connect your wallet first.');
      return;
    }

    if (!username || username.trim() === '') {
      toast.warning('Please enter a username');
      return;
    }

    try {
      let avatarUrl = null;

      // Optional avatar upload (Supabase Storage)
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatars/${account.toLowerCase()}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, {
          upsert: true
        });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = urlData?.publicUrl || null;
      }

      const { error } = await supabase
        .from('users')
        .upsert(
          [
            {
              wallet_address: account.toLowerCase(),
              username: username.trim(),
              bio: bio || null,
              avatar_url: avatarUrl
            }
          ],
          { onConflict: 'wallet_address' }
        );

      if (error) throw error;

      localStorage.setItem(`profileCompleted_${account.toLowerCase()}`, 'true');
      await refreshUser();

      setShowLoginModal(false);
      toast.success('Profile saved!');
    } catch (error) {
      console.error('Registration error in handleRegister:', error);
      toast.error(error?.message || 'Registration failed. Please try again.');
    }
  };

  const handleBecomeCreator = async () => {
    const res = await becomeCreator();
    if (res?.success) {
      setShowCreatorSuccessModal(true);
      toast.success(res.message || 'You are now a creator!');
    } else {
      toast.error(res?.message || 'Failed to become creator.');
    }
  };

  // MOBILE MAINTENANCE MODE CHECK
  if (MOBILE_MAINTENANCE_MODE && isMobile && !hasMaintenanceAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔧</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Mobile Maintenance</h1>
            <p className="text-gray-600">We're fixing some bugs on mobile. Back soon!</p>
          </div>

          {failedAttempts < 3 ? (
            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label htmlFor="maintenance-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Developer Access
                </label>
                <input
                  type="password"
                  id="maintenance-password"
                  value={maintenancePassword}
                  onChange={(e) => setMaintenancePassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              {maintenanceError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {maintenanceError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
              >
                Access
              </button>

              <p className="text-xs text-center text-gray-500 mt-2">Attempts: {failedAttempts}/3</p>
            </form>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm text-center">
              <p className="font-semibold mb-1">Access Denied</p>
              <p>Too many failed attempts. Please try again later.</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">Desktop version is still available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <SupabaseConnectionBanner />

          <Navbar
            user={user}
            account={account}
            onDisconnect={disconnectWallet}
            onBecomeCreator={handleBecomeCreator}
            loading={loading}
          />

          <main className="max-w-none mx-auto px-4 pt-16 md:pt-2 pb-2 md:pl-60">
            {account ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:address" element={<Profile />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/notifications" element={<Notifications />} />

                <Route
                  path="/create"
                  element={
                    user?.is_creator ? (
                      <CreatePost />
                    ) : (
                      <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Become a Creator</h2>
                        <p className="mb-4">You need to become a creator to post content.</p>

                        <button
                          onClick={handleBecomeCreator}
                          disabled={loading}
                          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-200"
                        >
                          {loading ? 'Processing...' : 'Become Creator'}
                        </button>
                      </div>
                    )
                  }
                />

                <Route path="/earnings" element={user?.is_creator ? <Earnings /> : <Navigate to="/" />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:conversationId" element={<Messages />} />
                <Route path="/search" element={<Search />} />

                {process.env.NODE_ENV === 'development' && <Route path="/upload-test" element={<UploadTest />} />}

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            ) : (
              <div className="w-full text-center py-12">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white p-8 mx-4 max-w-lg mx-auto">
                  <div className="text-6xl mb-4">🔐</div>
                  <h2 className="text-3xl font-bold mb-3">Welcome to FaceBoobs</h2>
                  <p className="opacity-90 mb-6 text-lg">
                    Connect your wallet to access your personalized feed and interact with creators
                  </p>
                  <div className="flex justify-center">
                    <SolanaConnectButton />
                  </div>
                  <div className="mt-6 text-sm opacity-75 space-y-1">
                    <p>✓ Follow creators and see their posts</p>
                    <p>✓ Create and share your own content</p>
                    <p>✓ Like, comment, and earn rewards</p>
                  </div>
                </div>
              </div>
            )}
          </main>

          {showLoginModal && (
            <LoginModal onRegister={handleRegister} onClose={() => setShowLoginModal(false)} loading={loading} />
          )}

          <CreatorSuccessModal isOpen={showCreatorSuccessModal} onClose={() => setShowCreatorSuccessModal(false)} />

          <ToastContainer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <SolanaWalletProvider>
      <SolanaAppProvider>
        <NotificationsProvider>
          <ToastProvider>
            <LikesProvider>
              <CommentsProvider>
                <AppContent />
              </CommentsProvider>
            </LikesProvider>
          </ToastProvider>
        </NotificationsProvider>
      </SolanaAppProvider>
    </SolanaWalletProvider>
  );
}

export default App;
