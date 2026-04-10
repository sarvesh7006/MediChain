// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControl.sol";

/**
 * @title MediChain
 * @dev Main contract for medical records management
 * Stores IPFS hashes on-chain, actual data stored on IPFS
 */
contract MediChain is AccessControl {
    // Medical record structure
    struct MedicalRecord {
        uint256 recordId;
        address patientAddress;
        string ipfsHash;        // IPFS hash of the medical record data
        string recordType;      // Type: consultation, prescription, lab report, etc.
        string title;
        uint256 timestamp;
        bool exists;
    }

    // Access grant structure
    struct AccessGrant {
        address grantedTo;      // Doctor/Hospital address
        address grantedBy;      // Patient address
        uint256 timestamp;
        bool isActive;
    }

    // Storage
    mapping(uint256 => MedicalRecord) public medicalRecords;
    mapping(address => uint256[]) public patientRecords;  // Patient address -> Record IDs
    mapping(uint256 => mapping(address => bool)) public recordAccess;  // Record ID -> Authorized addresses
    mapping(address => mapping(address => AccessGrant)) public accessGrants;  // Patient -> Doctor -> Grant

    uint256 public recordCount;
    uint256 public constant ACCESS_DURATION = 30 days;  // Default access duration

    // Events
    event RecordCreated(uint256 indexed recordId, address indexed patient, string recordType);
    event AccessGranted(address indexed patient, address indexed doctor, uint256 indexed recordId);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event RecordAccessed(uint256 indexed recordId, address indexed accessedBy, uint256 timestamp);
    event BatchAccessGranted(address indexed patient, address indexed doctor, uint256[] recordIds);

    // Modifiers
    modifier onlyAuthorized(uint256 recordId) {
        require(
            recordAccess[recordId][msg.sender] ||
            roles[msg.sender] == Roles.Patient ||
            roles[msg.sender] == Roles.Emergency,
            "MediChain: Not authorized to access this record"
        );
        _;
    }

    modifier onlyRecordOwner(uint256 recordId) {
        require(
            medicalRecords[recordId].patientAddress == msg.sender,
            "MediChain: Not the record owner"
        );
        _;
    }

    /**
     * @dev Create a new medical record
     * @param ipfsHash IPFS hash of the medical record data
     * @param recordType Type of record (consultation, prescription, lab report, etc.)
     * @param title Human-readable title for the record
     */
    function createMedicalRecord(
        string calldata ipfsHash,
        string calldata recordType,
        string calldata title
    ) external onlyPatients returns (uint256) {
        recordCount++;

        MedicalRecord storage newRecord = medicalRecords[recordCount];
        newRecord.recordId = recordCount;
        newRecord.patientAddress = msg.sender;
        newRecord.ipfsHash = ipfsHash;
        newRecord.recordType = recordType;
        newRecord.title = title;
        newRecord.timestamp = block.timestamp;
        newRecord.exists = true;

        patientRecords[msg.sender].push(recordCount);

        // Patient automatically has access to their own record
        recordAccess[recordCount][msg.sender] = true;

        emit RecordCreated(recordCount, msg.sender, recordType);
        return recordCount;
    }

    /**
     * @dev Grant access to a specific record
     * @param recordId ID of the record to grant access to
     * @param doctor Address of the doctor to grant access to
     */
    function grantRecordAccess(uint256 recordId, address doctor) external onlyRecordOwner(recordId) {
        require(medicalRecords[recordId].exists, "MediChain: Record does not exist");
        require(roles[doctor] == Roles.Doctor || roles[doctor] == Roles.Hospital, "MediChain: Invalid recipient");

        recordAccess[recordId][doctor] = true;

        accessGrants[msg.sender][doctor] = AccessGrant({
            grantedTo: doctor,
            grantedBy: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        emit AccessGranted(msg.sender, doctor, recordId);
    }

    /**
     * @dev Grant access to multiple records at once
     * @param recordIds Array of record IDs
     * @param doctor Address of the doctor to grant access to
     */
    function grantBatchAccess(uint256[] calldata recordIds, address doctor) external onlyPatients {
        require(roles[doctor] == Roles.Doctor || roles[doctor] == Roles.Hospital, "MediChain: Invalid recipient");

        for (uint256 i = 0; i < recordIds.length; i++) {
            uint256 recordId = recordIds[i];
            require(medicalRecords[recordId].patientAddress == msg.sender, "MediChain: Not record owner");
            require(medicalRecords[recordId].exists, "MediChain: Record does not exist");

            recordAccess[recordId][doctor] = true;
        }

        accessGrants[msg.sender][doctor] = AccessGrant({
            grantedTo: doctor,
            grantedBy: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        emit BatchAccessGranted(msg.sender, doctor, recordIds);
    }

    /**
     * @dev Revoke access from a doctor
     * @param doctor Address of the doctor to revoke access from
     */
    function revokeAccess(address doctor) external onlyPatients {
        accessGrants[msg.sender][doctor].isActive = false;

        // Revoke access to all records for this doctor
        uint256[] memory records = patientRecords[msg.sender];
        for (uint256 i = 0; i < records.length; i++) {
            recordAccess[records[i]][doctor] = false;
        }

        emit AccessRevoked(msg.sender, doctor);
    }

    /**
     * @dev Access a medical record (view IPFS hash)
     * @param recordId ID of the record to access
     * @return ipfsHash IPFS hash of the record
     * @return recordType Type of record
     * @return title Title of the record
     * @return timestamp Timestamp when record was created
     */
    function accessRecord(uint256 recordId)
        external
        onlyAuthorized(recordId)
        view
        returns (
            string memory ipfsHash,
            string memory recordType,
            string memory title,
            uint256 timestamp
        )
    {
        MedicalRecord storage record = medicalRecords[recordId];
        require(record.exists, "MediChain: Record does not exist");

        emit RecordAccessed(recordId, msg.sender, block.timestamp);

        return (record.ipfsHash, record.recordType, record.title, record.timestamp);
    }

    /**
     * @dev Get all record IDs for a patient
     * @param patient Address of the patient
     * @return Array of record IDs
     */
    function getPatientRecords(address patient) external view returns (uint256[] memory) {
        return patientRecords[patient];
    }

    /**
     * @dev Get medical record details
     * @param recordId ID of the record
     * @return MedicalRecord struct
     */
    function getMedicalRecord(uint256 recordId) external view returns (MedicalRecord memory) {
        require(medicalRecords[recordId].exists, "MediChain: Record does not exist");
        return medicalRecords[recordId];
    }

    /**
     * @dev Check if an address has access to a record
     * @param recordId ID of the record
     * @param user Address to check
     * @return bool indicating access status
     */
    function checkAccess(uint256 recordId, address user) external view returns (bool) {
        return recordAccess[recordId][user];
    }

    /**
     * @dev Get access grant details
     * @param patient Patient address
     * @param doctor Doctor address
     * @return AccessGrant struct
     */
    function getAccessGrant(address patient, address doctor) external view returns (AccessGrant memory) {
        return accessGrants[patient][doctor];
    }

    /**
     * @dev Get record count for a patient
     * @param patient Address of the patient
     * @return Number of records
     */
    function getRecordCount(address patient) external view returns (uint256) {
        return patientRecords[patient].length;
    }
}
