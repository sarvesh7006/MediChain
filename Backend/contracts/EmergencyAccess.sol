// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControl.sol";

contract EmergencyAccess is AccessControl {

    // ================= STRUCTS =================

    struct EmergencyInfo {
        address patientAddress;
        string bloodGroup;
        string allergies;
        string chronicConditions;
        string medications;
        string emergencyContact;
        string additionalNotes;
        uint256 timestamp;
        bool exists;
    }

    // ✅ Input struct (NEW)
    struct EmergencyInfoInput {
        string bloodGroup;
        string allergies;
        string chronicConditions;
        string medications;
        string emergencyContact;
        string additionalNotes;
    }

    struct EmergencyAccessLog {
        address accessedBy;
        uint256 timestamp;
        string reason;
    }

    struct QRCodeData {
        string bloodGroup;
        string allergies;
        string conditions;
        bytes32 dataHash;
    }

    // ================= STORAGE =================

    mapping(address => EmergencyInfo) public emergencyInfo;
    mapping(address => mapping(address => bool)) public emergencyAccessList;
    mapping(address => EmergencyAccessLog[]) public accessLogs;
    mapping(address => QRCodeData) public qrCodeData;

    // ================= EVENTS =================

    event EmergencyInfoCreated(address indexed patient, uint256 timestamp);
    event EmergencyInfoUpdated(address indexed patient, uint256 timestamp);
    event EmergencyAccessGranted(address indexed patient, address indexed authorized);
    event EmergencyAccessRevoked(address indexed patient, address indexed authorized);
    event EmergencyRecordAccessed(address indexed patient, address indexed accessedBy, uint256 timestamp);
    event QRCodeGenerated(address indexed patient, bytes32 indexed dataHash);

    // ================= MODIFIERS =================

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
        require(
            roles[msg.sender] == Roles.Patient,
            "EmergencyAccess: Only patients allowed"
        );
        _;
    }

    modifier emergencyInfoExists(address patient) {
        require(
            emergencyInfo[patient].exists,
            "EmergencyAccess: No emergency info found"
        );
        _;
    }

    // ================= CORE FUNCTION =================

    /**
     * @dev Create or update emergency info using struct
     */
    function setEmergencyInfo(EmergencyInfoInput calldata input)
        external
        onlyPatient
    {
        emergencyInfo[msg.sender] = EmergencyInfo({
            patientAddress: msg.sender,
            bloodGroup: input.bloodGroup,
            allergies: input.allergies,
            chronicConditions: input.chronicConditions,
            medications: input.medications,
            emergencyContact: input.emergencyContact,
            additionalNotes: input.additionalNotes,
            timestamp: block.timestamp,
            exists: true
        });

        _generateQRCode(
            msg.sender,
            input.bloodGroup,
            input.allergies,
            input.chronicConditions
        );

        emit EmergencyInfoCreated(msg.sender, block.timestamp);
    }

    // ================= INTERNAL =================

    function _generateQRCode(
        address patient,
        string memory bloodGroup,
        string memory allergies,
        string memory conditions
    ) internal {
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                patient,
                bloodGroup,
                allergies,
                conditions,
                block.timestamp
            )
        );

        qrCodeData[patient] = QRCodeData({
            bloodGroup: bloodGroup,
            allergies: allergies,
            conditions: conditions,
            dataHash: dataHash
        });

        emit QRCodeGenerated(patient, dataHash);
    }

    // ================= READ FUNCTIONS =================

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
     * ❗ FIXED: Removed `view` because it modifies state (logs + emit)
     */
    function accessEmergencyInfo(address patient)
        external
        onlyPatientOrEmergency
        emergencyInfoExists(patient)
        returns (EmergencyInfo memory)
    {
        accessLogs[patient].push(EmergencyAccessLog({
            accessedBy: msg.sender,
            timestamp: block.timestamp,
            reason: "Emergency access"
        }));

        emit EmergencyRecordAccessed(patient, msg.sender, block.timestamp);

        return emergencyInfo[patient];
    }

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
        return (
            info.bloodGroup,
            info.allergies,
            info.chronicConditions
        );
    }

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
            "EmergencyAccess: Not authorized"
        );

        return emergencyInfo[patient];
    }

    // ================= ACCESS CONTROL =================

    function grantEmergencyAccess(address trustedContact)
        external
        onlyPatient
    {
        emergencyAccessList[msg.sender][trustedContact] = true;
        emit EmergencyAccessGranted(msg.sender, trustedContact);
    }

    function revokeEmergencyAccess(address trustedContact)
        external
        onlyPatient
    {
        emergencyAccessList[msg.sender][trustedContact] = false;
        emit EmergencyAccessRevoked(msg.sender, trustedContact);
    }

    // ================= UTILITY =================

    function hasEmergencyInfo(address patient)
        external
        view
        returns (bool)
    {
        return emergencyInfo[patient].exists;
    }

    function getAccessLogs(address patient)
        external
        view
        returns (EmergencyAccessLog[] memory)
    {
        return accessLogs[patient];
    }

    function getAccessLogCount(address patient)
        external
        view
        returns (uint256)
    {
        return accessLogs[patient].length;
    }

    function verifyQRCodeData(address patient, bytes32 expectedHash)
        external
        view
        returns (bool)
    {
        return qrCodeData[patient].dataHash == expectedHash;
    }
}