// Debug MediaDisplay Data Flow Script
// Run this in browser console to analyze the getMediaUrl to MediaDisplay flow

console.log('🔍 MediaDisplay Data Flow Analysis Starting...');

// Function to test the data flow between getMediaUrl and MediaDisplay
const debugMediaDisplayFlow = () => {
  console.log('\n📊 STEP 1: Test getMediaUrl function directly');
  console.log('=====================================');

  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));

  console.log('Available image keys:', imageKeys);

  if (imageKeys.length === 0) {
    console.log('❌ No images in localStorage to test with');
    return;
  }

  // Test with various fileId scenarios
  const testScenarios = [
    {
      name: 'Exact match test',
      fileId: imageKeys[0], // Use first available image key
      expectedResult: 'Should find exact match'
    },
    {
      name: 'IPFS hash test (should trigger fallback)',
      fileId: 'QmTestHashThatWontMatch12345',
      expectedResult: 'Should trigger fallback system'
    },
    {
      name: 'Different img_ key test',
      fileId: 'img_' + Date.now() + '_nonexistent',
      expectedResult: 'Should trigger fallback system'
    }
  ];

  testScenarios.forEach((scenario, index) => {
    console.log(`\n🧪 Test ${index + 1}: ${scenario.name}`);
    console.log(`📋 Testing fileId: ${scenario.fileId}`);
    console.log(`📋 Expected: ${scenario.expectedResult}`);

    // Test getMediaUrl if available
    if (typeof window.getMediaUrl === 'function') {
      const result = window.getMediaUrl(scenario.fileId);
      console.log(`📋 Result: ${result ? 'Found media data' : 'No media data'}`);
      if (result) {
        console.log(`📋 Data length: ${result.length} characters`);
        console.log(`📋 Data type: ${result.substring(0, 20)}...`);
      }
    } else {
      console.log('❌ getMediaUrl function not available on window');
    }

    console.log('---');
  });
};

// Function to simulate MediaDisplay component behavior
const simulateMediaDisplayLogic = () => {
  console.log('\n📊 STEP 2: Simulate MediaDisplay component logic');
  console.log('================================================');

  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));

  if (imageKeys.length === 0) {
    console.log('❌ No images to simulate MediaDisplay with');
    return;
  }

  // Test what MediaDisplay would do with various fileIds
  const testFileIds = [
    imageKeys[0], // Exact match
    'QmTestHash', // IPFS hash that should trigger fallback
    'some_random_id' // Non-matching ID
  ];

  testFileIds.forEach((fileId, index) => {
    console.log(`\n🎭 MediaDisplay simulation ${index + 1}:`);
    console.log(`📋 Input fileId: ${fileId}`);

    // Simulate MediaDisplay's getMediaUrl call
    let mediaUrl = null;
    if (typeof window.getMediaUrl === 'function') {
      mediaUrl = window.getMediaUrl(fileId);
    }

    console.log(`📋 mediaUrl result: ${mediaUrl ? 'Found' : 'null'}`);

    // Simulate MediaDisplay's conditional rendering
    if (!mediaUrl) {
      console.log('🖼️ MediaDisplay would show: PLACEHOLDER');
      console.log('   Reason: !mediaUrl is true');
    } else {
      console.log('🖼️ MediaDisplay would show: ACTUAL IMAGE');
      console.log('   Reason: mediaUrl exists');
    }

    console.log('---');
  });
};

// Function to check for timing issues
const checkTimingIssues = () => {
  console.log('\n📊 STEP 3: Check for timing/async issues');
  console.log('=========================================');

  console.log('MediaDisplay calls getMediaUrl synchronously.');
  console.log('getMediaUrl should return data immediately from localStorage.');
  console.log('If fallback is working but MediaDisplay shows placeholder,');
  console.log('the issue is likely in the conditional logic, not timing.');

  // Test localStorage access speed
  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));

  if (imageKeys.length > 0) {
    const testKey = imageKeys[0];
    console.log('\n🏃 Performance test:');

    const startTime = performance.now();
    const data = localStorage.getItem(testKey);
    const endTime = performance.now();

    console.log(`📋 localStorage.getItem() took: ${endTime - startTime}ms`);
    console.log(`📋 Data retrieved: ${data ? 'Success' : 'Failed'}`);

    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`📋 JSON.parse successful: ${!!parsed.base64}`);
      } catch (error) {
        console.log(`📋 JSON.parse failed: ${error.message}`);
      }
    }
  }
};

// Function to provide debugging recommendations
const provideDebuggingRecommendations = () => {
  console.log('\n🛠️ STEP 4: Debugging Recommendations');
  console.log('====================================');

  console.log('To debug the MediaDisplay issue:');
  console.log('');
  console.log('1. 🔍 Check browser console for:');
  console.log('   - "🖼️ MediaDisplay render:" logs');
  console.log('   - "📂 MediaDisplay media check:" logs');
  console.log('   - "❌ MediaDisplay showing placeholder:" logs');
  console.log('');
  console.log('2. 🔍 Look for getMediaUrl fallback logs:');
  console.log('   - "🔄 Attempting fallback to most recent image..."');
  console.log('   - "✅ FALLBACK SUCCESS - returning most recent image"');
  console.log('');
  console.log('3. 🔍 Check the exact sequence:');
  console.log('   - MediaDisplay calls getMediaUrl(fileId)');
  console.log('   - getMediaUrl should log its process');
  console.log('   - MediaDisplay should log the mediaUrl result');
  console.log('   - MediaDisplay decides to show image or placeholder');
  console.log('');
  console.log('4. 🔧 Potential fixes if fallback works but MediaDisplay fails:');
  console.log('   - Add more logging to MediaDisplay component');
  console.log('   - Check if mediaUrl is being overridden somewhere');
  console.log('   - Verify MediaDisplay conditional logic');
};

// Main debug function
const runMediaDisplayFlowDebug = () => {
  console.log('🚨 MEDIADISPLAY DATA FLOW DIAGNOSTIC');
  console.log('===================================');

  debugMediaDisplayFlow();
  simulateMediaDisplayLogic();
  checkTimingIssues();
  provideDebuggingRecommendations();

  console.log('\n✅ MediaDisplay flow analysis complete!');
  console.log('Now check the browser console while navigating the app.');
};

// Auto-run the analysis
runMediaDisplayFlowDebug();