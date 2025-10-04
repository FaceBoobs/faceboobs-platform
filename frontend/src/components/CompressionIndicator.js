// src/components/CompressionIndicator.js
// Visual indicator for image compression status and settings

import React, { useState, useEffect } from 'react';
import { Zap, Image as ImageIcon, Settings, TrendingDown } from 'lucide-react';
import { getCompressionStats } from '../utils/advancedImageCompression';

const CompressionIndicator = ({
  originalSize,
  compressedSize,
  compressionProfile,
  onProfileChange,
  className = ""
}) => {
  const [stats, setStats] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setStats(getCompressionStats());
  }, []);

  const compressionRatio = originalSize && compressedSize
    ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
    : 0;

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return kb > 1000 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  const getCompressionColor = (ratio) => {
    if (ratio > 70) return 'text-green-600';
    if (ratio > 40) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const profileDescriptions = {
    thumbnail: 'Ultra compression - Best for thumbnails (≤30KB)',
    preview: 'High compression - Good for previews (≤80KB)',
    standard: 'Balanced - Standard quality (≤150KB)',
    high: 'High quality - Minimal compression (≤300KB)'
  };

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Zap size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-800">Smart Compression</span>
          {stats?.webpSupported && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              WebP Ready
            </span>
          )}
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Compression Stats */}
      {originalSize && compressedSize && (
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <div className="text-sm text-gray-600">Original</div>
            <div className="font-semibold text-gray-800">{formatSize(originalSize)}</div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600">Compressed</div>
            <div className="font-semibold text-gray-800">{formatSize(compressedSize)}</div>
          </div>
        </div>
      )}

      {/* Compression Ratio */}
      {compressionRatio > 0 && (
        <div className="flex items-center justify-center space-x-2 mb-3">
          <TrendingDown size={16} className={getCompressionColor(compressionRatio)} />
          <span className={`font-semibold ${getCompressionColor(compressionRatio)}`}>
            {compressionRatio}% smaller
          </span>
        </div>
      )}

      {/* Current Profile */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800 capitalize">{compressionProfile} Quality</div>
            <div className="text-xs text-gray-500">
              {profileDescriptions[compressionProfile] || 'Custom compression settings'}
            </div>
          </div>
          <ImageIcon size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && onProfileChange && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-800 mb-3">Compression Profiles</h4>

          <div className="space-y-2">
            {Object.entries(profileDescriptions).map(([profile, description]) => (
              <label key={profile} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="compressionProfile"
                  value={profile}
                  checked={compressionProfile === profile}
                  onChange={(e) => onProfileChange(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm capitalize">{profile}</div>
                  <div className="text-xs text-gray-500">{description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-800">
              <strong>Tip:</strong> Choose "Preview" for social media posts, "Standard" for general use,
              or "High" for important images where quality matters most.
            </div>
          </div>
        </div>
      )}

      {/* Performance Note */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Optimized for {stats?.webpSupported ? 'WebP & JPEG' : 'JPEG'} •
        Reduces storage by up to 80%
      </div>
    </div>
  );
};

export default CompressionIndicator;