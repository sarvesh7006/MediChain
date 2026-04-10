# MediChain - Blockchain Medical Records System

MediChain is a decentralized medical records management system built on blockchain technology, featuring emergency access via QR code and one-click insurance claims.

## Features

### 🔐 Core Features
- **Decentralized Medical Records** - Store medical record hashes on blockchain, actual data on IPFS
- **Role-Based Access Control** - Patients, Doctors, Hospitals, Insurance Providers, Emergency Responders
- **MetaMask Authentication** - Secure wallet-based login and identity management

### 🚀 Key USPs

#### 1. Emergency Access via QR Code
- Instant access to critical patient information even when unconscious
- Stores: Blood group, Allergies, Chronic conditions, Medications, Emergency contact
- Full audit trail of all emergency accesses
- QR code contains verifiable data hash for integrity

#### 2. One-Click Insurance Claims
- Submit claims using verified blockchain data
- Reduced paperwork through immutable medical records
- Fraud prevention through transparent claim history
- Automated claim status tracking

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `AccessControl.sol` | Role-based access control (Patient, Doctor, Hospital, Insurance, Emergency) |
| `MediChain.sol` | Main medical records management with IPFS integration |
| `EmergencyAccess.sol` | Emergency QR code access for critical patient info |
| `InsuranceClaims.sol` | One-click insurance claims processing |

## Setup & Installation

### Prerequisites
- Node.js (v16+)
- MetaMask browser extension
- Ganache (for local blockchain)
- IPFS node (for decentralized storage)

### Installation

```bash
# Install dependencies
npm install

# Start local blockchain (Ganache)
# Make sure Ganache is running on http://127.0.0.1:7545

# Compile contracts
npm run compile

# Deploy contracts
npm run deploy:ganache
```

## Usage

### 1. Register as a Patient
```javascript
// Connect MetaMask and call:
await mediChain.registerPatient();
```

### 2. Create Medical Records
```javascript
// Upload medical data to IPFS first, then:
await mediChain.createMedicalRecord(ipfsHash, "consultation", "General Checkup");
```

### 3. Set Emergency Info (for QR Code)
```javascript
await emergencyAccess.setEmergencyInfo(
  "A+",                    // Blood group
  "Penicillin, Peanuts",   // Allergies
  "Diabetes, Hypertension", // Chronic conditions
  "Metformin 500mg",       // Medications
  "+1-555-0123",           // Emergency contact
  "Type 2 Diabetes"        // Additional notes
);
```

### 4. Grant Access to Doctor
```javascript
await mediChain.grantRecordAccess(recordId, doctorAddress);
// Or grant batch access:
await mediChain.grantBatchAccess([1, 2, 3], doctorAddress);
```

### 5. Submit Insurance Claim
```javascript
await insuranceClaims.submitClaim(
  insuranceProviderAddress,
  claimAmount,
  "Surgery",
  "K80.20",  // ICD-10 code
  [1, 2, 3], // Related medical record IDs
  ipfsEvidenceHash
);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MediChain System                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/MetaMask)                                   │
│         ↓                                                    │
│  Web3.js / Ethers.js                                         │
│         ↓                                                    │
│  Smart Contracts (Ethereum/Ganache)                          │
│  ├── AccessControl                                           │
│  ├── MediChain                                               │
│  ├── EmergencyAccess                                         │
│  └── InsuranceClaims                                         │
│         ↓                                                    │
│  IPFS (Decentralized Storage)                                │
└─────────────────────────────────────────────────────────────┘
```

## Network Configuration

| Network | URL | Chain ID |
|---------|-----|----------|
| Local (Hardhat) | http://127.0.0.1:8545 | 31337 |
| Ganache | http://127.0.0.1:7545 | 1337 |

## Events

The contracts emit the following key events:

- `RecordCreated` - New medical record created
- `AccessGranted` - Doctor given access to records
- `EmergencyInfoCreated` - Emergency info set
- `EmergencyRecordAccessed` - Emergency info accessed
- `ClaimSubmitted` - Insurance claim submitted
- `ClaimStatusUpdated` - Claim status changed
- `ClaimPaid` - Claim payment processed

## Security Considerations

1. **Data Privacy** - Actual medical data stored on IPFS, only hashes on-chain
2. **Access Control** - Strict role-based permissions
3. **Audit Trail** - All accesses logged for transparency
4. **QR Code Verification** - Data hash verification prevents tampering

## License

MIT
