// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Context
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { LikesProvider } from './contexts/LikesContext';
import { CommentsProvider } from './contexts/CommentsContext';

// Error Boundary
import ErrorBoundary from './components/ErrorBoundary';
import WalletConnection from './components/WalletConnection';
import NetworkStatus from './components/NetworkStatus';

// Components
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import Earnings from './pages/Earnings';
import Messages from './pages/Messages';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import UploadTest from './pages/UploadTest';
import LoginModal from './components/LoginModal';
import { CreatorSuccessModal } from './components/SuccessModal';
import ToastContainer from './components/Toast';

function AppContent() {
  const {
    account,
    user,
    loading,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    registerUser,
    becomeCreator,
    contract,
    networkId,
    testContractConnection
  } = useWeb3();
  const { toast } = useToast();

  const [showLoginModal, setShowLoginModal] = React.useState(!user && account);
  const [showCreatorSuccessModal, setShowCreatorSuccessModal] = React.useState(false);

  React.useEffect(() => {
    if (account && !user) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [account, user]);

  const handleRegister = async (username, bio, avatarFile) => {
    if (!username || username.trim() === '') {
      toast.warning('Please enter a username');
      return;
    }

    try {
      const result = await registerUser(username, bio, avatarFile);
      
      if (result && result.success) {
        setShowLoginModal(false);
        toast.success(result.message);
      } else if (result && result.message) {
        toast.error(result.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error in handleRegister:', error);
      toast.error('Registration failed. Please check your connection and try again.');
    }
  };

  const handleBecomeCreator = async () => {
    console.log('🎯 handleBecomeCreator called');
    
    if (!account) {
      toast.error('Please connect your wallet first.');
      return;
    }
    
    if (!user) {
      toast.error('Please register your account first.');
      return;
    }
    
    if (user.isCreator) {
      toast.info('You are already a creator!');
      return;
    }
    
    try {
      console.log('🔄 Calling becomeCreator from Web3Context...');
      console.log('📊 Current user state before:', {
        username: user.username,
        isCreator: user.isCreator,
        account: account
      });
      
      const result = await becomeCreator();
      console.log('🎯 becomeCreator result:', result);
      
      if (result && result.success) {
        console.log('✅ Success:', result.message);
        
        // Enhanced success handling with better UX
        if (result.isCreatorNow) {
          // Full success with immediate UI update - show success modal
          setShowCreatorSuccessModal(true);
          
          // Force a small delay to let state update propagate
          setTimeout(() => {
            console.log('📊 User state after becoming creator:', {
              username: user.username,
              isCreator: user.isCreator
            });
          }, 1000);
          
        } else if (result.needsRefresh) {
          // Success but needs refresh
          const shouldRefresh = window.confirm(
            result.message + '\n\nWould you like to refresh the page to see the updated creator features?'
          );
          if (shouldRefresh) {
            window.location.reload();
          }
        } else {
          // Basic success - still show success modal for better UX
          setShowCreatorSuccessModal(true);
        }
        
      } else if (result && result.message) {
        console.log('❌ Failed:', result.message);
        toast.error(result.message);
      } else {
        console.log('❌ Unknown error - no result returned');
        toast.error('Failed to become creator. Please try again.');
      }
    } catch (error) {
      console.error('❌ Become creator error in handleBecomeCreator:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to become creator. ';
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMessage += 'Transaction was rejected.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient BNB for gas fees. Please add more BNB to your wallet.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar 
            user={user}
            account={account}
            onConnect={connectWallet}
            onDisconnect={disconnectWallet}
            onBecomeCreator={handleBecomeCreator}
            loading={loading}
          />
          
          {!isCorrectNetwork && account && (
            <NetworkStatus />
          )}
          
          <main className="max-w-6xl mx-auto px-4 py-8">
            {account && user ? (
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:address" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/create-post" element={
                  user.isCreator ?
                  <CreatePost /> :
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Become a Creator</h2>
                    <p className="mb-4">You need to become a creator to post content.</p>

                    {/* Debug info for development */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="bg-gray-100 p-3 rounded mb-4 text-sm text-left">
                        <h4 className="font-semibold">Debug Info:</h4>
                        <p>User: {user?.username || 'N/A'}</p>
                        <p>Is Creator: {user?.isCreator ? 'Yes' : 'No'}</p>
                        <p>Account: {account ? `${account.slice(0,6)}...${account.slice(-4)}` : 'N/A'}</p>
                        <p>Network: {networkId} {networkId === 97 ? '(BSC Testnet)' : '(Wrong Network)'}</p>
                        <p>Contract: {contract ? 'Connected' : 'Not Connected'}</p>

                        <button
                          onClick={async () => {
                            console.log('🧪 Testing contract connection...');
                            const result = await testContractConnection();
                            if (result.success) {
                              toast.success(result.message);
                            } else {
                              toast.error(result.message);
                            }
                          }}
                          className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                        >
                          Test Contract Connection
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        console.log('🎯 Become Creator button clicked');
                        handleBecomeCreator();
                      }}
                      disabled={loading}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-200"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : 'Become Creator'}
                    </button>
                  </div>
                } />
                <Route path="/earnings" element={
                  user.isCreator ?
                  <Earnings /> :
                  <Navigate to="/" />
                } />
                <Route path="/messages" element={<Messages />} />
                <Route path="/search" element={<Search />} />
                {process.env.NODE_ENV === 'development' && (
                  <Route path="/upload-test" element={<UploadTest />} />
                )}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            ) : account ? (
              <WalletConnection
                account={account}
                onConnect={connectWallet}
                loading={loading}
                networkError={!isCorrectNetwork && account ? 'Wrong Network' : null}
              />
            ) : (
              <div className="w-full text-center py-12">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white p-8 mx-4 max-w-lg mx-auto">
                  <div className="text-6xl mb-4">🔐</div>
                  <h2 className="text-3xl font-bold mb-3">Welcome to SocialWeb3</h2>
                  <p className="opacity-90 mb-6 text-lg">
                    Connect your wallet to access your personalized feed and interact with creators
                  </p>
                  <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
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
            <LoginModal 
              onRegister={handleRegister}
              onClose={() => setShowLoginModal(false)}
              loading={loading}
            />
          )}
          
          {/* Success Modal for Creator */}
          <CreatorSuccessModal
            isOpen={showCreatorSuccessModal}
            onClose={() => setShowCreatorSuccessModal(false)}
          />
          

          {/* Toast notifications */}
          <ToastContainer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Web3Provider>
      <NotificationsProvider>
        <ToastProvider>
          <LikesProvider>
            <CommentsProvider>
              <AppContent />
            </CommentsProvider>
          </LikesProvider>
        </ToastProvider>
      </NotificationsProvider>
    </Web3Provider>
  );
}

export default App;