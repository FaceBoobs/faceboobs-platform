// src/components/StoryViewer.js
import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';

const StoryViewer = ({ stories, initialIndex, isOpen, onClose }) => {
  const { getMediaUrl } = useWeb3();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const STORY_DURATION = 5000; // 5 seconds per story
  
  const currentStory = stories[currentIndex];

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Auto-progress story
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (STORY_DURATION / 100));
        if (newProgress >= 100) {
          handleNextStory();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, currentIndex, currentStory]);

  const handleNextStory = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePrevStory();
        break;
      case 'ArrowRight':
        handleNextStory();
        break;
      case ' ':
        e.preventDefault();
        setIsPaused(!isPaused);
        break;
    }
  }, [isOpen, onClose, handlePrevStory, handleNextStory, isPaused]);

  const handleLikeStory = async () => {
    try {
      // In a real app, this would interact with the contract
      toast.success('Liked story!');
    } catch (error) {
      console.error('Error liking story:', error);
      toast.error('Failed to like story');
    }
  };

  const handleShareStory = () => {
    try {
      if (navigator.share) {
        navigator.share({
          title: `${currentStory.creatorData.username}'s story`,
          text: 'Check out this story on SocialWeb3!',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Story link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing story:', error);
      toast.error('Failed to share story');
    }
  };

  // Format time remaining for story
  const formatTimeRemaining = (expiryTime) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiryTime - now;
    
    if (remaining <= 0) return 'Expired';
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m left`;
    return `${Math.floor(remaining / 3600)}h left`;
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !currentStory) return null;

  // Get display image URL
  const imageUrl = getMediaUrl(currentStory.contentHash);
  const displayUrl = imageUrl;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-black"></div>
      
      {/* Navigation Areas */}
      <div 
        className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer flex items-center justify-start pl-4"
        onClick={handlePrevStory}
      >
        {currentIndex > 0 && (
          <ChevronLeft size={32} className="text-white opacity-50 hover:opacity-100 transition-opacity" />
        )}
      </div>
      
      <div 
        className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer flex items-center justify-end pr-4"
        onClick={handleNextStory}
      >
        <ChevronRight size={32} className="text-white opacity-50 hover:opacity-100 transition-opacity" />
      </div>

      {/* Story Content */}
      <div className="relative w-full max-w-md h-full max-h-[80vh] mx-4">
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex space-x-1 z-20">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width: index < currentIndex ? '100%' : 
                         index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-white rounded-full flex items-center justify-center overflow-hidden">
              {currentStory.creatorData.avatarHash && getMediaUrl(currentStory.creatorData.avatarHash) ? (
                <img
                  src={getMediaUrl(currentStory.creatorData.avatarHash)}
                  alt={`${currentStory.creatorData.username}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-pink-800 font-semibold text-sm">
                  {currentStory.creatorData.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {currentStory.creatorData.username}
              </h3>
              <p className="text-white text-xs opacity-75">
                {formatTimeRemaining(currentStory.expiryTime)}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Story Image */}
        <div 
          className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer"
          onClick={() => setIsPaused(!isPaused)}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {displayUrl ? (
            <img 
              src={displayUrl}
              alt={`${currentStory.creatorData.username}'s story`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-6xl mb-4">🖼️</div>
                <p className="text-lg">No Story Content</p>
                <p className="text-sm opacity-75">User hasn't uploaded story media</p>
              </div>
            </div>
          )}
        </div>

        {/* Story Actions */}
        <div className="absolute bottom-6 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLikeStory}
              className="text-white hover:text-red-400 transition-colors"
            >
              <Heart size={24} />
            </button>
            <button
              onClick={() => toast.info('Story comments coming soon!')}
              className="text-white hover:text-blue-400 transition-colors"
            >
              <MessageCircle size={24} />
            </button>
            <button
              onClick={handleShareStory}
              className="text-white hover:text-green-400 transition-colors"
            >
              <Share size={24} />
            </button>
          </div>
          
          <div className="text-white text-xs opacity-75">
            {currentIndex + 1} / {stories.length}
          </div>
        </div>

        {/* Pause indicator */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="bg-black bg-opacity-50 rounded-full p-4">
              <div className="text-white text-2xl">⏸️</div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-50 text-center">
        <p>Tap left/right to navigate • Space to pause • Esc to close</p>
      </div>
    </div>
  );
};

export default StoryViewer;