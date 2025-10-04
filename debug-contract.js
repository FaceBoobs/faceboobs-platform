const { ethers } = require("ethers");
const fs = require("fs");

// Contract details
const CONTRACT_ADDRESS = "0x575e0532445489dd31C12615BeC7C63d737B69DD";
const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545";

// Load ABI files
const FRONTEND_ABI_PATH = "./frontend/src/contracts/SocialPlatform.json";
const ARTIFACTS_ABI_PATH = "./artifacts/contracts/SocialPlatform.sol/SocialPlatform.json";

async function debugContract() {
  console.log("🔍 STARTING CONTRACT DEBUGGING");
  console.log("=" .repeat(50));
  
  try {
    // Step 1: Test provider connection
    console.log("\n📡 STEP 1: Testing Provider Connection");
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    
    try {
      const network = await provider.getNetwork();
      console.log("✅ Provider connected successfully");
      console.log("   - Network:", network.name);
      console.log("   - Chain ID:", Number(network.chainId));
      console.log("   - Block Number:", await provider.getBlockNumber());
    } catch (error) {
      console.error("❌ Provider connection failed:", error.message);
      return;
    }
    
    // Step 2: Check contract deployment
    console.log("\n📝 STEP 2: Checking Contract Deployment");
    console.log("   - Contract Address:", CONTRACT_ADDRESS);
    
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      console.error("❌ Contract not deployed at this address!");
      return;
    }
    
    console.log("✅ Contract is deployed");
    console.log("   - Bytecode length:", code.length, "characters");
    console.log("   - Bytecode preview:", code.substring(0, 100) + "...");
    
    // Step 3: Load and compare ABI files
    console.log("\n📋 STEP 3: ABI Analysis");
    
    let frontendABI, artifactsABI;
    
    // Load frontend ABI
    try {
      const frontendData = JSON.parse(fs.readFileSync(FRONTEND_ABI_PATH, "utf8"));
      frontendABI = frontendData.abi;
      console.log("✅ Frontend ABI loaded");
      console.log("   - Functions count:", frontendABI.filter(item => item.type === "function").length);
    } catch (error) {
      console.error("❌ Failed to load frontend ABI:", error.message);
    }
    
    // Load artifacts ABI
    try {
      const artifactsData = JSON.parse(fs.readFileSync(ARTIFACTS_ABI_PATH, "utf8"));
      artifactsABI = artifactsData.abi;
      console.log("✅ Artifacts ABI loaded");
      console.log("   - Functions count:", artifactsABI.filter(item => item.type === "function").length);
    } catch (error) {
      console.error("❌ Failed to load artifacts ABI:", error.message);
    }
    
    // Compare ABIs
    if (frontendABI && artifactsABI) {
      const frontendHash = JSON.stringify(frontendABI);
      const artifactsHash = JSON.stringify(artifactsABI);
      
      if (frontendHash === artifactsHash) {
        console.log("✅ ABI files match perfectly");
      } else {
        console.log("⚠️  ABI files differ - this could cause issues");
        console.log("   Frontend ABI hash:", frontendHash.substring(0, 50) + "...");
        console.log("   Artifacts ABI hash:", artifactsHash.substring(0, 50) + "...");
      }
    }
    
    // Step 4: Test simple contract functions
    console.log("\n🧪 STEP 4: Testing Contract Functions");
    
    const abiToUse = frontendABI || artifactsABI;
    if (!abiToUse) {
      console.error("❌ No ABI available for testing");
      return;
    }
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abiToUse, provider);
    
    // Test 1: contentCounter (simple read function)
    console.log("\n   Test 1: contentCounter()");
    try {
      const contentCounter = await contract.contentCounter();
      console.log("   ✅ contentCounter:", contentCounter.toString());
    } catch (error) {
      console.error("   ❌ contentCounter failed:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error data:", error.data);
    }
    
    // Test 2: storyCounter (simple read function)
    console.log("\n   Test 2: storyCounter()");
    try {
      const storyCounter = await contract.storyCounter();
      console.log("   ✅ storyCounter:", storyCounter.toString());
    } catch (error) {
      console.error("   ❌ storyCounter failed:", error.message);
    }
    
    // Test 3: platformFee (simple read function)
    console.log("\n   Test 3: platformFee()");
    try {
      const platformFee = await contract.platformFee();
      console.log("   ✅ platformFee:", platformFee.toString());
    } catch (error) {
      console.error("   ❌ platformFee failed:", error.message);
    }
    
    // Test 4: owner (simple read function)
    console.log("\n   Test 4: owner()");
    try {
      const owner = await contract.owner();
      console.log("   ✅ owner:", owner);
    } catch (error) {
      console.error("   ❌ owner failed:", error.message);
    }
    
    // Test 5: getUser with zero address (should return empty user)
    console.log("\n   Test 5: getUser(zero address)");
    try {
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      const userData = await contract.getUser(zeroAddress);
      console.log("   ✅ getUser returned:");
      console.log("      - username:", userData.username);
      console.log("      - exists:", userData.exists);
    } catch (error) {
      console.error("   ❌ getUser failed:", error.message);
    }
    
    // Step 5: Analyze function signatures
    console.log("\n🔍 STEP 5: Function Signature Analysis");
    
    const functions = abiToUse.filter(item => item.type === "function");
    console.log("Available functions:");
    
    functions.forEach(func => {
      const signature = `${func.name}(${func.inputs.map(input => input.type).join(",")})`;
      const selector = ethers.id(signature).substring(0, 10);
      console.log(`   - ${signature} -> ${selector}`);
    });
    
    // Step 6: Check deployment info
    console.log("\n📊 STEP 6: Deployment Information");
    try {
      const deploymentData = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
      console.log("✅ Deployment info found:");
      console.log("   - Contract Address:", deploymentData.contractAddress);
      console.log("   - Deployer:", deploymentData.deployer);
      console.log("   - Transaction Hash:", deploymentData.transactionHash);
      console.log("   - Timestamp:", deploymentData.timestamp);
      
      // Verify the deployment transaction
      try {
        const tx = await provider.getTransaction(deploymentData.transactionHash);
        if (tx) {
          console.log("✅ Deployment transaction found:");
          console.log("   - Status: Confirmed");
          console.log("   - Block Number:", tx.blockNumber);
          console.log("   - Gas Used:", tx.gasLimit?.toString());
        } else {
          console.log("⚠️  Deployment transaction not found");
        }
      } catch (error) {
        console.error("❌ Failed to fetch deployment transaction:", error.message);
      }
      
    } catch (error) {
      console.log("⚠️  No deployment.json found");
    }
    
  } catch (error) {
    console.error("❌ DEBUGGING FAILED:", error.message);
    console.error("Full error:", error);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("🏁 DEBUGGING COMPLETE");
}

// Additional utility function to test with hardhat console
async function testWithHardhat() {
  console.log("\n🔧 TESTING WITH HARDHAT");
  
  try {
    const hre = require("hardhat");
    
    // Get the contract factory
    const SocialPlatform = await hre.ethers.getContractFactory("SocialPlatform");
    
    // Attach to deployed contract
    const contract = SocialPlatform.attach(CONTRACT_ADDRESS);
    
    // Test basic functions
    console.log("Testing with Hardhat provider...");
    
    const contentCounter = await contract.contentCounter();
    console.log("✅ contentCounter (Hardhat):", contentCounter.toString());
    
    const owner = await contract.owner();
    console.log("✅ owner (Hardhat):", owner);
    
  } catch (error) {
    console.error("❌ Hardhat test failed:", error.message);
  }
}

// Run the debugging
if (require.main === module) {
  debugContract()
    .then(() => {
      console.log("\n🔄 Running Hardhat test...");
      return testWithHardhat();
    })
    .then(() => {
      console.log("\n✅ All tests completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { debugContract, testWithHardhat };