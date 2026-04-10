const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying MediChain contracts...");

  // Deploy MediToken (ERC-20)
  const MediToken = await hre.ethers.getContractFactory("MediToken");
  const mediToken = await MediToken.deploy();
  await mediToken.waitForDeployment();
  console.log(`✅ MediToken deployed to: ${await mediToken.getAddress()}`);

  // Deploy AccessControl (base contract)
  const AccessControl = await hre.ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy();
  await accessControl.waitForDeployment();
  console.log(`✅ AccessControl deployed to: ${await accessControl.getAddress()}`);

  // Deploy MediChain
  const MediChain = await hre.ethers.getContractFactory("MediChain");
  const mediChain = await MediChain.deploy();
  await mediChain.waitForDeployment();
  console.log(`✅ MediChain deployed to: ${await mediChain.getAddress()}`);

  // Deploy EmergencyAccess
  const EmergencyAccess = await hre.ethers.getContractFactory("EmergencyAccess");
  const emergencyAccess = await EmergencyAccess.deploy();
  await emergencyAccess.waitForDeployment();
  console.log(`✅ EmergencyAccess deployed to: ${await emergencyAccess.getAddress()}`);

  // Deploy InsuranceClaims
  const InsuranceClaims = await hre.ethers.getContractFactory("InsuranceClaims");
  const insuranceClaims = await InsuranceClaims.deploy();
  await insuranceClaims.waitForDeployment();
  console.log(`✅ InsuranceClaims deployed to: ${await insuranceClaims.getAddress()}`);

  // Get the deployer address (will be the admin)
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n📋 Deployer/Admin address: ${deployer.address}`);

  console.log("\n📝 Contract Addresses:");
  console.log("======================");
  console.log(`MediToken:        ${await mediToken.getAddress()}`);
  console.log(`AccessControl:    ${await accessControl.getAddress()}`);
  console.log(`MediChain:        ${await mediChain.getAddress()}`);
  console.log(`EmergencyAccess:  ${await emergencyAccess.getAddress()}`);
  console.log(`InsuranceClaims:  ${await insuranceClaims.getAddress()}`);

  console.log("\n🎯 Next Steps:");
  console.log("1. Register doctors, hospitals, and insurance providers using the admin address");
  console.log("2. Patients can register themselves and create medical records");
  console.log("3. Set up emergency info for QR code generation");
  console.log("4. Register insurance policies for one-click claims");
  console.log("5. Transfer MEDI tokens to patients for rewards ecosystem");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
