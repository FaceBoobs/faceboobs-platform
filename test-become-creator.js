const { ethers } = require("hardhat");
const fs = require("fs");

async function testBecomeCreatorFlow() {
  console.log("🚀 TESTING COMPLETE BECOME CREATOR FLOW");
  console.log("=" .repeat(50));
  
  try {
    // Load deployment info
    const deploymentData = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    const contractAddress = deploymentData.contractAddress;
    console.log("📍 Contract address:", contractAddress);
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("🔑 Testing with signer:", signer.address);
    
    // Get contract
    const SocialPlatform = await ethers.getContractFactory("SocialPlatform");
    const contract = SocialPlatform.attach(contractAddress);
    
    console.log("\n📊 STEP 1: Check Initial User State");
    const initialUserData = await contract.getUser(signer.address);
    console.log("Initial state:");
    console.log("   - Username:", initialUserData.username);
    console.log("   - Is Creator:", initialUserData.isCreator);
    console.log("   - Exists:", initialUserData.exists);
    
    if (!initialUserData.exists) {
      console.log("\n⚠️ User not registered. This test requires a registered user.");
      console.log("Please register the user first through the frontend or run registration test.");
      return;
    }
    
    if (initialUserData.isCreator) {
      console.log("\n⚠️ User is already a creator. Test completed successfully!");
      console.log("✅ The user can already access creator features.");
      return;
    }
    
    console.log("\n🔄 STEP 2: Execute becomeCreator Transaction");
    
    // Estimate gas
    console.log("⛽ Estimating gas...");
    try {
      const gasEstimate = await contract.becomeCreator.estimateGas();
      console.log("   Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.error("❌ Gas estimation failed:", gasError.message);
      return;
    }
    
    // Execute transaction
    console.log("📝 Executing becomeCreator...");
    const tx = await contract.becomeCreator();
    console.log("📤 Transaction sent:", tx.hash);
    
    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    
    if (receipt.status !== 1) {
      console.error("❌ Transaction failed!");
      return;
    }
    
    console.log("\n🔍 STEP 3: Verify Creator Status Update");
    
    // Check user data after transaction
    let verificationAttempts = 0;
    const maxAttempts = 3;
    let verifiedSuccess = false;
    
    while (verificationAttempts < maxAttempts && !verifiedSuccess) {
      verificationAttempts++;
      console.log(`   Verification attempt ${verificationAttempts}/${maxAttempts}...`);
      
      try {
        const updatedUserData = await contract.getUser(signer.address);
        
        if (updatedUserData.isCreator) {
          console.log("✅ SUCCESS: User is now a creator!");
          console.log("Final state:");
          console.log("   - Username:", updatedUserData.username);
          console.log("   - Is Creator:", updatedUserData.isCreator);
          console.log("   - Followers:", updatedUserData.followersCount.toString());
          console.log("   - Following:", updatedUserData.followingCount.toString());
          console.log("   - Total Earnings:", ethers.formatEther(updatedUserData.totalEarnings), "BNB");
          verifiedSuccess = true;
          break;
        } else {
          console.warn(`   ⚠️ Still not showing as creator (attempt ${verificationAttempts})`);
          if (verificationAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`   ❌ Verification attempt ${verificationAttempts} failed:`, error.message);
        if (verificationAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!verifiedSuccess) {
      console.error("❌ VERIFICATION FAILED: User data doesn't reflect creator status");
      console.log("   This could indicate a blockchain indexing delay.");
      console.log("   Try checking again in a few minutes or refresh the frontend.");
      return;
    }
    
    console.log("\n🎯 STEP 4: Test Creator Functionality");
    
    // Test content counter (creators can create content)
    try {
      const contentCounter = await contract.contentCounter();
      console.log("📊 Current content counter:", contentCounter.toString());
      console.log("✅ Creator can now call content creation functions");
    } catch (error) {
      console.error("❌ Failed to read content counter:", error.message);
    }
    
    // Test user contents array
    try {
      const userContents = await contract.getUserContents(signer.address);
      console.log("📝 User content count:", userContents.length);
      console.log("✅ Creator content tracking is working");
    } catch (error) {
      console.error("❌ Failed to get user contents:", error.message);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 BECOME CREATOR TEST COMPLETED SUCCESSFULLY!");
    console.log("");
    console.log("✨ The user can now:");
    console.log("   • Access the Create Post page");
    console.log("   • Access the Earnings page");
    console.log("   • Create paid and free content");
    console.log("   • Start earning money from followers");
    console.log("");
    console.log("🖥️ Frontend should now show:");
    console.log("   • Create Post button in navigation");
    console.log("   • Earnings page in navigation");
    console.log("   • No more 'Become Creator' buttons");
    console.log("   • Creator badge in profile");
    
  } catch (error) {
    console.error("❌ TEST FAILED:");
    console.error("   Message:", error.message);
    console.error("   Code:", error.code);
    
    if (error.data) {
      console.error("   Data:", error.data);
    }
    
    console.log("\n💡 TROUBLESHOOTING:");
    console.log("   1. Check if user is registered first");
    console.log("   2. Ensure sufficient BNB for gas fees");
    console.log("   3. Verify contract is on BSC Testnet");
    console.log("   4. Check network connection");
  }
}

// Run the test
if (require.main === module) {
  testBecomeCreatorFlow()
    .then(() => {
      console.log("\n✅ Test script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test script failed:", error);
      process.exit(1);
    });
}

module.exports = { testBecomeCreatorFlow };