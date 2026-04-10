const { ethers } = require('ethers');

// In a real environment, you'd load the ABI dynamically or build it correctly
// We'll use the ABI matching our 'StorageProof' contract
const contractABI = [
  "function storeRecord(string _recordId, string _cid, string _dataHash) public",
  "function getRecord(string _recordId) public view returns (string cid, string dataHash, uint256 timestamp, address owner)",
  "function getAllRecordIds() public view returns (string[] memory)",
  "function updateProfile(string _profileCid) public",
  "function grantEmergencyAccess(address patient, string auditId) public",
  "function submitClaim(string claimId, string recordId, uint256 amount) public",
  "function approveClaim(string claimId) public",
  "event RecordStored(string indexed recordId, string cid, address indexed owner, uint256 timestamp)",
  "event ProfileUpdated(address indexed patient, string profileCid)",
  "event EmergencyAccessGranted(address indexed patient, address indexed responder, string auditId, uint256 timestamp)",
  "event ClaimSubmitted(string indexed claimId, string recordId, uint256 amount, address indexed provider)",
  "event ClaimApproved(string indexed claimId, address indexed insurer)",
  "event LabReportSigned(string indexed recordId, address indexed provider, uint256 timestamp)",
  "event EncryptionKeysRotated(address indexed user, uint256 timestamp)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.isInitialized = false;
  }

  initialize() {
    try {
      const ganacheUrl = process.env.GANACHE_URL || 'http://127.0.0.1:8545';
      this.provider = new ethers.JsonRpcProvider(ganacheUrl);
      
      const privateKey = process.env.PRIVATE_KEY;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (!privateKey || !contractAddress) {
        console.warn('BlockchainService warning: PRIVATE_KEY or CONTRACT_ADDRESS not set in .env');
        return;
      }

      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
      this.isInitialized = true;
      console.log('Blockchain Service Initialized and connected to Ganache.');
      this.listenForEvents();
    } catch (error) {
      console.error('Failed to initialize BlockchainService:', error);
    }
  }

  listenForEvents() {
    if (!this.isInitialized || !this.contract) return;
    
    this.contract.on("RecordStored", (recordId, cid, owner, timestamp, event) => {
      console.log(`[Blockchain Event] New Record Stored: ID: ${recordId} (Owner: ${owner})`);
    });

    this.contract.on("EmergencyAccessGranted", (patient, responder, auditId, timestamp, event) => {
      console.log(`[EMERGENCY AUDIT SCAN] ${auditId} | Patient: ${patient} | Responder: ${responder}`);
    });

    this.contract.on("EncryptionKeysRotated", (user, timestamp, event) => {
      console.log(`[SECURITY PROTOCOL] User Keys Rotated for ${user}`);
    });

    this.contract.on("ClaimSubmitted", (claimId, recordId, amount, provider, event) => {
      console.log(`[INSURANCE NOTIFICATION] Claim ${claimId} submitted for amount ${amount}`);
    });
  }

  async storeRecord(recordId, cid, hash) {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");

    let lastError;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Estimate gas and add a buffer
        const gasEstimate = await this.contract.storeRecord.estimateGas(recordId, cid, hash);
        const tx = await this.contract.storeRecord(recordId, cid, hash, {
          gasLimit: gasEstimate + 50000n // Add safety margin
        });

        console.log(`Transaction sent (Attempt ${attempt}): ${tx.hash}`);
        const receipt = await tx.wait(); // Wait for confirmation
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        return receipt;
      } catch (error) {
        console.error(`Error storing record to blockchain (Attempt ${attempt}/${MAX_RETRIES}):`, error.message);
        lastError = error;
        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    throw new Error(`Failed to store record after ${MAX_RETRIES} attempts. Last error: ` + lastError.message);
  }

  // ===================================
  // NEW ARCHITECTURE FUNCTIONS
  // ===================================

  async updateProfile(profileCid) {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");
    const tx = await this.contract.updateProfile(profileCid);
    return await tx.wait();
  }

  async grantEmergencyAccess(patientAddress, auditId) {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");
    const tx = await this.contract.grantEmergencyAccess(patientAddress, auditId);
    return await tx.wait();
  }

  async submitClaim(claimId, recordId, amount) {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");
    const tx = await this.contract.submitClaim(claimId, recordId, amount);
    return await tx.wait();
  }

  async approveClaim(claimId) {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");
    const tx = await this.contract.approveClaim(claimId);
    return await tx.wait();
  }

  // ===================================
  // ORIGINAL FUNCTIONS
  // ===================================

  async getRecord(recordId) {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");

    try {
      const rec = await this.contract.getRecord(recordId);
      return {
        cid: rec[0],
        dataHash: rec[1],
        timestamp: Number(rec[2]),
        owner: rec[3]
      };
    } catch (error) {
      if (error.reason && error.reason.includes("Record does not exist")) {
        return null; // Return null if not found
      }
      throw error;
    }
  }

  async getAllRecordIds() {
    if (!this.isInitialized) throw new Error("Blockchain service not initialized");
    return await this.contract.getAllRecordIds();
  }
}

// Export as a singleton
const blockchainService = new BlockchainService();
module.exports = blockchainService;
