// Debug FileID Mismatch Script
// Run this in browser console to analyze the upload-to-blockchain-to-display issue

console.log('🔍 FileID Mismatch Analysis Starting...');

// Function to analyze localStorage vs blockchain contentHash values
const analyzeFileIdMismatch = () => {
  console.log('\n📊 STEP 1: Current localStorage Analysis');
  console.log('=====================================');

  const allKeys = Object.keys(localStorage);
  const imageKeys = allKeys.filter(key => key.startsWith('img_'));

  console.log('Total localStorage keys:', allKeys.length);
  console.log('Image keys found:', imageKeys.length);
  console.log('Sample image keys:', imageKeys.slice(0, 5));

  if (imageKeys.length > 0) {
    imageKeys.forEach((key, index) => {
      try {
        const data = localStorage.getItem(key);
        const parsed = JSON.parse(data);
        console.log(`Image ${index + 1}:`, {
          key: key,
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          timestamp: parsed.timestamp,
          uploadDate: parsed.uploadDate,
          hasBase64: !!parsed.base64
        });
      } catch (error) {
        console.error(`Error parsing ${key}:`, error);
      }
    });
  }

  return imageKeys;
};

// Function to simulate blockchain contentHash comparison
const simulateBlockchainContentHash = (imageKeys) => {
  console.log('\n⛓️ STEP 2: Simulate Blockchain ContentHash Lookup');
  console.log('==================================================');

  if (imageKeys.length === 0) {
    console.log('❌ No images to compare with blockchain data');
    return;
  }

  // Get the most recent image as an example
  const sortedKeys = imageKeys.sort((a, b) => {
    const aTime = parseInt(a.split('_')[1]) || 0;
    const bTime = parseInt(b.split('_')[1]) || 0;
    return bTime - aTime;
  });

  const mostRecentKey = sortedKeys[0];
  console.log('🎯 Most recent localStorage key:', mostRecentKey);

  // Simulate what would happen in Home.js
  console.log('\n📝 Simulation: Home.js receives contentHash from blockchain');
  console.log('Simulated blockchain contentHash:', mostRecentKey);

  // Test the getMediaUrl function if available
  if (typeof window.getMediaUrl === 'function') {
    console.log('\n🧪 Testing getMediaUrl function...');

    console.log('Test 1: Correct key');
    const correctResult = window.getMediaUrl(mostRecentKey);
    console.log('Result with correct key:', !!correctResult);

    console.log('Test 2: Incorrect key (simulated blockchain mismatch)');
    const wrongKey = 'img_' + (Date.now() - 10000) + '_wrong';
    const wrongResult = window.getMediaUrl(wrongKey);
    console.log('Result with wrong key:', !!wrongResult);
    console.log('Should trigger fallback system');

  } else {
    console.log('⚠️ getMediaUrl function not available');
  }
};

// Function to check for blockchain transaction integrity
const checkBlockchainIntegrity = () => {
  console.log('\n🔗 STEP 3: Blockchain Transaction Integrity Check');
  console.log('================================================');

  console.log('Common causes of fileId mismatch:');
  console.log('1. Smart contract is truncating or modifying the contentHash');
  console.log('2. Blockchain transaction failed but appeared successful');
  console.log('3. Gas limit issues causing partial transaction execution');
  console.log('4. Network issues during transaction submission');
  console.log('5. Multiple rapid uploads causing race conditions');

  console.log('\n💡 Recommended checks:');
  console.log('1. Check CreatePost console logs during upload');
  console.log('2. Verify transaction hash on BSC testnet explorer');
  console.log('3. Check if contentHash in blockchain matches localStorage key exactly');
  console.log('4. Look for transaction failure or revert messages');
};

// Function to provide specific debugging steps
const providDebuggingSteps = () => {
  console.log('\n🛠️ STEP 4: Debugging Action Plan');
  console.log('=================================');

  console.log('To debug the fileId mapping issue:');
  console.log('');
  console.log('1. 📤 DURING UPLOAD (CreatePost):');
  console.log('   - Watch console for uploadMedia return value');
  console.log('   - Note the exact contentHash being sent to blockchain');
  console.log('   - Verify localStorage.getItem(contentHash) returns data');
  console.log('');
  console.log('2. 🏠 DURING DISPLAY (Home):');
  console.log('   - Check contentHash received from blockchain');
  console.log('   - Compare with available localStorage keys');
  console.log('   - Watch for fallback system activation');
  console.log('');
  console.log('3. 🔧 POTENTIAL FIXES:');
  console.log('   - Add contentHash validation before blockchain storage');
  console.log('   - Implement retry mechanism for failed transactions');
  console.log('   - Add explicit contentHash logging in smart contract events');
  console.log('   - Create fallback mapping system');
};

// Main analysis function
const runFileIdAnalysis = () => {
  console.log('🚨 FILEID MISMATCH DIAGNOSTIC');
  console.log('=============================');

  const imageKeys = analyzeFileIdMismatch();
  simulateBlockchainContentHash(imageKeys);
  checkBlockchainIntegrity();
  providDebuggingSteps();

  console.log('\n✅ FileID analysis complete!');
  console.log('Now try uploading an image and watch the console logs.');
};

// Auto-run the analysis
runFileIdAnalysis();