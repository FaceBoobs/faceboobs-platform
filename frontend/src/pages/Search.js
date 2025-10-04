// src/pages/Search.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Filter, Star } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const Search = ({ contract, user, viewOnly = false }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterCreatorsOnly, setFilterCreatorsOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    
    try {
      // Simulazione ricerca (in produzione useresti un database o indexing)
      const mockUsers = [
        {
          address: '0x1234567890123456789012345678901234567890',
          username: 'crypto_artist',
          bio: 'Digital artist creating unique NFT collections',
          isCreator: true,
          followersCount: 1250,
          verified: true
        },
        {
          address: '0x2345678901234567890123456789012345678901',
          username: 'defi_master',
          bio: 'DeFi expert sharing market insights',
          isCreator: true,
          followersCount: 890,
          verified: false
        },
        {
          address: '0x3456789012345678901234567890123456789012',
          username: 'web3_educator',
          bio: 'Teaching Web3 and blockchain technology',
          isCreator: true,
          followersCount: 2100,
          verified: true
        },
        {
          address: '0x4567890123456789012345678901234567890123',
          username: 'nft_collector',
          bio: 'Collector and trader of rare NFTs',
          isCreator: false,
          followersCount: 450,
          verified: false
        }
      ];

      let filtered = mockUsers.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filterCreatorsOnly) {
        filtered = filtered.filter(user => user.isCreator);
      }

      filtered.sort((a, b) => b.followersCount - a.followersCount);
      setSearchResults(filtered);
      
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const UserCard = ({ userData }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const handleFollow = async () => {
      if (!contract) return;
      
      try {
        setFollowLoading(true);
        const tx = isFollowing 
          ? await contract.unfollowUser(userData.address)
          : await contract.followUser(userData.address);
        await tx.wait();
        setIsFollowing(!isFollowing);
      } catch (error) {
        console.error('Follow error:', error);
        toast.error('Follow action failed');
      } finally {
        setFollowLoading(false);
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center">
              <span className="text-pink-800 text-xl font-bold">
                {userData.username.charAt(0).toUpperCase()}
              </span>
            </div>
            {userData.isCreator && (
              <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full p-1">
                <Star size={12} />
              </div>
            )}
            {userData.verified && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                <span className="text-xs">✓</span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Link 
                to={`/profile/${userData.address}`}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {userData.username}
              </Link>
              {userData.isCreator && (
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  Creator
                </span>
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-2">{userData.bio}</p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{userData.followersCount.toLocaleString()} followers</span>
              {userData.isCreator && (
                <span className="text-green-600">Earning creator</span>
              )}
            </div>
          </div>

          {!viewOnly && userData.address !== user?.address && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
            </button>
          )}
          {viewOnly && (
            <span className="text-gray-400 text-sm">Connect wallet to follow</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Discover People</h1>
        
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search users by username or bio..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter size={16} className="text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">Filters:</span>
            </div>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterCreatorsOnly}
                onChange={(e) => setFilterCreatorsOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Creators only</span>
            </label>
          </div>

          <button
            onClick={performSearch}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {searchQuery.trim() && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results for "{searchQuery}"
            </h2>
            <p className="text-gray-600">
              {loading ? 'Searching...' : `${searchResults.length} results found`}
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <SearchIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">No results found</h3>
                <p className="text-gray-400">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((userData) => (
                  <UserCard key={userData.address} userData={userData} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!searchQuery.trim() && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Crypto Art', icon: '🎨', count: 45 },
              { name: 'DeFi', icon: '💰', count: 32 },
              { name: 'Gaming', icon: '🎮', count: 28 },
              { name: 'Education', icon: '📚', count: 67 }
            ].map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  setSearchQuery(category.name.toLowerCase());
                  performSearch();
                }}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="font-medium text-gray-900">{category.name}</div>
                <div className="text-sm text-gray-500">{category.count} creators</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;