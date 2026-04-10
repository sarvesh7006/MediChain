// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMediChain {
    struct MedicalRecord {
        uint256 recordId;
        address patientAddress;
        string ipfsHash;
        string recordType;
        string title;
        uint256 timestamp;
        bool exists;
    }

    struct AccessGrant {
        address grantedTo;
        address grantedBy;
        uint256 timestamp;
        bool isActive;
    }

    function createMedicalRecord(
        string calldata ipfsHash,
        string calldata recordType,
        string calldata title
    ) external returns (uint256);

    function grantRecordAccess(uint256 recordId, address doctor) external;

    function grantBatchAccess(uint256[] calldata recordIds, address doctor) external;

    function revokeAccess(address doctor) external;

    function accessRecord(uint256 recordId)
        external
        view
        returns (
            string memory ipfsHash,
            string memory recordType,
            string memory title,
            uint256 timestamp
        );

    function getPatientRecords(address patient) external view returns (uint256[] memory);

    function getMedicalRecord(uint256 recordId) external view returns (MedicalRecord memory);

    function checkAccess(uint256 recordId, address user) external view returns (bool);

    function getAccessGrant(address patient, address doctor) external view returns (AccessGrant memory);

    function getRecordCount(address patient) external view returns (uint256);
}
