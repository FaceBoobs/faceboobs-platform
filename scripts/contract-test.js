const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting contract test...");
  
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  const contractAddress = deployment.contractAddress;
  console.log("Contract:", contractAddress);
  
  const [signer1, signer2] = await hre.ethers.getSigners();
  console.log("Using signer:", signer1.address);
  
  try {
    const ContractFactory = await hre.ethers.getContractFactory("SocialPlatform");
    const contract = ContractFactory.attach(contractAddress);
    
    console.log("Registering user...");
    const tx = await contract.connect(signer1).registerUser("test", "hash", "bio");
    await tx.wait();
    console.log("SUCCESS: User registered!");
    
  } catch (error) {
    console.error("FAILED:", error.message);
  }
}

main().catch(console.error);
