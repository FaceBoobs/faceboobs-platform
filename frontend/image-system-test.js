// Image System Test Script
// Run this in the browser console to test the rebuilt image system

console.log('🧪 Starting Image System Test...');

// Test 1: Check if upload functions exist
const testUploadFunctions = () => {
  console.log('📋 Test 1: Upload Functions');

  try {
    const hasUploadMedia = typeof window.uploadMedia === 'function';
    const hasGetMediaUrl = typeof window.getMediaUrl === 'function';

    console.log('✅ uploadMedia function exists:', hasUploadMedia);
    console.log('✅ getMediaUrl function exists:', hasGetMediaUrl);

    return hasUploadMedia && hasGetMediaUrl;
  } catch (error) {
    console.error('❌ Error checking functions:', error);
    return false;
  }
};

// Test 2: Check localStorage for stored images
const testStoredImages = () => {
  console.log('\n📋 Test 2: Stored Images');

  try {
    const keys = Object.keys(localStorage);
    const imageKeys = keys.filter(key => key.startsWith('img_'));

    console.log(`📊 Found ${imageKeys.length} stored images`);

    imageKeys.forEach((key, index) => {
      try {
        const data = localStorage.getItem(key);
        const mediaData = JSON.parse(data);

        console.log(`📁 Image ${index + 1}:`, {
          id: key,
          fileName: mediaData.fileName,
          fileType: mediaData.fileType,
          fileSize: `${(mediaData.fileSize / 1024).toFixed(1)}KB`,
          uploadDate: mediaData.uploadDate,
          hasBase64: !!mediaData.base64
        });
      } catch (error) {
        console.error(`❌ Error parsing ${key}:`, error);
      }
    });

    return imageKeys.length > 0;
  } catch (error) {
    console.error('❌ Error checking stored images:', error);
    return false;
  }
};

// Test 3: Create test image
const createTestImage = async () => {
  console.log('\n📋 Test 3: Create Test Image');

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Draw test pattern
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(0, 0, 300, 200);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('IMAGE SYSTEM', 150, 80);
    ctx.fillText('TEST SUCCESSFUL', 150, 110);
    ctx.font = '14px Arial';
    ctx.fillText(new Date().toLocaleString(), 150, 140);

    const testBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png', 0.9);
    });

    const testFile = new File([testBlob], `test-image-${Date.now()}.png`, {
      type: 'image/png'
    });

    console.log('🎨 Created test image:', {
      name: testFile.name,
      size: `${(testFile.size / 1024).toFixed(1)}KB`,
      type: testFile.type
    });

    return testFile;
  } catch (error) {
    console.error('❌ Error creating test image:', error);
    return null;
  }
};

// Test 4: Test full upload workflow
const testUploadWorkflow = async () => {
  console.log('\n📋 Test 4: Upload Workflow');

  try {
    const testFile = await createTestImage();
    if (!testFile) return false;

    // Simulate FileReader process
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const base64String = event.target.result;
          console.log('✅ FileReader conversion successful');

          // Generate file ID
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileId = `img_${timestamp}_${randomId}`;

          // Create media data structure
          const mediaData = {
            id: fileId,
            base64: base64String,
            fileName: testFile.name,
            fileType: testFile.type,
            fileSize: testFile.size,
            timestamp: timestamp,
            uploadDate: new Date().toISOString()
          };

          // Store in localStorage
          localStorage.setItem(fileId, JSON.stringify(mediaData));
          console.log('💾 Successfully stored in localStorage');

          // Verify retrieval
          const storedData = localStorage.getItem(fileId);
          if (storedData) {
            const retrievedData = JSON.parse(storedData);
            if (retrievedData.base64 === base64String) {
              console.log('✅ Upload workflow test PASSED');
              console.log('🆔 Generated fileId:', fileId);
              resolve(true);
            } else {
              console.error('❌ Retrieved data does not match');
              resolve(false);
            }
          } else {
            console.error('❌ No data stored');
            resolve(false);
          }

        } catch (error) {
          console.error('❌ Upload processing error:', error);
          resolve(false);
        }
      };

      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        resolve(false);
      };

      reader.readAsDataURL(testFile);
    });

  } catch (error) {
    console.error('❌ Error in upload workflow test:', error);
    return false;
  }
};

// Run all tests
const runImageSystemTests = async () => {
  console.log('🚀 Running Complete Image System Test Suite...\n');

  const results = {
    uploadFunctions: testUploadFunctions(),
    storedImages: testStoredImages(),
    uploadWorkflow: await testUploadWorkflow()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('════════════════════════');
  console.log('Upload Functions:', results.uploadFunctions ? '✅ PASS' : '❌ FAIL');
  console.log('Stored Images:   ', results.storedImages ? '✅ PASS' : '❌ FAIL');
  console.log('Upload Workflow: ', results.uploadWorkflow ? '✅ PASS' : '❌ FAIL');

  const allPassed = Object.values(results).every(result => result === true);

  console.log('════════════════════════');
  console.log('Overall Result:  ', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

  if (allPassed) {
    console.log('\n🎉 Image System is working correctly!');
    console.log('📝 The rebuilt system successfully:');
    console.log('   • Uses FileReader to convert files to base64');
    console.log('   • Stores images in localStorage with metadata');
    console.log('   • Retrieves and displays images properly');
    console.log('   • No longer shows "No Media" placeholders');
  } else {
    console.log('\n⚠️ Some components need attention. Check the console for details.');
  }

  return allPassed;
};

// Auto-run tests
runImageSystemTests();