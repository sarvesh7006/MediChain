// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract StorageProof {
    struct Record {
        string cid;
        string dataHash;
        uint256 timestamp;
        address owner;
    }

    struct PatientProfile {
        string profileCid;
        bool exists;
    }

    struct Claim {
        string recordId;
        uint256 amount;
        bool isApproved;
        address insurer;
        bool exists;
    }

    mapping(string => Record) private records;
    mapping(address => PatientProfile) public patientProfiles;
    mapping(string => Claim) public claims;

    string[] private recordIds;

    // Core Architecture Events
    event RecordStored(string indexed recordId, string cid, address indexed owner, uint256 timestamp);
    
    // UI Audit Logs
    event ProfileUpdated(address indexed patient, string profileCid);
    event EmergencyAccessGranted(address indexed patient, address indexed responder, string auditId, uint256 timestamp);
    event ClaimSubmitted(string indexed claimId, string recordId, uint256 amount, address indexed provider);
    event ClaimApproved(string indexed claimId, address indexed insurer);
    event LabReportSigned(string indexed recordId, address indexed provider, uint256 timestamp);
    event EncryptionKeysRotated(address indexed user, uint256 timestamp);

    function storeRecord(string memory _recordId, string memory _cid, string memory _dataHash) public {
        require(bytes(_recordId).length > 0, "Record ID cannot be empty");
        require(bytes(_cid).length > 0, "CID cannot be empty");
        require(bytes(_dataHash).length > 0, "Data hash cannot be empty");
        require(records[_recordId].timestamp == 0, "Record ID already exists");

        records[_recordId] = Record({
            cid: _cid,
            dataHash: _dataHash,
            timestamp: block.timestamp,
            owner: msg.sender
        });

        recordIds.push(_recordId);

        emit RecordStored(_recordId, _cid, msg.sender, block.timestamp);
    }

    function getRecord(string memory _recordId) public view returns (string memory cid, string memory dataHash, uint256 timestamp, address owner) {
        require(records[_recordId].timestamp != 0, "Record does not exist");
        Record memory rec = records[_recordId];
        return (rec.cid, rec.dataHash, rec.timestamp, rec.owner);
    }

    function getAllRecordIds() public view returns (string[] memory) {
        return recordIds;
    }

    // ============================================
    // NEW UI FEATURE FUNCTIONS
    // ============================================

    // 1. Patient Profile
    function updateProfile(string memory _profileCid) public {
        require(bytes(_profileCid).length > 0, "Profile CID cannot be empty");
        patientProfiles[msg.sender] = PatientProfile({ profileCid: _profileCid, exists: true });
        emit ProfileUpdated(msg.sender, _profileCid);
    }

    // 2. Emergency Access QR Flow
    function grantEmergencyAccess(address patient, string memory auditId) public {
        require(patientProfiles[patient].exists, "Patient profile does not exist");
        emit EmergencyAccessGranted(patient, msg.sender, auditId, block.timestamp);
    }

    // 3. Insurance Flow
    function submitClaim(string memory claimId, string memory recordId, uint256 amount) public {
        require(!claims[claimId].exists, "Claim ID already exists");
        claims[claimId] = Claim({ recordId: recordId, amount: amount, isApproved: false, insurer: address(0), exists: true });
        emit ClaimSubmitted(claimId, recordId, amount, msg.sender);
    }

    function approveClaim(string memory claimId) public {
        require(claims[claimId].exists, "Claim does not exist");
        require(!claims[claimId].isApproved, "Claim is already approved");
        claims[claimId].isApproved = true;
        claims[claimId].insurer = msg.sender;
        emit ClaimApproved(claimId, msg.sender);
    }

    // 4. Audit Mocks
    function logLabReport(string memory recordId) public {
        emit LabReportSigned(recordId, msg.sender, block.timestamp);
    }

    function rotateKeys() public {
        emit EncryptionKeysRotated(msg.sender, block.timestamp);
    }
}
