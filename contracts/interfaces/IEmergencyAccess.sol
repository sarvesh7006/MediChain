// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEmergencyAccess {
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

    function setEmergencyInfo(
        string calldata bloodGroup,
        string calldata allergies,
        string calldata chronicConditions,
        string calldata medications,
        string calldata emergencyContact,
        string calldata additionalNotes
    ) external;

    function getQRCodeData(address patient)
        external
        view
        returns (
            string memory bloodGroup,
            string memory allergies,
            string memory conditions,
            bytes32 dataHash
        );

    function accessEmergencyInfo(address patient)
        external
        returns (EmergencyInfo memory);

    function getCriticalInfo(address patient)
        external
        view
        returns (
            string memory bloodGroup,
            string memory allergies,
            string memory conditions
        );

    function getFullEmergencyInfo(address patient)
        external
        view
        returns (EmergencyInfo memory);

    function grantEmergencyAccess(address trustedContact) external;

    function revokeEmergencyAccess(address trustedContact) external;

    function hasEmergencyInfo(address patient) external view returns (bool);

    function getAccessLogs(address patient) external view returns (EmergencyAccessLog[] memory);

    function getAccessLogCount(address patient) external view returns (uint256);

    function verifyQRCodeData(address patient, bytes32 expectedHash) external view returns (bool);
}
