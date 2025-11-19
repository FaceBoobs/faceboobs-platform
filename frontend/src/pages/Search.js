// src/pages/Search.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Filter, Star } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useWeb3 } from '../contexts/Web3Context';
import { supabase } from '../supabaseClient';
import { SupabaseService } from '../services/supabaseService';

const Search = () => {
  const { toast } = useToast();
  const { account, isConnected, user } = useWeb3();
  const viewOnly = !isConnected;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterCreatorsOnly, setFilterCreatorsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({}); // Track following status for each user

  // Load following status when user logs in or search results change
  useEffect(() => {
    if (user?.address && searchResults.length > 0) {
      loadFollowingStatus();
    }
  }, [user, searchResults]);

  const loadFollowingStatus = async () => {
    if (!user?.address) return;

    try {
      const result = await SupabaseService.getFollowing(user.address);
      if (result.success) {
        const map = {};
        result.data.forEach(address => {
          map[address] = true;
        });
        setFollowingMap(map);
      }
    } catch (error) {
      console.error('Error loading following status:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);

      if (error) throw error;

      let filtered = data || [];

      if (filterCreatorsOnly) {
        filtered = filtered.filter(user => user.is_creator);
      }

      filtered.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
      setSearchResults(filtered);

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const UserCard = ({ userData }) => {
    const [followLoading, setFollowLoading] = useState(false);
    const isFollowing = followingMap[userData.wallet_address] || false;

    const handleFollow = async () => {
      if (!user?.address) {
        toast.error('Please connect your wallet to follow users');
        return;
      }

      try {
        setFollowLoading(true);

        // Save to Supabase database
        const result = isFollowing
          ? await SupabaseService.unfollowUser(user.address, userData.wallet_address)
          : await SupabaseService.followUser(user.address, userData.wallet_address);

        if (result.success) {
          // Update local following map
          setFollowingMap(prev => ({
            ...prev,
            [userData.wallet_address]: !isFollowing
          }));

          // NO blockchain call - follow system uses ONLY Supabase
          console.log('✅ Follow updated in Supabase only (no blockchain)');

          toast.success(isFollowing ? 'Unfollowed successfully!' : 'Following successfully!');

          // Reload search results to show updated follower counts
          await performSearch();
        } else {
          toast.error('Follow action failed: ' + result.error);
        }
      } catch (error) {
        console.error('Follow error:', error);
        toast.error('Follow action failed');
      } finally {
        setFollowLoading(false);
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center space-x-3 md:space-x-4">
          <Link
            to={`/profile/${userData.wallet_address}`}
            className="relative flex-shrink-0"
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center">
              <span className="text-pink-800 text-lg md:text-xl font-bold">
                {userData.username?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            {userData.is_creator && (
              <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full p-1">
                <Star size={12} />
              </div>
            )}
            {userData.verified && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                <span className="text-xs">✓</span>
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Link
                to={`/profile/${userData.wallet_address}`}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
              >
                {userData.username || 'Anonymous'}
              </Link>
              {userData.is_creator && (
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                  Creator
                </span>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{userData.bio || 'No bio available'}</p>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{(userData.followers_count || 0).toLocaleString()} followers</span>
              {userData.is_creator && (
                <span className="text-green-600">Earning creator</span>
              )}
            </div>
          </div>

          {!viewOnly && userData.wallet_address !== user?.address && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex-shrink-0 ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
            </button>
          )}
          {viewOnly && (
            <span className="text-gray-400 text-sm flex-shrink-0">Connect wallet to follow</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-0 md:px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Discover People</h1>
        
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter size={16} className="text-gray-500 mr-2" />
              <span className="text-xs md:text-sm text-gray-700">Filters:</span>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterCreatorsOnly}
                onChange={(e) => setFilterCreatorsOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs md:text-sm text-gray-700">Creators only</span>
            </label>
          </div>

          <button
            onClick={performSearch}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm md:text-base w-full md:w-auto"
          >
            Search
          </button>
        </div>
      </div>

      {searchQuery.trim() && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">
              Search Results for "{searchQuery}"
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              {loading ? 'Searching...' : `${searchResults.length} results found`}
            </p>
          </div>

          <div className="p-4 md:p-6">
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
    </div>
  );
};

export default Search;