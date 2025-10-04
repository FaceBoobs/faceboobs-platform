// src/components/LikeButton.js
import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useLikes } from '../contexts/LikesContext';
import { useWeb3 } from '../contexts/Web3Context';

const LikeButton = ({ contentId, className = "", size = 20 }) => {
  const { getLikeData, toggleLike, initializeLikes } = useLikes();
  const { account } = useWeb3();
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  
  // Get current like data and check if current user has liked
  const likeData = getLikeData(contentId);
  const { count, likers } = likeData;
  const isLiked = account ? likers.includes(account) : false;

  // Initialize likes for this content on mount
  useEffect(() => {
    if (contentId) {
      initializeLikes(contentId);
    }
  }, [contentId, initializeLikes]);

  const handleLikeClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!account) {
      return; // Could show a toast or modal to connect wallet
    }

    if (isAnimating) return; // Prevent double-clicking during animation

    // Start animation
    setIsAnimating(true);
    
    if (!isLiked) {
      // Show pulse effect for likes (not unlikes)
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 600);
    }

    // Toggle like
    const result = await toggleLike(contentId, account);
    
    // End animation after a brief delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    if (!result.success) {
      console.error('Failed to toggle like');
    }
  };

  return (
    <button
      onClick={handleLikeClick}
      disabled={!account || isAnimating}
      className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-all duration-200 relative ${
        isLiked 
          ? 'text-red-500 bg-red-50 hover:bg-red-100' 
          : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
      } ${isAnimating ? 'scale-95' : 'hover:scale-105'} ${className}`}
      style={{ 
        transform: isAnimating ? 'scale(0.95)' : '',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {/* Pulse animation overlay */}
      {showPulse && (
        <div className="absolute inset-0 rounded-lg bg-red-500 animate-ping opacity-25"></div>
      )}
      
      {/* Heart icon with animations */}
      <div className="relative">
        <Heart 
          size={size} 
          className={`transition-all duration-200 ${
            isLiked ? 'fill-current scale-110' : ''
          } ${isAnimating ? 'animate-bounce' : ''}`}
          style={{
            filter: isLiked ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : ''
          }}
        />
        
        {/* Floating hearts animation on like */}
        {isAnimating && !isLiked && (
          <>
            <Heart 
              size={size * 0.6} 
              className="absolute -top-4 -left-2 text-red-500 fill-current animate-pulse opacity-70"
              style={{
                animation: 'float-up 0.8s ease-out forwards',
              }}
            />
            <Heart 
              size={size * 0.4} 
              className="absolute -top-6 left-2 text-red-400 fill-current animate-pulse opacity-50"
              style={{
                animation: 'float-up 1s ease-out forwards',
                animationDelay: '0.1s'
              }}
            />
          </>
        )}
      </div>
      
      {/* Like count with smooth transition */}
      <span 
        className={`text-sm font-medium transition-all duration-200 ${
          isAnimating ? 'scale-110' : ''
        }`}
      >
        {count}
      </span>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-10px) scale(1.2);
            opacity: 0.9;
          }
          100% {
            transform: translateY(-20px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
};

export default LikeButton;