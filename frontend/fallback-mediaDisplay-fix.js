// Fix for MediaDisplay fallback data flow issue
// This provides a robust getMediaUrl implementation

console.log('🔧 Implementing MediaDisplay fallback fix...');

// Enhanced getMediaUrl function with better error handling and logging
const enhancedGetMediaUrl = (fileId) => {
  console.log('\n🔍 ===== ENHANCED GETMEDIAURL =====');
  console.log('🔍 Input fileId:', fileId);
  console.log('🔍 FileId type:', typeof fileId, 'length:', fileId?.length);

  if (!fileId || typeof fileId !== 'string') {
    console.log('⚠️ Invalid fileId - returning null');
    return null;
  }

  // Get all localStorage keys for analysis
  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));
  console.log('📂 LocalStorage Analysis:', {
    totalKeys: allKeys.length,
    imageKeys: imageKeys.length,
    availableKeys: imageKeys.slice(0, 5)
  });

  // For demo/placeholder content, return null to show placeholder
  if (fileId.startsWith('QmTest') || fileId === 'default' || fileId === 'QmDefaultAvatar') {
    console.log('🎭 Detected placeholder/demo fileId, returning null');
    return null;
  }

  // Check exact match first
  const exactMatch = imageKeys.includes(fileId);
  console.log('🎯 Exact fileId match found:', exactMatch);

  if (exactMatch) {
    console.log('✅ EXACT MATCH FOUND');
    try {
      const storedData = localStorage.getItem(fileId);
      if (!storedData) {
        console.log('❌ No data found for exact match key');
        return null;
      }

      const mediaData = JSON.parse(storedData);
      if (mediaData && mediaData.base64) {
        console.log('✅ SUCCESS: Valid base64 data found in exact match');
        console.log('📊 Media data:', {
          fileName: mediaData.fileName,
          base64Length: mediaData.base64.length,
          startsWithData: mediaData.base64.startsWith('data:')
        });
        return mediaData.base64;
      } else {
        console.log('❌ Exact match found but invalid media data:', {
          hasMediaData: !!mediaData,
          hasBase64: !!(mediaData?.base64),
          mediaDataKeys: Object.keys(mediaData || {})
        });
      }
    } catch (error) {
      console.error('❌ Error processing exact match:', error);
    }
  }

  // No exact match - try fallback
  console.log('🔄 No exact match found, attempting fallback...');

  if (imageKeys.length === 0) {
    console.log('❌ No images available for fallback');
    return null;
  }

  console.log('🔄 Attempting fallback to most recent image...');

  // Sort by upload time (newest first)
  const sortedKeys = imageKeys.sort((a, b) => {
    const aTime = parseInt(a.split('_')[1]) || 0;
    const bTime = parseInt(b.split('_')[1]) || 0;
    return bTime - aTime;
  });

  const fallbackKey = sortedKeys[0];
  console.log('🔄 Using fallback key:', fallbackKey);

  try {
    const fallbackData = localStorage.getItem(fallbackKey);
    if (!fallbackData) {
      console.log('❌ Fallback key exists but no data found');
      return null;
    }

    console.log('📦 Fallback data found, length:', fallbackData.length);

    const fallbackMediaData = JSON.parse(fallbackData);
    if (!fallbackMediaData) {
      console.log('❌ Fallback JSON parse returned null/undefined');
      return null;
    }

    console.log('📊 Fallback media data structure:', {
      hasBase64: !!fallbackMediaData.base64,
      base64Type: typeof fallbackMediaData.base64,
      base64Length: fallbackMediaData.base64?.length || 0,
      fileName: fallbackMediaData.fileName,
      allKeys: Object.keys(fallbackMediaData)
    });

    if (fallbackMediaData.base64 && typeof fallbackMediaData.base64 === 'string' && fallbackMediaData.base64.length > 0) {
      console.log('✅ FALLBACK SUCCESS - returning base64 data');
      console.log('📊 Success details:', {
        originalFileId: fileId,
        fallbackKey: fallbackKey,
        fileName: fallbackMediaData.fileName,
        dataLength: fallbackMediaData.base64.length,
        dataPreview: fallbackMediaData.base64.substring(0, 50) + '...'
      });
      return fallbackMediaData.base64;
    } else {
      console.log('❌ Fallback media data exists but base64 is invalid:', {
        hasBase64: !!fallbackMediaData.base64,
        base64Value: fallbackMediaData.base64,
        base64Type: typeof fallbackMediaData.base64
      });
    }
  } catch (fallbackError) {
    console.error('❌ Fallback attempt failed:', fallbackError);
    console.error('❌ Fallback error details:', {
      message: fallbackError.message,
      stack: fallbackError.stack
    });
  }

  console.log('❌ FINAL RESULT: No valid media found');
  console.log('❌ Summary:', {
    inputFileId: fileId,
    exactMatch: exactMatch,
    totalImagesAvailable: imageKeys.length,
    fallbackAttempted: imageKeys.length > 0
  });

  return null;
};

// Install the enhanced function globally for testing
window.enhancedGetMediaUrl = enhancedGetMediaUrl;

// Test the enhanced function if images exist
const testEnhancedFunction = () => {
  console.log('\n🧪 Testing enhanced getMediaUrl function...');

  const imageKeys = Object.keys(localStorage).filter(key => key.startsWith('img_'));

  if (imageKeys.length === 0) {
    console.log('❌ No images to test with');
    return;
  }

  // Test scenarios
  const testCases = [
    { name: 'Exact match', fileId: imageKeys[0] },
    { name: 'IPFS fallback', fileId: 'QmTestHashForFallback' },
    { name: 'Random fallback', fileId: 'some_random_id_' + Date.now() }
  ];

  testCases.forEach(testCase => {
    console.log(`\n🧪 Test: ${testCase.name}`);
    const result = enhancedGetMediaUrl(testCase.fileId);
    console.log(`📋 Result: ${result ? 'SUCCESS - Data returned' : 'FAILED - No data'}`);
    if (result) {
      console.log(`📋 Data length: ${result.length}`);
      console.log(`📋 Valid data URL: ${result.startsWith('data:')}`);
    }
  });
};

// Auto-run test
testEnhancedFunction();

console.log('\n✅ Enhanced getMediaUrl function installed!');
console.log('You can now test it manually: enhancedGetMediaUrl("your_file_id")');