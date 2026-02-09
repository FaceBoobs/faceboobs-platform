// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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
import VideoCallRoom from './pages/VideoCallRoom';
import VideoCallSettings from './pages/VideoCallSettings';

import LoginModal from './components/LoginModal';
import { CreatorSuccessModal } from './components/SuccessModal';
import ToastContainer from './components/Toast';
import IncomingCallAlert from './components/VideoCall/IncomingCallAlert';

import { supabase } from './supabaseClient';
import './App.css';

function AppContent() {
  const { account, user, loading, disconnectWallet, refreshUser, becomeCreator } = useSolanaApp();
  const { toast } = useToast();

  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showCreatorSuccessModal, setShowCreatorSuccessModal] = React.useState(false);

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

  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <IncomingCallAlert />
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
                <Route path="/videocall/:channelName" element={<VideoCallRoom />} />
                <Route path="/settings/videocall" element={user?.is_creator ? <VideoCallSettings /> : <Navigate to="/" />} />

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
