// src/pages/Purchased.js
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Grid } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import PostDetailModal from '../components/PostDetailModal';
import { SupabaseService } from '../services/supabaseService';

const Purchased = () => {
  const { account, user, loading: web3Loading } = useWeb3();
  const { toast } = useToast();

  const [purchasedPosts, setPurchasedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (account && user) {
      loadPurchasedContent();
    }
  }, [account, user]);

  const loadPurchasedContent = async () => {
    try {
      setLoading(true);
      console.log('🛒 [Purchased] Loading purchased content for:', account);

      // Load all purchases with post details in a single query
      const purchasesResult = await SupabaseService.getUserPurchases(account);

      if (!purchasesResult.success || !purchasesResult.data) {
        console.log('No purchases found or error:', purchasesResult.error);
        setPurchasedPosts([]);
        setTotalSpent(0);
        setLoading(false);
        return;
      }

      const purchases = purchasesResult.data;
      console.log(`✅ Found ${purchases.length} purchases with post details`);

      // Calculate total spent
      const total = purchases.reduce((sum, purchase) => {
        return sum + (parseFloat(purchase.amount) || 0);
      }, 0);
      setTotalSpent(total);

      // Convert purchases to post format (post details are already included in the response)
      const posts = purchases.map(purchase => {
        const post = purchase.post;

        return {
          id: post.id,
          creator: post.creator_address,
          creatorData: {
            username: post.username || `User${post.creator_address?.substring(0, 6)}`,
            profileImage: '',
            address: post.creator_address,
            isCreator: true
          },
          content: post.image_url,
          contentHash: post.content_hash,
          description: post.description || '',
          isPaid: post.is_paid || false,
          price: post.price ? post.price.toString() : '0',
          blockchainContentId: post.blockchain_content_id || null,
          timestamp: Math.floor(new Date(post.created_at).getTime() / 1000),
          purchaseCount: post.purchase_count || 0,
          purchaseDate: purchase.created_at,
          purchaseAmount: purchase.amount,
          transactionHash: purchase.transaction_hash
        };
      });

      setPurchasedPosts(posts);
      console.log(`✅ Loaded ${posts.length} purchased posts`);

    } catch (error) {
      console.error('❌ [Purchased] Error loading purchased content:', error);
      toast.error('Failed to load purchases');
      setPurchasedPosts([]);
      setTotalSpent(0);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (web3Loading || loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white p-8">
          <ShoppingBag size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="opacity-90">Please connect your wallet to view your purchases</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <ShoppingBag size={32} className="text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
        </div>
        <div className="flex items-center space-x-4 text-gray-600">
          <span className="text-lg">
            {purchasedPosts.length} {purchasedPosts.length === 1 ? 'purchase' : 'purchases'}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-lg font-semibold text-purple-600">
            {totalSpent.toFixed(4)} BNB spent
          </span>
        </div>
      </div>

      {/* Content Grid */}
      {purchasedPosts.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-12 border border-gray-200">
            <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No purchases yet</h3>
            <p className="text-gray-500 mb-6">
              Start exploring premium content and support your favorite creators!
            </p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Explore Content
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
          {purchasedPosts.map((post) => (
            <div key={post.id} className="relative group">
              <div
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative hover:opacity-90 transition-opacity"
                onClick={() => {
                  setSelectedPost(post);
                  setShowPostDetail(true);
                }}
              >
                <img
                  src={post.content}
                  alt="Purchased content"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full bg-gradient-to-br from-purple-200 via-pink-200 to-purple-300 flex items-center justify-center';
                    placeholder.innerHTML = '<span class="text-white text-4xl">🖼️</span>';
                    e.target.parentNode.appendChild(placeholder);
                  }}
                />

                {/* Hover overlay with info */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-center p-4">
                    <div className="text-sm font-semibold mb-1">
                      {post.creatorData.username}
                    </div>
                    <div className="text-xs opacity-90">
                      Purchased for {post.purchaseAmount} BNB
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {formatTimeAgo(Math.floor(new Date(post.purchaseDate).getTime() / 1000))}
                    </div>
                  </div>
                </div>

                {/* Premium badge */}
                <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                  OWNED
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        isOpen={showPostDetail}
        onClose={() => {
          setShowPostDetail(false);
          setSelectedPost(null);
        }}
        content={selectedPost}
      />
    </div>
  );
};

export default Purchased;
