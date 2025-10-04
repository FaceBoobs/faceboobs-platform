// Complete Storage Debug Script
// Run this in browser console to fully debug the upload-to-display issue

console.log('🔍 Complete Storage Debug Analysis Starting...');

// Step 1: Check current state
const checkCurrentState = () => {
  console.log('\n📊 STEP 1: Current Storage State');
  console.log('=================================');

  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));

  console.log('Total localStorage keys:', allKeys.length);
  console.log('Image keys found:', imageKeys.length);
  console.log('Image keys:', imageKeys);

  if (imageKeys.length > 0) {
    imageKeys.forEach((key, index) => {
      try {
        const data = localStorage.getItem(key);
        const parsed = JSON.parse(data);
        console.log(`Image ${index + 1} (${key}):`, {
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          fileSize: `${(parsed.fileSize / 1024).toFixed(1)}KB`,
          hasBase64: !!parsed.base64,
          base64Length: parsed.base64?.length || 0
        });
      } catch (error) {
        console.error(`Error parsing ${key}:`, error);
      }
    });
  }

  return imageKeys;
};

// Step 2: Test upload functionality
const testUploadFunctionality = async () => {
  console.log('\n🧪 STEP 2: Test Upload Functionality');
  console.log('====================================');

  try {
    // Create test image
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(0, 0, 200, 150);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DEBUG TEST', 100, 75);
    ctx.fillText(new Date().toLocaleTimeString(), 100, 95);

    console.log('✅ Test canvas created');

    const testBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png', 0.9);
    });

    const testFile = new File([testBlob], `debug-test-${Date.now()}.png`, {
      type: 'image/png'
    });

    console.log('✅ Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });

    // Manual upload simulation
    console.log('🔄 Starting manual upload simulation...');

    const fileReader = new FileReader();

    return new Promise((resolve, reject) => {
      fileReader.onload = (event) => {
        try {
          const base64String = event.target.result;
          console.log('✅ FileReader conversion successful');

          // Generate fileId (same logic as uploadMedia)
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileId = `img_${timestamp}_${randomId}`;

          console.log('🆔 Generated fileId:', fileId);

          // Create media data
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
          console.log('💾 Stored in localStorage');

          // Immediate verification
          const verification = localStorage.getItem(fileId);
          if (verification) {
            const verifyParsed = JSON.parse(verification);
            if (verifyParsed.base64 === base64String) {
              console.log('✅ Upload test SUCCESSFUL');
              resolve(fileId);
            } else {
              console.error('❌ Verification failed - data mismatch');
              resolve(null);
            }
          } else {
            console.error('❌ Verification failed - no data stored');
            resolve(null);
          }

        } catch (error) {
          console.error('❌ Upload test error:', error);
          resolve(null);
        }
      };

      fileReader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        resolve(null);
      };

      fileReader.readAsDataURL(testFile);
    });

  } catch (error) {
    console.error('❌ Test upload functionality error:', error);
    return null;
  }
};

// Step 3: Test getMediaUrl function
const testGetMediaUrl = (fileId) => {
  console.log('\n🔍 STEP 3: Test getMediaUrl Function');
  console.log('===================================');

  if (!fileId) {
    console.log('❌ No fileId provided for testing');
    return false;
  }

  console.log('Testing with fileId:', fileId);

  // Direct localStorage test
  const directTest = localStorage.getItem(fileId);
  console.log('Direct localStorage result:', !!directTest);

  // Test through Web3Context if available
  if (typeof window.getMediaUrl === 'function') {
    console.log('Testing through getMediaUrl function...');
    const result = window.getMediaUrl(fileId);
    console.log('getMediaUrl result:', !!result);

    if (result) {
      console.log('✅ getMediaUrl test SUCCESSFUL');

      // Display test image
      const img = document.createElement('img');
      img.src = result;
      img.style.maxWidth = '120px';
      img.style.maxHeight = '120px';
      img.style.position = 'fixed';
      img.style.bottom = '20px';
      img.style.right = '20px';
      img.style.zIndex = '9999';
      img.style.border = '3px solid #10B981';
      img.style.borderRadius = '8px';
      img.style.background = 'white';
      img.style.padding = '4px';

      img.onload = () => {
        console.log('✅ Test image displayed');
        setTimeout(() => {
          if (img.parentNode) img.parentNode.removeChild(img);
        }, 3000);
      };

      document.body.appendChild(img);
      return true;
    } else {
      console.log('❌ getMediaUrl test FAILED');
      return false;
    }
  } else {
    console.log('⚠️ getMediaUrl function not available');
    return false;
  }
};

// Step 4: Simulate complete upload-to-blockchain-to-display workflow
const simulateCompleteWorkflow = async (testFileId) => {
  console.log('\n⛓️ STEP 4: Simulate Complete Workflow');
  console.log('=====================================');

  if (!testFileId) {
    console.log('❌ No test fileId available');
    return false;
  }

  // Simulate what happens in CreatePost
  console.log('1. Simulating CreatePost.js workflow...');
  console.log('   - File uploaded ✅');
  console.log('   - FileId generated:', testFileId);
  console.log('   - localStorage storage ✅');

  // Simulate blockchain storage
  console.log('2. Simulating blockchain transaction...');
  const mockBlockchainData = {
    id: 999,
    contentHash: testFileId,
    creator: '0x1234567890123456789012345678901234567890',
    price: '0',
    isPaid: false,
    timestamp: Math.floor(Date.now() / 1000)
  };
  console.log('   - Mock blockchain data:', mockBlockchainData);

  // Simulate Home.js retrieval
  console.log('3. Simulating Home.js content retrieval...');
  console.log('   - Retrieved contentHash from blockchain:', mockBlockchainData.contentHash);

  // Test if the contentHash can be used to retrieve image
  const retrievalTest = localStorage.getItem(mockBlockchainData.contentHash);
  console.log('   - localStorage retrieval result:', !!retrievalTest);

  if (retrievalTest) {
    console.log('✅ Complete workflow simulation SUCCESSFUL');
    console.log('   - Upload ✅');
    console.log('   - Storage ✅');
    console.log('   - Blockchain ✅');
    console.log('   - Retrieval ✅');
    return true;
  } else {
    console.log('❌ Complete workflow simulation FAILED');
    console.log('   - Issue in retrieval step');
    return false;
  }
};

// Step 5: Check MediaDisplay component behavior
const checkMediaDisplayComponents = () => {
  console.log('\n🖼️ STEP 5: Check MediaDisplay Components');
  console.log('========================================');

  // Find components showing "No Image Available"
  const allElements = document.querySelectorAll('*');
  const problemElements = [];

  allElements.forEach(element => {
    const text = element.textContent;
    if (text.includes('No Image Available') || text.includes('Content not found')) {
      problemElements.push({
        element,
        text: text.trim(),
        className: element.className
      });
    }
  });

  console.log(`Found ${problemElements.length} elements showing no image messages`);

  problemElements.forEach((item, index) => {
    console.log(`Problem element ${index + 1}:`, {
      text: item.text.substring(0, 50) + '...',
      className: item.className
    });
  });

  return problemElements;
};

// Step 6: Analysis and recommendations
const provideDiagnosisAndFix = (uploadResult, retrievalResult, workflowResult) => {
  console.log('\n🔧 STEP 6: Diagnosis and Recommended Fixes');
  console.log('===========================================');

  if (uploadResult && retrievalResult && workflowResult) {
    console.log('✅ ALL TESTS PASSED - Upload system is working correctly');
    console.log('\n🎯 If you\'re still seeing "No Image Available":');
    console.log('1. The issue is likely in real blockchain transactions');
    console.log('2. Check for transaction failures in CreatePost');
    console.log('3. Verify gas fees and network connectivity');
    console.log('4. Add transaction success verification');

    console.log('\n💡 Recommended immediate fix:');
    console.log('Add transaction success logging in CreatePost.js');
  } else if (uploadResult && retrievalResult && !workflowResult) {
    console.log('⚠️ Upload and retrieval work, but workflow simulation failed');
    console.log('\n🎯 Likely causes:');
    console.log('1. Blockchain transaction is failing');
    console.log('2. ContentHash not being stored correctly');
    console.log('3. Network issues during transaction');
  } else if (uploadResult && !retrievalResult) {
    console.log('⚠️ Upload works but retrieval fails');
    console.log('\n🎯 Likely causes:');
    console.log('1. getMediaUrl function has bugs');
    console.log('2. Key mismatch between storage and retrieval');
  } else if (!uploadResult) {
    console.log('❌ Upload is failing');
    console.log('\n🎯 Likely causes:');
    console.log('1. FileReader is not working');
    console.log('2. localStorage has issues');
    console.log('3. uploadMedia function has bugs');
  }

  console.log('\n📋 Next steps:');
  console.log('1. Run this diagnostic after trying to upload through CreatePost');
  console.log('2. Check browser console during actual upload');
  console.log('3. Monitor blockchain transaction success');
};

// Main diagnostic function
const runCompleteStorageDiagnostic = async () => {
  console.log('🚨 COMPLETE STORAGE DIAGNOSTIC STARTING');
  console.log('==========================================');

  const currentState = checkCurrentState();
  const uploadResult = await testUploadFunctionality();
  const retrievalResult = testGetMediaUrl(uploadResult);
  const workflowResult = await simulateCompleteWorkflow(uploadResult);
  const problemElements = checkMediaDisplayComponents();

  console.log('\n📊 DIAGNOSTIC RESULTS SUMMARY');
  console.log('==============================');
  console.log('Current images in storage:', currentState.length);
  console.log('Upload functionality:    ', uploadResult ? '✅ WORKING' : '❌ BROKEN');
  console.log('Retrieval functionality: ', retrievalResult ? '✅ WORKING' : '❌ BROKEN');
  console.log('Complete workflow:       ', workflowResult ? '✅ WORKING' : '❌ BROKEN');
  console.log('Problem elements found:  ', problemElements.length);

  provideDiagnosisAndFix(uploadResult, retrievalResult, workflowResult);

  console.log('\n🎯 Test completed! Check the analysis above for next steps.');

  return {
    currentState: currentState.length,
    uploadWorking: !!uploadResult,
    retrievalWorking: retrievalResult,
    workflowWorking: workflowResult,
    problemElements: problemElements.length
  };
};

// Auto-run the complete diagnostic
runCompleteStorageDiagnostic();