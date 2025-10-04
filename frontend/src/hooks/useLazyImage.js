// src/hooks/useLazyImage.js
// Custom hook for lazy loading images with Intersection Observer

import { useState, useEffect, useRef } from 'react';
import imageCache from '../utils/imageCache';

export const useLazyImage = (fileId, options = {}) => {
  const {
    rootMargin = '50px', // Start loading 50px before element is visible
    threshold = 0.1,
    enabled = true
  } = options;

  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enabled || !fileId || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [fileId, rootMargin, threshold, enabled]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || !fileId || imageUrl) return;

    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    const loadImage = async () => {
      try {
        const url = await imageCache.getImage(fileId);

        if (!cancelled) {
          if (url) {
            setImageUrl(url);
            setIsError(false);
          } else {
            setIsError(true);
          }
        }
      } catch (error) {
        console.error('Error loading lazy image:', error);
        if (!cancelled) {
          setIsError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [isVisible, fileId, imageUrl]);

  // Reset state when fileId changes
  useEffect(() => {
    setImageUrl(null);
    setIsLoading(false);
    setIsError(false);
    setIsVisible(false);
  }, [fileId]);

  return {
    imgRef,
    imageUrl,
    isLoading,
    isError,
    isVisible
  };
};

// Hook for preloading multiple images
export const useImagePreloader = () => {
  const preloadImages = (fileIds) => {
    if (Array.isArray(fileIds) && fileIds.length > 0) {
      // Filter out null/undefined fileIds
      const validFileIds = fileIds.filter(id => id && typeof id === 'string');
      if (validFileIds.length > 0) {
        console.log(`🔄 Preloading ${validFileIds.length} images`);
        imageCache.preloadImages(validFileIds);
      }
    }
  };

  const getCacheStats = () => imageCache.getStats();
  const clearCache = () => imageCache.clear();

  return {
    preloadImages,
    getCacheStats,
    clearCache
  };
};