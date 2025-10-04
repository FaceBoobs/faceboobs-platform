// src/components/OptimizedMediaDisplay.js
// High-performance MediaDisplay component with lazy loading and caching

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, Play, ImageIcon } from 'lucide-react';
import { useLazyImage } from '../hooks/useLazyImage';
import imageCache from '../utils/imageCache';

const OptimizedMediaDisplay = React.memo(({
  fileId,
  isLocked = false,
  onImageClick,
  lazyLoad = true,
  priority = false, // High priority images load immediately
  className = "",
  placeholder = null
}) => {
  const [isVideo, setIsVideo] = useState(false);

  // Use lazy loading or immediate loading based on priority
  const { imgRef, imageUrl, isLoading, isError, isVisible } = useLazyImage(fileId, {
    enabled: lazyLoad && !priority,
    rootMargin: priority ? '200px' : '50px' // Larger margin for priority images
  });

  // For high priority images, load immediately
  const [immediateImageUrl, setImmediateImageUrl] = useState(null);
  const [immediateLoading, setImmediateLoading] = useState(false);
  const [immediateError, setImmediateError] = useState(false);

  // Handle immediate loading for priority images
  useEffect(() => {
    if (!priority || !fileId) return;

    let cancelled = false;
    setImmediateLoading(true);
    setImmediateError(false);

    const loadImmediate = async () => {
      try {
        const url = await imageCache.getImage(fileId);
        if (!cancelled) {
          if (url) {
            setImmediateImageUrl(url);
            setImmediateError(false);
          } else {
            setImmediateError(true);
          }
        }
      } catch (error) {
        console.error('Error loading priority image:', error);
        if (!cancelled) {
          setImmediateError(true);
        }
      } finally {
        if (!cancelled) {
          setImmediateLoading(false);
        }
      }
    };

    loadImmediate();

    return () => {
      cancelled = true;
    };
  }, [priority, fileId]);

  // Determine which loading state to use
  const finalImageUrl = priority ? immediateImageUrl : imageUrl;
  const finalIsLoading = priority ? immediateLoading : isLoading;
  const finalIsError = priority ? immediateError : isError;

  // Detect video content
  useEffect(() => {
    if (finalImageUrl && finalImageUrl.startsWith('data:video/')) {
      setIsVideo(true);
    } else {
      setIsVideo(false);
    }
  }, [finalImageUrl]);

  // Optimized image load handler
  const handleImageLoad = useCallback(() => {
    // Image loaded successfully, no additional state needed
    // as the loading state is managed by the lazy loading hook
  }, []);

  const handleImageError = useCallback(() => {
    console.error('Image failed to render:', fileId);
  }, [fileId]);

  // Optimized video load handler
  const handleVideoLoad = useCallback(() => {
    // Video loaded successfully
  }, []);

  const handleVideoError = useCallback(() => {
    console.error('Video failed to render:', fileId);
  }, [fileId]);

  // Click handler with preloading optimization
  const handleClick = useCallback(() => {
    if (onImageClick && finalImageUrl) {
      onImageClick(finalImageUrl);
    }
  }, [onImageClick, finalImageUrl]);

  // Locked content display
  if (isLocked) {
    return (
      <div className={`aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative rounded-lg overflow-hidden ${className}`}>
        {finalImageUrl ? (
          <div className="relative w-full h-full">
            {isVideo ? (
              <video
                src={finalImageUrl}
                className="w-full h-full object-cover filter blur-md"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={finalImageUrl}
                alt="Locked content preview"
                className="w-full h-full object-cover filter blur-md"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center text-white">
                <Lock size={32} className="mx-auto mb-2" />
                <p className="text-sm font-medium">Premium Content</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <Lock size={32} className="mx-auto mb-2" />
              <p className="text-sm font-medium">Premium Content</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (finalIsError && !finalIsLoading) {
    return (
      <div className={`aspect-square bg-gradient-to-br from-red-50 to-orange-50 border-2 border-dashed border-red-300 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-red-400 text-center p-4">
          <ImageIcon size={32} className="mx-auto mb-2" />
          <p className="text-sm font-medium">Media Load Failed</p>
          <p className="text-xs opacity-75 mt-1">Unable to load content</p>
          {fileId && (
            <p className="text-xs opacity-50 mt-1 break-all">
              ID: {fileId.substring(0, 8)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state with optimized placeholder
  if (finalIsLoading || (!finalImageUrl && (!lazyLoad || priority || isVisible))) {
    return (
      <div
        ref={lazyLoad && !priority ? imgRef : undefined}
        className={`aspect-square bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center rounded-lg ${className}`}
      >
        {placeholder || (
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p className="text-sm text-gray-600">Loading media...</p>
          </div>
        )}
      </div>
    );
  }

  // Lazy loading placeholder (not yet visible)
  if (lazyLoad && !priority && !isVisible && !finalImageUrl) {
    return (
      <div
        ref={imgRef}
        className={`aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-lg ${className}`}
      >
        {placeholder || (
          <div className="text-gray-400 text-center p-4">
            <ImageIcon size={32} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Media Preview</p>
          </div>
        )}
      </div>
    );
  }

  // No media found
  if (!finalImageUrl && !finalIsLoading) {
    return (
      <div className={`aspect-square bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-gray-400 text-center p-4">
          <ImageIcon size={32} className="mx-auto mb-2" />
          <p className="text-sm font-medium">No Image Available</p>
          <p className="text-xs opacity-75 mt-1">Content not found in storage</p>
          {fileId && (
            <p className="text-xs opacity-50 mt-1 break-all">
              ID: {fileId.substring(0, 8)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render media content
  return (
    <div
      ref={lazyLoad && !priority ? imgRef : undefined}
      className={`aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 ${className}`}
      onClick={handleClick}
    >
      {/* Media content */}
      {isVideo ? (
        <video
          src={finalImageUrl}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={finalImageUrl}
          alt="Uploaded content"
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? "eager" : "lazy"}
        />
      )}

      {/* Media type indicator */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        {isVideo ? (
          <span className="flex items-center">
            <Play size={12} className="mr-1" />
            Video
          </span>
        ) : (
          <span className="flex items-center">
            <ImageIcon size={12} className="mr-1" />
            Image
          </span>
        )}
      </div>

      {/* Click to view overlay */}
      {onImageClick && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white">
            {isVideo ? (
              <div className="text-center">
                <Play size={32} className="mx-auto mb-1" />
                <span className="text-sm font-medium">Play Video</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl mb-1">🔍</div>
                <span className="text-sm font-medium">View Image</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedMediaDisplay.displayName = 'OptimizedMediaDisplay';

export default OptimizedMediaDisplay;