const { ethers } = require('ethers');
const crypto = require('crypto');

const contractABI = [
  "event AccessGranted(address indexed patient, address indexed doctor, uint256 indexed recordId)",
  "event AccessRevoked(address indexed patient, address indexed doctor)",
  "event BatchAccessGranted(address indexed patient, address indexed doctor, uint256[] recordIds)",
  "event RecordAccessed(uint256 indexed recordId, address indexed accessedBy, uint256 timestamp)",
  "event RecordCreated(uint256 indexed recordId, address indexed patient, string recordType)",
  "event RoleGranted(address indexed user, uint8 role, address indexed grantedBy)",
  "event RoleRevoked(address indexed user, uint8 role, address indexed revokedBy)",
  "event UserRegistered(address indexed user, uint8 role)",
  "function ACCESS_DURATION() view returns (uint256)",
  "function accessGrants(address, address) view returns (address grantedTo, address grantedBy, uint256 timestamp, bool isActive)",
  "function accessRecord(uint256 recordId) returns (string ipfsHash, string recordType, string title, uint256 timestamp)",
  "function admin() view returns (address)",
  "function checkAccess(uint256 recordId, address user) view returns (bool)",
  "function checkRegistration(address user) view returns (bool)",
  "function createMedicalRecord(string ipfsHash, string recordType, string title) returns (uint256)",
  "function getAccessGrant(address patient, address doctor) view returns (tuple(address grantedTo, address grantedBy, uint256 timestamp, bool isActive))",
  "function getMedicalRecord(uint256 recordId) view returns (tuple(uint256 recordId, address patientAddress, string ipfsHash, string recordType, string title, uint256 timestamp, bool exists))",
  "function getPatientRecords(address patient) view returns (uint256[])",
  "function getRecordCount(address patient) view returns (uint256)",
  "function getRole(address user) view returns (uint8)",
  "function grantBatchAccess(uint256[] recordIds, address doctor)",
  "function grantRecordAccess(uint256 recordId, address doctor)",
  "function grantRole(address user, uint8 role)",
  "function hasRole(address user, uint8 role) view returns (bool)",
  "function isRegistered(address) view returns (bool)",
  "function medicalRecords(uint256) view returns (uint256 recordId, address patientAddress, string ipfsHash, string recordType, string title, uint256 timestamp, bool exists)",
  "function patientRecords(address, uint256) view returns (uint256)",
  "function recordAccess(uint256, address) view returns (bool)",
  "function recordCount() view returns (uint256)",
  "function registerDoctor(address doctor)",
  "function registerEmergency(address emergency)",
  "function registerHospital(address hospital)",
  "function registerInsurance(address insurance)",
  "function registerPatient()",
  "function revokeAccess(address doctor)",
  "function revokeRole(address user, uint8 role)",
  "function roles(address) view returns (uint8)"
];

// ---------------------------------------------------------------------------
// In-memory store — used in mock mode (no Ganache / contract needed)
// ---------------------------------------------------------------------------
const mockStore = {
  records: {},       // recordId -> { ipfsHash, recordType, title, timestamp, patientAddress }
  profiles: {},      // address  -> { profileCid, exists }
  claims: {},        // claimId  -> { recordId, amount, approved, txHash }
  emergencyLogs: [], // [{ patientAddress, auditId, timestamp }]
  access: {},        // patient->doctor -> { grantedTo, grantedBy, timestamp, isActive }
  patientRecords: {},// patient -> [recordIds]
  recordCount: 0
};

function mockTxReceipt(label) {
  const hash  = '0x' + crypto.randomBytes(32).toString('hex');
  const block = Math.floor(1_200_000 + Math.random() * 100_000);
  console.log(`[MOCK TX] ${label} -> hash: ${hash.slice(0, 18)}... block: ${block}`);
  return { hash, blockNumber: block };
}

// ---------------------------------------------------------------------------
class BlockchainService {
  constructor() {
    this.provider      = null;
    this.wallet        = null;
    this.contract      = null;
    this.isMockMode    = false;
    this.isInitialized = false;
  }

  initialize() {
    const ganacheUrl      = process.env.GANACHE_URL || 'http://127.0.0.1:7545';
    const privateKey      = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!privateKey || !contractAddress) {
      this.isMockMode    = true;
      this.isInitialized = true;
      console.log('');
      console.log('=======================================================');
      console.log('  BlockchainService  --  MOCK MODE (no contract set)  ');
      console.log('  All blockchain calls use in-memory simulation.       ');
      console.log('  Set CONTRACT_ADDRESS in .env to use Ganache.         ');
      console.log('=======================================================');
      console.log('');
      return;
    }

    try {
      this.provider  = new ethers.JsonRpcProvider(ganacheUrl);
      this.wallet    = new ethers.Wallet(privateKey, this.provider);
      this.contract  = new ethers.Contract(contractAddress, contractABI, this.wallet);
      this.isInitialized = true;
      console.log('BlockchainService -- connected to Ganache at', ganacheUrl);
      this.listenForEvents();
    } catch (error) {
      console.error('Failed to initialize BlockchainService:', error.message);
    }
  }

  listenForEvents() {
    if (!this.contract) return;
    this.contract.on('RecordCreated',   (id) => console.log(`[Event] RecordCreated: ${id}`));
    this.contract.on('AccessGranted',   (p, d, r) => console.log(`[Event] AccessGranted: ${r}`));
    this.contract.on('AccessRevoked',   (p, d) => console.log(`[Event] AccessRevoked: ${d}`));
  }

  // createMedicalRecord
  async createMedicalRecord(ipfsHash, recordType, title) {
    if (this.isMockMode) {
      const recordId = ++mockStore.recordCount;
      const patientAddress = this.wallet ? this.wallet.address : '0xMOCK_OWNER';
      mockStore.records[recordId] = {
        recordId,
        patientAddress,
        ipfsHash,
        recordType,
        title,
        timestamp: Math.floor(Date.now() / 1000),
        exists: true,
      };
      if (!mockStore.patientRecords[patientAddress]) mockStore.patientRecords[patientAddress] = [];
      mockStore.patientRecords[patientAddress].push(recordId);
      const receipt = mockTxReceipt('createMedicalRecord(' + recordId + ')');
      return { receipt, recordId };
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        try {
          const isRegistered = await this.checkRegistration(this.wallet.address);
          if (!isRegistered) {
            await this.registerPatient();
          }
        } catch (err) {
          // If checkRegistration is missing on contract, continue without gating
          console.warn('checkRegistration failed, continuing without registration gate:', err.message);
        }
        const gas = await this.contract.createMedicalRecord.estimateGas(ipfsHash, recordType, title);
        const tx  = await this.contract.createMedicalRecord(ipfsHash, recordType, title, { gasLimit: gas + 50000n });
        const receipt = await tx.wait();
        let recordId = null;
        for (const log of receipt.logs) {
          try {
            const parsed = this.contract.interface.parseLog(log);
            if (parsed && parsed.name === 'RecordCreated') {
              recordId = Number(parsed.args[0]);
              break;
            }
          } catch (_) {
            // ignore non-matching logs
          }
        }
        console.log('TX confirmed in block', receipt.blockNumber, 'recordId', recordId);
        return { receipt, recordId };
      } catch (err) {
        console.error('createMedicalRecord attempt ' + attempt + '/3:', err.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
        else throw err;
      }
    }
  }

  async getRecordCount() {
    if (this.isMockMode) return mockStore.recordCount;
    const count = await this.contract.recordCount();
    return Number(count);
  }

  async checkRegistration(address) {
    if (this.isMockMode) return true;
    return await this.contract.checkRegistration(address);
  }

  async registerPatient() {
    if (this.isMockMode) return mockTxReceipt('registerPatient()');
    const tx = await this.contract.registerPatient();
    return await tx.wait();
  }

  async getMedicalRecord(recordId) {
    if (this.isMockMode) return mockStore.records[recordId] || null;
    try {
      const rec = await this.contract.getMedicalRecord(recordId);
      return {
        recordId: Number(rec[0]),
        patientAddress: rec[1],
        ipfsHash: rec[2],
        recordType: rec[3],
        title: rec[4],
        timestamp: Number(rec[5]),
        exists: rec[6]
      };
    } catch (error) {
      if (error.reason && error.reason.includes('Record does not exist')) return null;
      throw error;
    }
  }

  async getPatientRecords(patientAddress) {
    if (this.isMockMode) return mockStore.patientRecords[patientAddress] || [];
    const ids = await this.contract.getPatientRecords(patientAddress);
    return ids.map(id => Number(id));
  }

  async checkAccess(recordId, user) {
    if (this.isMockMode) {
      const key = (mockStore.records[recordId]?.patientAddress || '0x') + ':' + user;
      return !!mockStore.access[key]?.isActive;
    }
    return await this.contract.checkAccess(recordId, user);
  }

  async grantRecordAccess(recordId, doctor) {
    if (this.isMockMode) {
      const patient = this.wallet ? this.wallet.address : '0xMOCK_OWNER';
      const key = patient + ':' + doctor;
      mockStore.access[key] = { grantedTo: doctor, grantedBy: patient, timestamp: Date.now(), isActive: true };
      return mockTxReceipt('grantRecordAccess(' + recordId + ')');
    }
    const tx = await this.contract.grantRecordAccess(recordId, doctor);
    return await tx.wait();
  }

  async grantBatchAccess(recordIds, doctor) {
    if (this.isMockMode) {
      const patient = this.wallet ? this.wallet.address : '0xMOCK_OWNER';
      const key = patient + ':' + doctor;
      mockStore.access[key] = { grantedTo: doctor, grantedBy: patient, timestamp: Date.now(), isActive: true };
      return mockTxReceipt('grantBatchAccess(' + recordIds.length + ')');
    }
    const tx = await this.contract.grantBatchAccess(recordIds, doctor);
    return await tx.wait();
  }

  async revokeAccess(doctor) {
    if (this.isMockMode) {
      const patient = this.wallet ? this.wallet.address : '0xMOCK_OWNER';
      const key = patient + ':' + doctor;
      if (mockStore.access[key]) mockStore.access[key].isActive = false;
      return mockTxReceipt('revokeAccess(' + doctor + ')');
    }
    const tx = await this.contract.revokeAccess(doctor);
    return await tx.wait();
  }

  async accessRecord(recordId) {
    if (this.isMockMode) {
      const rec = mockStore.records[recordId];
      return rec ? { ipfsHash: rec.ipfsHash, recordType: rec.recordType, title: rec.title, timestamp: rec.timestamp } : null;
    }
    const rec = await this.contract.accessRecord(recordId);
    return { ipfsHash: rec[0], recordType: rec[1], title: rec[2], timestamp: Number(rec[3]) };
  }

  // updateProfile
  async updateProfile(profileCid, address) {
    if (this.isMockMode) {
      const addr = address || '0xMOCK_PATIENT_' + Date.now();
      mockStore.profiles[addr] = { profileCid, exists: true };
      return mockTxReceipt('updateProfile(' + addr + ')');
    }
    const tx = await this.contract.updateProfile(profileCid);
    return await tx.wait();
  }

  // getMockProfile -- helper used by userController in mock mode
  getMockProfile(address) {
    return mockStore.profiles[address] || null;
  }

  // grantEmergencyAccess
  async grantEmergencyAccess(patientAddress, auditId) {
    if (this.isMockMode) {
      mockStore.emergencyLogs.push({ patientAddress, auditId, timestamp: Date.now() });
      console.log('[MOCK EMERGENCY] Access logged:', auditId, 'for', patientAddress);
      return mockTxReceipt('grantEmergencyAccess(' + auditId + ')');
    }
    const tx = await this.contract.grantEmergencyAccess(patientAddress, auditId);
    return await tx.wait();
  }

  // submitClaim
  async submitClaim(claimId, recordId, amount) {
    if (this.isMockMode) {
      if (mockStore.claims[claimId]) throw new Error('Claim already exists');
      const receipt = mockTxReceipt('submitClaim(' + claimId + ')');
      mockStore.claims[claimId] = { recordId, amount, approved: false, txHash: receipt.hash };
      return receipt;
    }
    const tx = await this.contract.submitClaim(claimId, recordId, amount);
    return await tx.wait();
  }

  // approveClaim
  async approveClaim(claimId) {
    if (this.isMockMode) {
      if (!mockStore.claims[claimId]) throw new Error('Claim does not exist');
      const receipt = mockTxReceipt('approveClaim(' + claimId + ')');
      mockStore.claims[claimId].approved = true;
      return receipt;
    }
    const tx = await this.contract.approveClaim(claimId);
    return await tx.wait();
  }
}

const blockchainService = new BlockchainService();
module.exports = blockchainService;
