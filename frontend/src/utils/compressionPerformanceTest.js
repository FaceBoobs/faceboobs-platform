// src/utils/compressionPerformanceTest.js
// Performance testing utility for image compression improvements

import { compressImage, getCompressionStats } from './advancedImageCompression';

export class CompressionPerformanceTester {
  constructor() {
    this.testResults = [];
  }

  // Create test images of different sizes and types
  createTestImages() {
    return new Promise((resolve) => {
      const testImages = [];
      const sizes = [
        { width: 400, height: 400, name: 'small' },
        { width: 800, height: 600, name: 'medium' },
        { width: 1920, height: 1080, name: 'large' },
        { width: 3000, height: 2000, name: 'xlarge' }
      ];

      const colors = ['red', 'blue', 'green', 'gradient'];
      let completed = 0;

      sizes.forEach(size => {
        colors.forEach(color => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = size.width;
          canvas.height = size.height;

          // Create different types of test content
          if (color === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
            gradient.addColorStop(0, '#FF6B6B');
            gradient.addColorStop(0.5, '#4ECDC4');
            gradient.addColorStop(1, '#45B7D1');
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = color;
          }

          ctx.fillRect(0, 0, size.width, size.height);

          // Add some detail for more realistic compression testing
          ctx.fillStyle = 'white';
          ctx.font = `${Math.max(16, size.width / 50)}px Arial`;
          ctx.fillText(
            `Test Image ${size.name} - ${color}`,
            size.width * 0.1,
            size.height * 0.5
          );

          // Convert to blob
          canvas.toBlob((blob) => {
            Object.defineProperty(blob, 'name', {
              value: `test-${size.name}-${color}.jpg`,
              writable: false
            });

            testImages.push({
              blob,
              size: size.name,
              color,
              originalSize: blob.size,
              dimensions: `${size.width}x${size.height}`
            });

            completed++;
            if (completed === sizes.length * colors.length) {
              resolve(testImages);
            }
          }, 'image/jpeg', 0.9);
        });
      });
    });
  }

  // Test compression performance across different profiles
  async testCompressionPerformance() {
    console.log('🧪 Starting compression performance tests...');

    const testImages = await this.createTestImages();
    const profiles = ['thumbnail', 'preview', 'standard', 'high'];
    const results = [];

    for (const image of testImages) {
      console.log(`\n📊 Testing ${image.blob.name}...`);

      const imageResults = {
        name: image.blob.name,
        originalSize: image.originalSize,
        originalSizeKB: (image.originalSize / 1024).toFixed(1),
        dimensions: image.dimensions,
        profiles: {}
      };

      for (const profile of profiles) {
        const startTime = performance.now();

        try {
          const compressionResult = await compressImage(image.blob, profile);
          const endTime = performance.now();

          const compressionTime = endTime - startTime;
          const compressedSize = compressionResult.blob.size;
          const compressionRatio = ((image.originalSize - compressedSize) / image.originalSize * 100);

          imageResults.profiles[profile] = {
            compressedSize,
            compressedSizeKB: (compressedSize / 1024).toFixed(1),
            compressionRatio: compressionRatio.toFixed(1),
            compressionTime: compressionTime.toFixed(2),
            format: compressionResult.format,
            quality: compressionResult.finalQuality?.toFixed(2),
            attempts: compressionResult.attempts
          };

          console.log(`  ${profile}: ${(compressedSize / 1024).toFixed(1)}KB (${compressionRatio.toFixed(1)}% reduction) in ${compressionTime.toFixed(2)}ms`);

        } catch (error) {
          console.error(`  ${profile}: FAILED -`, error.message);
          imageResults.profiles[profile] = {
            error: error.message
          };
        }
      }

      results.push(imageResults);
    }

    this.testResults = results;
    return results;
  }

  // Test localStorage performance with different sizes
  async testStoragePerformance() {
    console.log('💾 Testing localStorage performance...');

    const testSizes = [10, 50, 100, 200, 500]; // KB
    const results = [];

    for (const sizeKB of testSizes) {
      // Create test data
      const dataSize = sizeKB * 1024;
      const testData = 'a'.repeat(dataSize);
      const key = `perf_test_${sizeKB}kb`;

      // Test write performance
      const writeStart = performance.now();
      try {
        localStorage.setItem(key, testData);
        const writeEnd = performance.now();
        const writeTime = writeEnd - writeStart;

        // Test read performance
        const readStart = performance.now();
        const retrievedData = localStorage.getItem(key);
        const readEnd = performance.now();
        const readTime = readEnd - readStart;

        // Clean up
        localStorage.removeItem(key);

        const result = {
          sizeKB,
          writeTime: writeTime.toFixed(2),
          readTime: readTime.toFixed(2),
          success: retrievedData.length === testData.length
        };

        results.push(result);
        console.log(`  ${sizeKB}KB: Write ${writeTime.toFixed(2)}ms, Read ${readTime.toFixed(2)}ms`);

      } catch (error) {
        console.error(`  ${sizeKB}KB: FAILED -`, error.message);
        results.push({
          sizeKB,
          error: error.message
        });
      }
    }

    return results;
  }

  // Benchmark against old compression method
  async benchmarkAgainstOldMethod(testFile) {
    console.log('⚖️ Benchmarking against basic compression...');

    // Basic compression (old method)
    const basicStart = performance.now();
    const basicResult = await this.basicCompress(testFile);
    const basicEnd = performance.now();

    // Advanced compression (new method)
    const advancedStart = performance.now();
    const advancedResult = await compressImage(testFile, 'standard');
    const advancedEnd = performance.now();

    const comparison = {
      basic: {
        size: basicResult.size,
        sizeKB: (basicResult.size / 1024).toFixed(1),
        time: (basicEnd - basicStart).toFixed(2)
      },
      advanced: {
        size: advancedResult.blob.size,
        sizeKB: (advancedResult.blob.size / 1024).toFixed(1),
        time: (advancedEnd - advancedStart).toFixed(2),
        format: advancedResult.format,
        quality: advancedResult.finalQuality?.toFixed(2)
      },
      improvement: {
        sizeReduction: (((basicResult.size - advancedResult.blob.size) / basicResult.size) * 100).toFixed(1),
        timeRatio: ((advancedEnd - advancedStart) / (basicEnd - basicStart)).toFixed(2)
      }
    };

    console.log('📈 Benchmark Results:');
    console.log(`  Basic: ${comparison.basic.sizeKB}KB in ${comparison.basic.time}ms`);
    console.log(`  Advanced: ${comparison.advanced.sizeKB}KB in ${comparison.advanced.time}ms`);
    console.log(`  Improvement: ${comparison.improvement.sizeReduction}% smaller, ${comparison.improvement.timeRatio}x time ratio`);

    return comparison;
  }

  // Basic compression for comparison
  basicCompress(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = Math.max(1, Math.floor(img.width * ratio));
        const newHeight = Math.max(1, Math.floor(img.height * ratio));

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', quality);
      };

      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // Run comprehensive performance test
  async runFullPerformanceTest() {
    console.log('🚀 Running comprehensive compression performance test...');

    const startTime = performance.now();

    // Get compression stats
    const compressionStats = getCompressionStats();
    console.log('📊 System capabilities:', compressionStats);

    // Test compression performance
    const compressionResults = await this.testCompressionPerformance();

    // Test storage performance
    const storageResults = await this.testStoragePerformance();

    // Create a test image for benchmarking
    const testImages = await this.createTestImages();
    const benchmarkImage = testImages.find(img => img.size === 'large');
    const benchmarkResults = benchmarkImage ?
      await this.benchmarkAgainstOldMethod(benchmarkImage.blob) : null;

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const fullResults = {
      timestamp: new Date().toISOString(),
      totalTestTime: totalTime.toFixed(2),
      systemCapabilities: compressionStats,
      compressionTests: compressionResults,
      storageTests: storageResults,
      benchmarkTest: benchmarkResults,
      summary: this.generateTestSummary(compressionResults, storageResults, benchmarkResults)
    };

    console.log(`✅ Performance test completed in ${totalTime.toFixed(2)}ms`);

    return fullResults;
  }

  // Generate test summary
  generateTestSummary(compressionResults, storageResults, benchmarkResults) {
    const summary = {
      avgCompressionRatio: 0,
      avgCompressionTime: 0,
      avgStorageWriteTime: 0,
      avgStorageReadTime: 0,
      recommendations: []
    };

    // Calculate averages
    if (compressionResults.length > 0) {
      const standardResults = compressionResults
        .map(r => r.profiles.standard)
        .filter(r => r && !r.error);

      if (standardResults.length > 0) {
        summary.avgCompressionRatio = (
          standardResults.reduce((sum, r) => sum + parseFloat(r.compressionRatio), 0) /
          standardResults.length
        ).toFixed(1);

        summary.avgCompressionTime = (
          standardResults.reduce((sum, r) => sum + parseFloat(r.compressionTime), 0) /
          standardResults.length
        ).toFixed(2);
      }
    }

    if (storageResults.length > 0) {
      const validStorageResults = storageResults.filter(r => !r.error);
      if (validStorageResults.length > 0) {
        summary.avgStorageWriteTime = (
          validStorageResults.reduce((sum, r) => sum + parseFloat(r.writeTime), 0) /
          validStorageResults.length
        ).toFixed(2);

        summary.avgStorageReadTime = (
          validStorageResults.reduce((sum, r) => sum + parseFloat(r.readTime), 0) /
          validStorageResults.length
        ).toFixed(2);
      }
    }

    // Generate recommendations
    if (summary.avgCompressionRatio > 60) {
      summary.recommendations.push('Excellent compression performance - continue using advanced compression');
    } else if (summary.avgCompressionRatio > 40) {
      summary.recommendations.push('Good compression - consider using "preview" profile for better performance');
    } else {
      summary.recommendations.push('Consider optimizing compression settings for better size reduction');
    }

    if (parseFloat(summary.avgStorageWriteTime) > 100) {
      summary.recommendations.push('Storage write performance may be slow - consider reducing target file sizes');
    }

    if (benchmarkResults && parseFloat(benchmarkResults.improvement.sizeReduction) > 20) {
      summary.recommendations.push('Advanced compression shows significant improvement over basic compression');
    }

    return summary;
  }

  // Export results for analysis
  exportResults() {
    const blob = new Blob([JSON.stringify(this.testResults, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compression-performance-test-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const performanceTester = new CompressionPerformanceTester();

// Export convenience functions
export const runPerformanceTest = () => performanceTester.runFullPerformanceTest();
export const testCompressionOnly = () => performanceTester.testCompressionPerformance();
export const testStorageOnly = () => performanceTester.testStoragePerformance();
export const exportTestResults = () => performanceTester.exportResults();

export default performanceTester;