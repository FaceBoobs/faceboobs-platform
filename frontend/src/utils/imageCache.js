// src/utils/imageCache.js
// High-performance image caching system for base64 images

class ImageCache {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 50; // Max images in memory
    this.accessTimes = new Map();
    this.preloadQueue = new Set();
    this.loadingPromises = new Map(); // Prevent duplicate loads
  }

  // Get image with intelligent caching
  async getImage(fileId) {
    if (!fileId) return null;

    // Check memory cache first (fastest)
    if (this.memoryCache.has(fileId)) {
      this.accessTimes.set(fileId, Date.now());
      console.log(`🚀 Cache HIT (memory): ${fileId}`);
      return this.memoryCache.get(fileId);
    }

    // If already loading, return the existing promise
    if (this.loadingPromises.has(fileId)) {
      console.log(`⏳ Already loading: ${fileId}`);
      return this.loadingPromises.get(fileId);
    }

    // Create loading promise
    const loadingPromise = this.loadFromStorage(fileId);
    this.loadingPromises.set(fileId, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingPromises.delete(fileId);
    }
  }

  // Load from localStorage with optimization
  async loadFromStorage(fileId) {
    return new Promise((resolve) => {
      // Use requestIdleCallback for non-blocking storage access
      const loadData = () => {
        try {
          const startTime = performance.now();
          const data = localStorage.getItem(fileId);

          if (!data) {
            console.log(`⚠️ Cache MISS: ${fileId} not found in localStorage`);
            resolve(null);
            return;
          }

          // Parse in chunks to avoid blocking
          const parseData = () => {
            try {
              const parsedData = JSON.parse(data);
              const imageUrl = `data:${parsedData.fileType};base64,${parsedData.base64}`;

              // Add to memory cache
              this.addToMemoryCache(fileId, imageUrl);

              const loadTime = performance.now() - startTime;
              console.log(`✅ Cache MISS (localStorage): ${fileId} loaded in ${loadTime.toFixed(2)}ms`);

              resolve(imageUrl);
            } catch (parseError) {
              console.error(`❌ Parse error for ${fileId}:`, parseError);
              resolve(null);
            }
          };

          // Use setTimeout to yield to browser
          if (data.length > 100000) { // Large file, parse async
            setTimeout(parseData, 0);
          } else {
            parseData();
          }

        } catch (error) {
          console.error(`❌ Storage error for ${fileId}:`, error);
          resolve(null);
        }
      };

      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadData, { timeout: 100 });
      } else {
        setTimeout(loadData, 0);
      }
    });
  }

  // Add to memory cache with LRU eviction
  addToMemoryCache(fileId, imageUrl) {
    // Remove oldest if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.accessTimes.delete(oldestKey);
        console.log(`🗑️ Evicted from memory cache: ${oldestKey}`);
      }
    }

    this.memoryCache.set(fileId, imageUrl);
    this.accessTimes.set(fileId, Date.now());
  }

  // Find oldest accessed item
  findOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Preload images in the background
  preloadImages(fileIds) {
    fileIds.forEach(fileId => {
      if (!this.memoryCache.has(fileId) && !this.preloadQueue.has(fileId)) {
        this.preloadQueue.add(fileId);
      }
    });

    this.processPreloadQueue();
  }

  // Process preload queue with throttling
  processPreloadQueue() {
    if (this.preloadQueue.size === 0) return;

    const fileId = this.preloadQueue.values().next().value;
    this.preloadQueue.delete(fileId);

    // Use requestIdleCallback for preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.getImage(fileId).then(() => {
          console.log(`🔄 Preloaded: ${fileId}`);
          // Continue processing queue after a delay
          setTimeout(() => this.processPreloadQueue(), 50);
        });
      });
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      maxMemoryCacheSize: this.maxMemoryCacheSize,
      preloadQueueSize: this.preloadQueue.size,
      activeLoads: this.loadingPromises.size
    };
  }

  // Clear all caches
  clear() {
    this.memoryCache.clear();
    this.accessTimes.clear();
    this.preloadQueue.clear();
    this.loadingPromises.clear();
    console.log('🗑️ Image cache cleared');
  }

  // Optimize memory usage by clearing old entries
  optimize() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, time] of this.accessTimes) {
      if (now - time > maxAge) {
        this.memoryCache.delete(key);
        this.accessTimes.delete(key);
      }
    }

    console.log(`🔧 Cache optimized: ${this.memoryCache.size} items remaining`);
  }
}

// Create singleton instance
const imageCache = new ImageCache();

// Optimize cache periodically
setInterval(() => {
  imageCache.optimize();
}, 5 * 60 * 1000); // Every 5 minutes

export default imageCache;