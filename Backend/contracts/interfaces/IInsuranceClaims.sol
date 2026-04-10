// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IInsuranceClaims {
    enum ClaimStatus { Pending, UnderReview, Approved, Rejected, Paid }

    enum RejectionReason { None, InsufficientDocumentation, PolicyNotCovered, FraudDetected, InvalidClaim, Other }

    struct InsuranceClaim {
        uint256 claimId;
        address patient;
        address insuranceProvider;
        uint256 claimAmount;
        string treatmentType;
        string diagnosisCode;
        uint256[] medicalRecordIds;
        string ipfsEvidenceHash;
        ClaimStatus status;
        RejectionReason rejectionReason;
        string remarks;
        uint256 submissionDate;
        uint256 lastUpdated;
        bool exists;
    }

    struct InsurancePolicy {
        string policyNumber;
        address patient;
        address insuranceProvider;
        uint256 coverageAmount;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
    }

    struct ClaimReview {
        address reviewer;
        string comments;
        uint256 timestamp;
        bool approved;
    }

    function submitClaim(
        address insuranceProvider,
        uint256 claimAmount,
        string calldata treatmentType,
        string calldata diagnosisCode,
        uint256[] calldata medicalRecordIds,
        string calldata ipfsEvidenceHash
    ) external returns (uint256);

    function registerPolicy(
        address patient,
        string calldata policyNumber,
        uint256 coverageAmount,
        uint256 startDate,
        uint256 endDate
    ) external;

    function deactivatePolicy(address patient, string calldata policyNumber) external;

    function updateClaimStatus(
        uint256 claimId,
        ClaimStatus status,
        string calldata remarks
    ) external;

    function reviewClaim(
        uint256 claimId,
        string calldata comments,
        bool approved
    ) external;

    function approveClaim(uint256 claimId, string calldata remarks) external;

    function rejectClaim(
        uint256 claimId,
        RejectionReason reason,
        string calldata remarks
    ) external;

    function processPayment(uint256 claimId) external payable;

    function getClaim(uint256 claimId) external view returns (InsuranceClaim memory);

    function getPatientClaims(address patient) external view returns (uint256[] memory);

    function getInsuranceClaims(address insurance) external view returns (uint256[] memory);

    function getActivePolicies(address patient) external view returns (InsurancePolicy[] memory);

    function getPolicy(address patient, string calldata policyNumber)
        external
        view
        returns (InsurancePolicy memory);

    function getClaimReviews(uint256 claimId) external view returns (ClaimReview[] memory);

    function verifyClaimData(uint256 claimId) external view returns (bool);

    function getTotalClaimCount() external view returns (uint256);
}
