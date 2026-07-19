import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer account found. Check your .env file and PRIVATE_KEY.");
  }

  console.log("Deploying VenaLand Contracts with account:", deployer.address);
  
  // Use the TREASURY address from .env, or fallback to deployer if not set
  const treasuryAddress = process.env.TREASURY || deployer.address;
  console.log("Using Treasury Address for Royalties:", treasuryAddress);

  console.log("\n--- Deploying VenaLandChest ---");
  const ChestContract = await hre.ethers.getContractFactory("VenaLandChest");
  const chest = await ChestContract.deploy(deployer.address, treasuryAddress);
  await chest.waitForDeployment();
  const chestAddress = await chest.getAddress();
  console.log("VenaLandChest deployed to:", chestAddress);

  console.log("\n--- Deploying VenaLandBase ---");
  const BaseContract = await hre.ethers.getContractFactory("VenaLandBase");
  const base = await BaseContract.deploy(deployer.address, treasuryAddress);
  await base.waitForDeployment();
  const baseAddress = await base.getAddress();
  console.log("VenaLandBase deployed to:", baseAddress);

  console.log("\n=========================================");
  console.log("🎉 All VenaLand Contracts Deployed! 🎉");
  console.log("VenaLandChest Address:", chestAddress);
  console.log("VenaLandBase Address:", baseAddress);
  console.log("=========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
