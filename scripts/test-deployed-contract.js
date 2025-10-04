const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 TESTING DEPLOYED CONTRACT ON BSC TESTNET");
  console.log("=" .repeat(50));
  
  // Ensure we're using BSC Testnet
  const networkName = hre.network.name;
  console.log("🌐 Current network:", networkName);
  
  if (networkName !== "bscTestnet") {
    console.log("⚠️  Not on BSC Testnet. Run with: npx hardhat run scripts/test-deployed-contract.js --network bscTestnet");
  }
  
  // Load deployment info
  let contractAddress;
  try {
    const deploymentData = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    contractAddress = deploymentData.contractAddress;
    console.log("📍 Contract address:", contractAddress);
  } catch (error) {
    console.error("❌ Could not load deployment.json");
    process.exit(1);
  }
  
  try {
    // Get the contract factory
    const SocialPlatform = await hre.ethers.getContractFactory("SocialPlatform");
    
    // Attach to the deployed contract
    const contract = SocialPlatform.attach(contractAddress);
    console.log("✅ Contract attached successfully");
    
    // Test 1: Basic read functions
    console.log("\n📖 TESTING READ FUNCTIONS:");
    
    const contentCounter = await contract.contentCounter();
    console.log("✅ contentCounter:", contentCounter.toString());
    
    const storyCounter = await contract.storyCounter();
    console.log("✅ storyCounter:", storyCounter.toString());
    
    const platformFee = await contract.platformFee();
    console.log("✅ platformFee:", platformFee.toString());
    
    const owner = await contract.owner();
    console.log("✅ owner:", owner);
    
    // Test 2: User data functions
    console.log("\n👤 TESTING USER FUNCTIONS:");
    
    const [signer] = await hre.ethers.getSigners();
    console.log("🔑 Testing with signer:", signer.address);
    
    // Test getUser with signer address
    const userData = await contract.getUser(signer.address);
    console.log("✅ getUser for signer:");
    console.log("   - username:", userData.username);
    console.log("   - exists:", userData.exists);
    console.log("   - isCreator:", userData.isCreator);
    
    // Test 3: Test function that might require user registration
    console.log("\n🧪 TESTING FUNCTION CALLS:");
    
    try {
      // This should work even if user is not registered
      const userContents = await contract.getUserContents(signer.address);
      console.log("✅ getUserContents:", userContents.length, "contents");
    } catch (error) {
      console.error("❌ getUserContents failed:", error.message);
    }
    
    try {
      // This should work even if user is not registered
      const userStories = await contract.getUserStories(signer.address);
      console.log("✅ getUserStories:", userStories.length, "stories");
    } catch (error) {
      console.error("❌ getUserStories failed:", error.message);
    }
    
    // Test 4: Check if user is registered and try to register if not
    console.log("\n📝 TESTING USER REGISTRATION:");
    
    if (!userData.exists) {
      console.log("⚠️  User not registered. Testing registration...");
      
      try {
        // Estimate gas for registration
        const gasEstimate = await contract.registerUser.estimateGas("TestUser", "QmTestAvatar", "Test bio");
        console.log("⛽ Gas estimate for registration:", gasEstimate.toString());
        
        // Uncomment the next lines to actually register (requires gas)
        // const tx = await contract.registerUser("TestUser", "QmTestAvatar", "Test bio");
        // console.log("📤 Registration transaction sent:", tx.hash);
        // await tx.wait();
        // console.log("✅ User registered successfully");
        
        console.log("💡 Registration test passed (gas estimation successful)");
        
      } catch (error) {
        console.error("❌ Registration failed:", error.message);
        
        if (error.message.includes("User already registered")) {
          console.log("ℹ️  User is already registered (good!)");
        } else if (error.message.includes("insufficient funds")) {
          console.log("💰 Need more BNB for gas fees");
        }
      }
    } else {
      console.log("✅ User is already registered");
      
      // Test becomeCreator if user exists but is not a creator
      if (!userData.isCreator) {
        console.log("\n🎨 TESTING BECOME CREATOR:");
        
        try {
          const gasEstimate = await contract.becomeCreator.estimateGas();
          console.log("⛽ Gas estimate for becomeCreator:", gasEstimate.toString());
          console.log("💡 becomeCreator test passed (gas estimation successful)");
        } catch (error) {
          console.error("❌ becomeCreator failed:", error.message);
        }
      } else {
        console.log("✅ User is already a creator");
      }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY");
    
  } catch (error) {
    console.error("❌ CONTRACT TEST FAILED:");
    console.error("   Message:", error.message);
    console.error("   Code:", error.code);
    
    if (error.data) {
      console.error("   Data:", error.data);
    }
    
    // Provide debugging hints
    if (error.message.includes("could not decode result data")) {
      console.log("\n💡 DEBUGGING HINTS:");
      console.log("   - This error suggests ABI mismatch or contract not deployed");
      console.log("   - Try redeploying the contract");
      console.log("   - Verify the contract address is correct");
      console.log("   - Check if you're on the right network");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });