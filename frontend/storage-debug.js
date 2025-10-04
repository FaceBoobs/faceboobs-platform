// Storage Debug Script
// Run this in browser console to diagnose the storage issue

console.log('🔍 Storage Debug Analysis Starting...');

// Function to examine localStorage
const examineLocalStorage = () => {
  console.log('\n📦 LocalStorage Analysis:');
  console.log('========================');

  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));

  console.log(`Total localStorage keys: ${allKeys.length}`);
  console.log(`Image keys found: ${imageKeys.length}`);

  if (imageKeys.length === 0) {
    console.log('❌ No images found in localStorage');
    return [];
  }

  const imageData = [];
  imageKeys.forEach((key, index) => {
    try {
      const data = localStorage.getItem(key);
      const parsed = JSON.parse(data);

      const info = {
        key,
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        fileSize: `${(parsed.fileSize / 1024).toFixed(1)}KB`,
        uploadDate: parsed.uploadDate,
        hasBase64: !!parsed.base64,
        base64Length: parsed.base64?.length || 0
      };

      imageData.push(info);
      console.log(`📁 Image ${index + 1}:`, info);
    } catch (error) {
      console.error(`❌ Error parsing ${key}:`, error);
    }
  });

  return imageData;
};

// Function to test getMediaUrl function
const testGetMediaUrl = (fileId) => {
  console.log(`\n🧪 Testing getMediaUrl with fileId: ${fileId}`);
  console.log('===============================================');

  // Check if fileId exists in localStorage
  const stored = localStorage.getItem(fileId);
  console.log('Direct localStorage check:', !!stored);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      console.log('Parsed data structure:', {
        hasId: !!parsed.id,
        hasBase64: !!parsed.base64,
        hasFileName: !!parsed.fileName,
        base64Preview: parsed.base64?.substring(0, 50) + '...'
      });
    } catch (error) {
      console.error('Error parsing stored data:', error);
    }
  } else {
    console.log('❌ FileId not found in localStorage');
  }

  // Test the actual getMediaUrl function if available
  if (typeof window.getMediaUrl === 'function') {
    const result = window.getMediaUrl(fileId);
    console.log('getMediaUrl result:', !!result);
    return result;
  } else {
    console.log('⚠️ getMediaUrl function not available on window');
    return null;
  }
};

// Function to simulate blockchain contentHash lookup
const simulateBlockchainLookup = () => {
  console.log('\n⛓️ Simulating Blockchain Content Lookup:');
  console.log('========================================');

  // This would normally come from smart contract
  // Let's use the most recent image for testing
  const imageKeys = Object.keys(localStorage).filter(key => key.startsWith('img_'));

  if (imageKeys.length === 0) {
    console.log('❌ No images to test with');
    return null;
  }

  // Use the most recent image (highest timestamp)
  const sortedKeys = imageKeys.sort((a, b) => {
    const aTime = parseInt(a.split('_')[1]);
    const bTime = parseInt(b.split('_')[1]);
    return bTime - aTime;
  });

  const testContentHash = sortedKeys[0];
  console.log('🎯 Using contentHash for test:', testContentHash);

  // Test retrieval
  const result = testGetMediaUrl(testContentHash);

  if (result) {
    console.log('✅ Image retrieval successful!');

    // Display test image
    const img = document.createElement('img');
    img.src = result;
    img.style.maxWidth = '150px';
    img.style.maxHeight = '150px';
    img.style.position = 'fixed';
    img.style.top = '20px';
    img.style.left = '20px';
    img.style.zIndex = '9999';
    img.style.border = '3px solid #10B981';
    img.style.borderRadius = '8px';
    img.style.background = 'white';
    img.style.padding = '4px';

    img.onload = () => {
      console.log('✅ Test image displayed successfully');
      setTimeout(() => {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      }, 5000);
    };

    document.body.appendChild(img);

    return testContentHash;
  } else {
    console.log('❌ Image retrieval failed');
    return null;
  }
};

// Function to check MediaDisplay component behavior
const checkMediaDisplayBehavior = () => {
  console.log('\n🖼️ Checking MediaDisplay Component Behavior:');
  console.log('=============================================');

  // Find MediaDisplay components in the DOM
  const mediaDisplays = document.querySelectorAll('[class*="aspect-square"]');
  console.log(`Found ${mediaDisplays.length} potential MediaDisplay components`);

  mediaDisplays.forEach((element, index) => {
    const hasPlaceholder = element.textContent.includes('No Image Available') ||
                          element.textContent.includes('Content not found');
    const hasImage = element.querySelector('img');
    const hasVideo = element.querySelector('video');

    console.log(`MediaDisplay ${index + 1}:`, {
      hasPlaceholder,
      hasImage: !!hasImage,
      hasVideo: !!hasVideo,
      textContent: element.textContent.trim().substring(0, 50) + '...'
    });
  });
};

// Function to run complete diagnostic
const runCompleteDiagnostic = () => {
  console.log('🚨 STORAGE ISSUE DIAGNOSTIC REPORT');
  console.log('===================================');

  const images = examineLocalStorage();

  if (images.length > 0) {
    console.log('\n✅ Images found in storage, testing retrieval...');
    const testContentHash = simulateBlockchainLookup();

    if (testContentHash) {
      console.log('\n📊 Diagnostic Summary:');
      console.log('======================');
      console.log('✅ Images stored in localStorage: YES');
      console.log('✅ Image retrieval working: YES');
      console.log('✅ getMediaUrl function: WORKING');
      console.log('\n🎯 Issue might be:');
      console.log('1. ContentHash from blockchain differs from localStorage key');
      console.log('2. Timing issue between upload and blockchain storage');
      console.log('3. Network/transaction failure during post creation');

      console.log('\n🔧 Recommended fixes:');
      console.log('1. Add debug logging to CreatePost transaction');
      console.log('2. Verify contentHash matches fileId exactly');
      console.log('3. Add retry mechanism for failed storage');
    }
  } else {
    console.log('\n❌ No images in storage - upload is not working');
    console.log('\n🔧 Recommended fixes:');
    console.log('1. Check file upload in CreatePost component');
    console.log('2. Verify uploadMedia function is being called');
    console.log('3. Check for localStorage storage errors');
  }

  checkMediaDisplayBehavior();

  console.log('\n📋 Next Steps:');
  console.log('1. Upload an image using CreatePost');
  console.log('2. Check console logs during upload');
  console.log('3. Run this diagnostic again');
  console.log('4. Check if contentHash in blockchain matches localStorage key');
};

// Auto-run diagnostic
runCompleteDiagnostic();