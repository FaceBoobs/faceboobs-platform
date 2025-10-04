// src/utils/advancedImageCompression.js
// Advanced image compression system with multiple formats and quality levels

export class AdvancedImageCompressor {
  constructor() {
    this.compressionProfiles = {
      thumbnail: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.7,
        targetSizeKB: 30
      },
      preview: {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        targetSizeKB: 80
      },
      standard: {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        targetSizeKB: 150
      },
      high: {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.9,
        targetSizeKB: 300
      }
    };

    this.webpSupported = this.checkWebPSupport();
  }

  // Check if WebP is supported
  checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Main compression function with adaptive quality
  async compressImage(file, profile = 'standard', options = {}) {
    const startTime = performance.now();
    console.log(`🗜️ Starting advanced compression with profile: ${profile}`);

    const config = { ...this.compressionProfiles[profile], ...options };

    try {
      // Step 1: Load and analyze image
      const imageData = await this.loadImage(file);
      console.log(`📊 Original: ${imageData.width}x${imageData.height}, ${(file.size / 1024).toFixed(1)}KB`);

      // Step 2: Determine optimal format
      const format = this.selectOptimalFormat(file, config);
      console.log(`🎯 Selected format: ${format}`);

      // Step 3: Calculate optimal dimensions
      const dimensions = this.calculateOptimalDimensions(
        imageData.width,
        imageData.height,
        config.maxWidth,
        config.maxHeight
      );

      // Step 4: Progressive compression with size targeting
      const result = await this.progressiveCompress(
        imageData,
        dimensions,
        format,
        config
      );

      const compressionTime = performance.now() - startTime;
      console.log(`✅ Compression completed in ${compressionTime.toFixed(2)}ms`);

      return result;

    } catch (error) {
      console.error('❌ Advanced compression failed:', error);
      return { blob: file, compressionRatio: 0, format: file.type };
    }
  }

  // Load image with proper error handling
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Use object URL for better memory management
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      // Clean up object URL after loading
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
    });
  }

  // Select optimal format based on image characteristics
  selectOptimalFormat(file, config) {
    const isTransparent = file.type === 'image/png';

    // PNG with transparency should stay PNG
    if (isTransparent && this.hasTransparency(file)) {
      return 'image/png';
    }

    // Use WebP if supported and beneficial
    if (this.webpSupported && config.targetSizeKB < 100) {
      return 'image/webp';
    }

    // Default to JPEG for photos
    return 'image/jpeg';
  }

  // Check if PNG has transparency (simplified check)
  hasTransparency(file) {
    // For now, assume all PNGs might have transparency
    // In production, you could analyze the actual image data
    return file.type === 'image/png';
  }

  // Calculate optimal dimensions maintaining aspect ratio
  calculateOptimalDimensions(width, height, maxWidth, maxHeight) {
    const aspectRatio = width / height;

    let newWidth = width;
    let newHeight = height;

    // Scale down if too large
    if (width > maxWidth || height > maxHeight) {
      if (width / maxWidth > height / maxHeight) {
        newWidth = maxWidth;
        newHeight = Math.round(maxWidth / aspectRatio);
      } else {
        newHeight = maxHeight;
        newWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Ensure minimum 1px
    newWidth = Math.max(1, newWidth);
    newHeight = Math.max(1, newHeight);

    return { width: newWidth, height: newHeight };
  }

  // Progressive compression with size targeting
  async progressiveCompress(imageData, dimensions, format, config) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Apply image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image with optional preprocessing
    if (format === 'image/jpeg') {
      // Fill white background for JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(imageData.element, 0, 0, dimensions.width, dimensions.height);

    // Progressive quality adjustment to hit target size
    let quality = config.quality;
    let attempt = 0;
    const maxAttempts = 5;

    while (attempt < maxAttempts) {
      const blob = await this.canvasToBlob(canvas, format, quality);
      const sizeKB = blob.size / 1024;

      console.log(`🎯 Attempt ${attempt + 1}: ${sizeKB.toFixed(1)}KB at quality ${quality.toFixed(2)}`);

      // If size is acceptable, return result
      if (sizeKB <= config.targetSizeKB || quality <= 0.3) {
        const originalSize = imageData.element.src ? 0 : 0; // Original file size
        const compressionRatio = originalSize > 0 ? ((originalSize - blob.size) / originalSize) * 100 : 0;

        return {
          blob,
          compressionRatio,
          format,
          finalQuality: quality,
          finalSize: sizeKB,
          attempts: attempt + 1
        };
      }

      // Adjust quality for next attempt
      const oversizeRatio = sizeKB / config.targetSizeKB;
      quality = Math.max(0.3, quality * (0.8 / oversizeRatio));
      attempt++;
    }

    // Return best attempt
    const finalBlob = await this.canvasToBlob(canvas, format, quality);
    return {
      blob: finalBlob,
      compressionRatio: 0,
      format,
      finalQuality: quality,
      finalSize: finalBlob.size / 1024,
      attempts: attempt
    };
  }

  // Convert canvas to blob with promise
  canvasToBlob(canvas, format, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob()); // Fallback to empty blob
      }, format, quality);
    });
  }

  // Batch compress multiple images
  async batchCompress(files, profile = 'standard', onProgress = null) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = await this.compressImage(file, profile);
        results.push({ file, result, success: true });

        if (onProgress) {
          onProgress(i + 1, files.length, result);
        }
      } catch (error) {
        console.error(`❌ Failed to compress ${file.name}:`, error);
        results.push({ file, error, success: false });

        if (onProgress) {
          onProgress(i + 1, files.length, null);
        }
      }
    }

    return results;
  }

  // Analyze image and recommend compression profile
  async analyzeAndRecommend(file) {
    try {
      const imageData = await this.loadImage(file);
      const sizeKB = file.size / 1024;
      const pixels = imageData.width * imageData.height;
      const aspectRatio = imageData.width / imageData.height;

      let recommendedProfile = 'standard';
      let reasoning = [];

      // Size-based recommendations
      if (sizeKB > 500) {
        recommendedProfile = 'preview';
        reasoning.push('Large file size detected');
      } else if (sizeKB < 50) {
        recommendedProfile = 'high';
        reasoning.push('Small file, can afford higher quality');
      }

      // Resolution-based recommendations
      if (pixels > 3000000) { // > 3MP
        recommendedProfile = 'preview';
        reasoning.push('High resolution image');
      } else if (pixels < 300000) { // < 0.3MP
        recommendedProfile = 'thumbnail';
        reasoning.push('Low resolution image');
      }

      // Aspect ratio considerations
      if (aspectRatio > 3 || aspectRatio < 0.33) {
        reasoning.push('Unusual aspect ratio detected');
      }

      return {
        recommendedProfile,
        reasoning,
        analysis: {
          originalSize: sizeKB,
          dimensions: `${imageData.width}x${imageData.height}`,
          pixels,
          aspectRatio: aspectRatio.toFixed(2),
          estimatedCompressedSize: this.estimateCompressedSize(sizeKB, recommendedProfile)
        }
      };

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return {
        recommendedProfile: 'standard',
        reasoning: ['Analysis failed, using default profile'],
        analysis: null
      };
    }
  }

  // Estimate compressed size based on profile
  estimateCompressedSize(originalSizeKB, profile) {
    const compressionFactors = {
      thumbnail: 0.15,
      preview: 0.35,
      standard: 0.55,
      high: 0.75
    };

    return Math.round(originalSizeKB * (compressionFactors[profile] || 0.55));
  }

  // Get compression statistics
  getCompressionStats() {
    return {
      webpSupported: this.webpSupported,
      availableProfiles: Object.keys(this.compressionProfiles),
      profileDetails: this.compressionProfiles
    };
  }
}

// Create singleton instance
const advancedCompressor = new AdvancedImageCompressor();

// Export convenience functions
export const compressImage = (file, profile, options) =>
  advancedCompressor.compressImage(file, profile, options);

export const batchCompressImages = (files, profile, onProgress) =>
  advancedCompressor.batchCompress(files, profile, onProgress);

export const analyzeImage = (file) =>
  advancedCompressor.analyzeAndRecommend(file);

export const getCompressionStats = () =>
  advancedCompressor.getCompressionStats();

export default advancedCompressor;