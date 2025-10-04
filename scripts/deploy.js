const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Starting deployment process...");
  console.log("=======================================");
  
  // STEP 1: Ottieni account deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // STEP 2: Controlla saldo (VERSIONE AGGIORNATA)
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBNB = hre.ethers.formatEther(balance);
  console.log("💰 Account balance:", balanceInBNB, "BNB");
  
  // STEP 3: Verifica saldo minimo
  if (parseFloat(balanceInBNB) < 0.01) {
    console.log("❌ Insufficient balance! You need at least 0.01 BNB");
    console.log("💡 Get testnet BNB from: https://testnet.binance.org/faucet-smart");
    process.exit(1);
  }
  
  // STEP 4: Ottieni factory del contratto
  console.log("🔨 Getting contract factory...");
  const SocialPlatform = await hre.ethers.getContractFactory("SocialPlatform");
  
  // STEP 5: Deploy del contratto
  console.log("🚀 Deploying SocialPlatform contract...");
  const socialPlatform = await SocialPlatform.deploy();
  
  console.log("⏳ Waiting for deployment confirmation...");
  await socialPlatform.waitForDeployment();
  
  // STEP 6: Ottieni indirizzo contratto
  const contractAddress = await socialPlatform.getAddress();
  
  // STEP 7: Informazioni deploy
  console.log("=======================================");
  console.log("✅ SocialPlatform deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🔗 BSC Testnet Explorer:", `https://testnet.bscscan.com/address/${contractAddress}`);
  console.log("🧾 Transaction hash:", socialPlatform.deploymentTransaction().hash);
  
  // STEP 8: Salva informazioni deploy
  const deploymentInfo = {
    contractAddress: contractAddress,
    contractName: "SocialPlatform",
    network: "BSC Testnet",
    chainId: 97,
    deployer: deployer.address,
    deployerBalance: balanceInBNB,
    transactionHash: socialPlatform.deploymentTransaction().hash,
    timestamp: new Date().toISOString(),
    explorerUrl: `https://testnet.bscscan.com/address/${contractAddress}`
  };
  
  // Salva in file JSON
  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to deployment.json");
  
  // Salva solo l'indirizzo (per facilità)
  fs.writeFileSync('contract-address.txt', contractAddress);
  console.log("📄 Contract address saved to contract-address.txt");
  
  console.log("=======================================");
  console.log("🎉 Deployment completed successfully!");
}

// Gestione errori
main()
  .then(() => {
    console.log("✅ Script executed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    
    // Errori comuni e soluzioni
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get more testnet BNB from faucet");
    } else if (error.message.includes("network")) {
      console.log("\n💡 Solution: Check your internet connection and BSC Testnet RPC");
    } else if (error.message.includes("private key")) {
      console.log("\n💡 Solution: Check your .env file and private key");
    }
    
    process.exit(1);
  });