import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, Play, ImageIcon } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

const MediaDisplay = React.memo(({ fileId, isLocked = false, onImageClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const { getMediaUrl } = useWeb3();

  // Memoize media URL to prevent unnecessary re-calculations
  const mediaUrl = useMemo(() => {
    if (!fileId) return null;
    return getMediaUrl(fileId);
  }, [fileId, getMediaUrl]);

  // Reset loading states when fileId changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [fileId]);

  // Determine if content is video based on data URL
  useEffect(() => {
    if (mediaUrl && mediaUrl.startsWith('data:video/')) {
      setIsVideo(true);
    } else {
      setIsVideo(false);
    }
  }, [mediaUrl]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleVideoLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleVideoError = useCallback(() => {
    setImageError(true);
  }, []);

  // Locked content display
  if (isLocked) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative rounded-lg overflow-hidden mx-auto" style={{ maxHeight: '450px', maxWidth: '500px' }}>
        {mediaUrl ? (
          <div className="relative w-full h-full">
            {isVideo ? (
              <video
                src={mediaUrl}
                className="w-full h-auto object-contain filter blur-md"
                style={{ maxHeight: '450px' }}
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Locked content preview"
                className="w-full h-auto object-contain filter blur-md"
                style={{ maxHeight: '450px' }}
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

  // No media found - show enhanced placeholder
  if (!mediaUrl || imageError) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-lg h-48">
        <div className="text-gray-400 text-center p-4">
          <ImageIcon size={32} className="mx-auto mb-2" />
          <p className="text-sm font-medium">
            {imageError ? 'Media Load Failed' : 'No Image Available'}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {imageError ? 'Check console for details' : 'Content not found in storage'}
          </p>
          {fileId && (
            <p className="text-xs opacity-50 mt-1 break-all">
              ID: {fileId.substring(0, 8)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Media display with enhanced loading states
  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center justify-center mx-auto"
      style={{ maxHeight: '450px', maxWidth: '500px' }}
      onClick={() => onImageClick && onImageClick(mediaUrl)}
    >
      {/* Loading state */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p className="text-sm text-gray-600">Loading media...</p>
            <p className="text-xs text-gray-500">
              {(mediaUrl.length / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      )}

      {/* Media content */}
      {isVideo ? (
        <video
          src={mediaUrl}
          className={`w-full h-auto object-contain transition-all duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ maxHeight: '450px' }}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={mediaUrl}
          alt="Uploaded content"
          className={`w-full h-auto object-contain transition-all duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ maxHeight: '450px' }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Media type indicator */}
      {imageLoaded && !imageError && (
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
      )}

      {/* Click to view overlay */}
      {onImageClick && imageLoaded && !imageError && (
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

export default MediaDisplay;