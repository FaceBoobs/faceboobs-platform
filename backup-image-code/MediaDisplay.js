import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

const MediaDisplay = ({ fileId, isLocked = false, onImageClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { getMediaUrl } = useWeb3();
  
  console.log('🖼️ MediaDisplay render:', { 
    fileId, 
    isLocked, 
    hasOnImageClick: !!onImageClick,
    imageLoaded,
    imageError
  });
  
  // Use centralized getMediaUrl from Web3Context
  const mediaUrl = getMediaUrl(fileId);
  const isVideo = mediaUrl && mediaUrl.startsWith('data:video/');
  
  console.log('📂 MediaDisplay media check:', {
    fileId,
    hasMediaUrl: !!mediaUrl,
    mediaUrlLength: mediaUrl?.length,
    isVideo,
    mediaUrlPreview: mediaUrl?.substring(0, 50) + '...'
  });

  if (isLocked) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center text-white">
            <Lock size={32} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Premium Content</p>
          </div>
        </div>
      </div>
    );
  }

  if (!mediaUrl || imageError) {
    console.log('❌ MediaDisplay showing No Media placeholder:', {
      hasMediaUrl: !!mediaUrl,
      imageError,
      fileId
    });
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-lg">
        <div className="text-gray-500 text-center">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-sm">No Media</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100" 
      onClick={() => onImageClick && onImageClick(mediaUrl)}
    >
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}

      {isVideo ? (
        <video
          src={mediaUrl}
          className="w-full h-full object-cover"
          onLoadedData={() => {
            console.log('✅ MediaDisplay video loaded successfully for fileId:', fileId);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error('❌ MediaDisplay video load error for fileId:', fileId, e);
            setImageError(true);
          }}
          muted
          loop
          playsInline
        />
      ) : (
        <img 
          src={mediaUrl}
          alt="Content"
          className="w-full h-full object-cover"
          onLoad={() => {
            console.log('✅ MediaDisplay image loaded successfully for fileId:', fileId);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error('❌ MediaDisplay image load error for fileId:', fileId, e);
            setImageError(true);
          }}
        />
      )}

      {onImageClick && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white">
            <span className="text-sm font-medium">Click to view</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDisplay;