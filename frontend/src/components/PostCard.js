import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share, Lock, Eye, User, Trash2, MoreHorizontal } from 'lucide-react';
import { ethers } from 'ethers';
import LikeButton from './LikeButton';
import CommentButton from './CommentButton';
import ShareButton from './ShareButton';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';

const PostCard = ({ content, user, onBuyContent, hasAccess, onDeleteContent }) => {
  const { user: currentUser, getMediaUrl } = useWeb3();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatPrice = (price) => {
    // Price is already in BNB format from localStorage, don't double convert
    return typeof price === 'string' ? price : ethers.formatEther(price);
  };

  const handleBuyContent = () => {
    if (onBuyContent) {
      onBuyContent(content.id, content.price);
    }
  };

  const handleDeleteContent = () => {
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      if (onDeleteContent) {
        onDeleteContent(content.id);
        toast.success('Post deleted successfully');
      }
    }
    setShowMenu(false);
  };

  // Check if current user is the owner of this post
  const isOwnPost = currentUser && content.creator === currentUser.address;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="ml-3">
              <h3 className="font-semibold text-gray-900">
                {content.creatorData?.username || 'Anonymous'}
              </h3>
              <p className="text-sm text-gray-500">{formatTimestamp(content.timestamp)}</p>
            </div>
          </div>
          
          {isOwnPost && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                  <button
                    onClick={handleDeleteContent}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {content.isPaid && !hasAccess ? (
          <div className="p-8 text-center bg-gray-50">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Content</h3>
            <p className="text-gray-600 mb-4">
              This content requires payment to view
            </p>
            <div className="flex items-center justify-center space-x-4">
              <span className="text-2xl font-bold text-blue-600">
                {formatPrice(content.price)} BNB
              </span>
              <button
                onClick={handleBuyContent}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Purchase Access
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center mx-auto" style={{ maxHeight: '450px', maxWidth: '500px' }}>
              {(() => {
                // Get display URL - check for both contentHash (localStorage) and content (base64)
                let displayUrl = null;

                // First try contentHash (for images uploaded via localStorage system)
                if (content.contentHash) {
                  displayUrl = getMediaUrl(content.contentHash);
                }

                // If no contentHash or getMediaUrl returns null, try content field (base64 data from database)
                if (!displayUrl && content.content) {
                  displayUrl = content.content;
                }

                return displayUrl ? (
                  <img
                    src={displayUrl}
                    alt="Content"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '450px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null;
              })()}
              <div
                className="w-full h-48 flex items-center justify-center"
                style={{ display: (content.contentHash || content.content) ? 'none' : 'flex' }}
              >
                <div className="text-center">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Content Preview</p>
                  {content.contentHash && (
                    <p className="text-xs text-gray-400 mt-1">Hash: {content.contentHash}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <LikeButton contentId={content.id.toString()} />
            
            <CommentButton 
              contentId={content.id.toString()} 
              contentAuthor={content.creatorData?.username || 'Anonymous'}
            />
            
            <ShareButton
              contentId={content.id.toString()}
              contentAuthor={content.creatorData?.username || 'Anonymous'}
              contentDescription="Amazing content on SocialWeb3"
              showLabel={true}
            />
          </div>
          
          {content.isPaid && (
            <div className="flex items-center text-sm text-gray-500">
              <span>Purchases: {Number(content.purchaseCount)}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PostCard;