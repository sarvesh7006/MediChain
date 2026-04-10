// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControl.sol";

/**
 * @title EmergencyAccess
 * @dev Contract for emergency access to critical patient information via QR code
 * Stores critical data on-chain for instant access even when patient is unconscious
 */
contract EmergencyAccess is AccessControl {
    // Critical emergency information structure
    struct EmergencyInfo {
        address patientAddress;
        string bloodGroup;          // e.g., "A+", "O-", "AB+"
        string allergies;           // Comma-separated list of allergies
        string chronicConditions;   // Comma-separated list of conditions
        string medications;         // Current medications
        string emergencyContact;    // Emergency contact phone number
        string additionalNotes;     // Any additional critical information
        uint256 timestamp;
        bool exists;
    }

    // Emergency access log for audit trail
    struct EmergencyAccessLog {
        address accessedBy;
        uint256 timestamp;
        string reason;
    }

    // QR Code data structure (compact version for QR encoding)
    struct QRCodeData {
        string bloodGroup;
        string allergies;
        string conditions;
        bytes32 dataHash;  // Hash for verification
    }

    // Storage
    mapping(address => EmergencyInfo) public emergencyInfo;
    mapping(address => mapping(address => bool)) public emergencyAccessList;  // Patient -> Authorized
    mapping(address => EmergencyAccessLog[]) public accessLogs;
    mapping(address => QRCodeData) public qrCodeData;

    // Events
    event EmergencyInfoCreated(address indexed patient, uint256 timestamp);
    event EmergencyInfoUpdated(address indexed patient, uint256 timestamp);
    event EmergencyAccessGranted(address indexed patient, address indexed authorized);
    event EmergencyAccessRevoked(address indexed patient, address indexed authorized);
    event EmergencyRecordAccessed(address indexed patient, address indexed accessedBy, uint256 timestamp);
    event QRCodeGenerated(address indexed patient, bytes32 indexed dataHash);

    // Modifiers
    modifier onlyPatientOrEmergency() {
        require(
            roles[msg.sender] == Roles.Patient ||
            roles[msg.sender] == Roles.Emergency ||
            roles[msg.sender] == Roles.Doctor,
            "EmergencyAccess: Unauthorized"
        );
        _;
    }

    modifier onlyPatient() {
        require(roles[msg.sender] == Roles.Patient, "EmergencyAccess: Only patients can set emergency info");
        _;
    }

    modifier emergencyInfoExists(address patient) {
        require(emergencyInfo[patient].exists, "EmergencyAccess: No emergency info found");
        _;
    }

    /**
     * @dev Create or update emergency information
     * @param bloodGroup Blood group (e.g., "A+", "O-", "AB+")
     * @param allergies Comma-separated list of allergies
     * @param chronicConditions Comma-separated list of chronic conditions
     * @param medications Current medications
     * @param emergencyContact Emergency contact phone number
     * @param additionalNotes Any additional critical information
     */
    function setEmergencyInfo(
        string calldata bloodGroup,
        string calldata allergies,
        string calldata chronicConditions,
        string calldata medications,
        string calldata emergencyContact,
        string calldata additionalNotes
    ) external onlyPatient {
        EmergencyInfo storage info = emergencyInfo[msg.sender];

        info.patientAddress = msg.sender;
        info.bloodGroup = bloodGroup;
        info.allergies = allergies;
        info.chronicConditions = chronicConditions;
        info.medications = medications;
        info.emergencyContact = emergencyContact;
        info.additionalNotes = additionalNotes;
        info.timestamp = block.timestamp;
        info.exists = true;

        // Generate QR code data
        _generateQRCode(msg.sender, bloodGroup, allergies, chronicConditions);

        if (info.timestamp == block.timestamp) {
            emit EmergencyInfoCreated(msg.sender, block.timestamp);
        } else {
            emit EmergencyInfoUpdated(msg.sender, block.timestamp);
        }
    }

    /**
     * @dev Generate QR code data for emergency access
     */
    function _generateQRCode(
        address patient,
        string memory bloodGroup,
        string memory allergies,
        string memory conditions
    ) internal {
        bytes32 dataHash = keccak256(abi.encodePacked(patient, bloodGroup, allergies, conditions, block.timestamp));

        qrCodeData[patient] = QRCodeData({
            bloodGroup: bloodGroup,
            allergies: allergies,
            conditions: conditions,
            dataHash: dataHash
        });

        emit QRCodeGenerated(patient, dataHash);
    }

    /**
     * @dev Get QR code data for a patient (used for generating QR code)
     * @param patient Patient address
     * @return bloodGroup Blood group
     * @return allergies Allergies
     * @return conditions Chronic conditions
     * @return dataHash Data hash for verification
     */
    function getQRCodeData(address patient)
        external
        view
        emergencyInfoExists(patient)
        returns (
            string memory bloodGroup,
            string memory allergies,
            string memory conditions,
            bytes32 dataHash
        )
    {
        QRCodeData memory qr = qrCodeData[patient];
        return (qr.bloodGroup, qr.allergies, qr.conditions, qr.dataHash);
    }

    /**
     * @dev Access emergency information (for emergency responders)
     * @param patient Patient address
     * @return EmergencyInfo struct with all emergency information
     */
    function accessEmergencyInfo(address patient)
        external
        onlyPatientOrEmergency
        emergencyInfoExists(patient)
        returns (EmergencyInfo memory)
    {
        // Log the access
        accessLogs[patient].push(EmergencyAccessLog({
            accessedBy: msg.sender,
            timestamp: block.timestamp,
            reason: "Emergency access"
        }));

        emit EmergencyRecordAccessed(patient, msg.sender, block.timestamp);

        return emergencyInfo[patient];
    }

    /**
     * @dev Get critical info only (blood group, allergies, conditions) - for QR scanning
     * @param patient Patient address
     * @return bloodGroup Blood group
     * @return allergies Allergies
     * @return conditions Chronic conditions
     */
    function getCriticalInfo(address patient)
        external
        view
        emergencyInfoExists(patient)
        returns (
            string memory bloodGroup,
            string memory allergies,
            string memory conditions
        )
    {
        EmergencyInfo memory info = emergencyInfo[patient];
        return (info.bloodGroup, info.allergies, info.chronicConditions);
    }

    /**
     * @dev Get full emergency info (for authorized users only)
     * @param patient Patient address
     * @return Full emergency information
     */
    function getFullEmergencyInfo(address patient)
        external
        view
        emergencyInfoExists(patient)
        returns (EmergencyInfo memory)
    {
        require(
            emergencyAccessList[patient][msg.sender] ||
            roles[msg.sender] == Roles.Emergency ||
            roles[msg.sender] == Roles.Doctor,
            "EmergencyAccess: Not authorized for full info"
        );

        return emergencyInfo[patient];
    }

    /**
     * @dev Grant emergency access to a trusted contact
     * @param trustedContact Address to grant access to
     */
    function grantEmergencyAccess(address trustedContact) external onlyPatient {
        emergencyAccessList[msg.sender][trustedContact] = true;
        emit EmergencyAccessGranted(msg.sender, trustedContact);
    }

    /**
     * @dev Revoke emergency access from a contact
     * @param trustedContact Address to revoke access from
     */
    function revokeEmergencyAccess(address trustedContact) external onlyPatient {
        emergencyAccessList[msg.sender][trustedContact] = false;
        emit EmergencyAccessRevoked(msg.sender, trustedContact);
    }

    /**
     * @dev Check if emergency info exists for a patient
     * @param patient Patient address
     * @return bool indicating existence
     */
    function hasEmergencyInfo(address patient) external view returns (bool) {
        return emergencyInfo[patient].exists;
    }

    /**
     * @dev Get access logs for a patient
     * @param patient Patient address
     * @return Array of access logs
     */
    function getAccessLogs(address patient) external view returns (EmergencyAccessLog[] memory) {
        return accessLogs[patient];
    }

    /**
     * @dev Get the count of access logs
     * @param patient Patient address
     * @return Number of access log entries
     */
    function getAccessLogCount(address patient) external view returns (uint256) {
        return accessLogs[patient].length;
    }

    /**
     * @dev Verify QR code data integrity
     * @param patient Patient address
     * @param expectedHash Expected data hash
     * @return bool indicating if data is valid
     */
    function verifyQRCodeData(address patient, bytes32 expectedHash) external view returns (bool) {
        return qrCodeData[patient].dataHash == expectedHash;
    }
}
