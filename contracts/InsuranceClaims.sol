// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControl.sol";

/**
 * @title InsuranceClaims
 * @dev Contract for one-click insurance claims using verified blockchain data
 * Reduces paperwork and prevents fraud through immutable records
 */
contract InsuranceClaims is AccessControl {
    // Claim status enum
    enum ClaimStatus { Pending, UnderReview, Approved, Rejected, Paid }

    // Claim rejection reasons
    enum RejectionReason { None, InsufficientDocumentation, PolicyNotCovered, FraudDetected, InvalidClaim, Other }

    // Insurance claim structure
    struct InsuranceClaim {
        uint256 claimId;
        address patient;
        address insuranceProvider;
        uint256 claimAmount;
        string treatmentType;
        string diagnosisCode;      // ICD-10 code
        uint256[] medicalRecordIds; // Related medical records on MediChain
        string ipfsEvidenceHash;   // IPFS hash of supporting documents
        ClaimStatus status;
        RejectionReason rejectionReason;
        string remarks;
        uint256 submissionDate;
        uint256 lastUpdated;
        bool exists;
    }

    // Policy structure
    struct InsurancePolicy {
        string policyNumber;
        address patient;
        address insuranceProvider;
        uint256 coverageAmount;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
    }

    // Claim review structure
    struct ClaimReview {
        address reviewer;
        string comments;
        uint256 timestamp;
        bool approved;
    }

    // Storage
    mapping(uint256 => InsuranceClaim) public claims;
    mapping(address => InsurancePolicy[]) public patientPolicies;
    mapping(address => mapping(string => InsurancePolicy)) public policyByNumber;
    mapping(uint256 => ClaimReview[]) public claimReviews;
    mapping(address => uint256[]) public insuranceClaims;  // Insurance -> Claim IDs

    uint256 public claimCount;

    // Events
    event ClaimSubmitted(uint256 indexed claimId, address indexed patient, address indexed insurance, uint256 amount);
    event ClaimStatusUpdated(uint256 indexed claimId, ClaimStatus status, uint256 timestamp);
    event ClaimReviewed(uint256 indexed claimId, address indexed reviewer, bool approved);
    event ClaimPaid(uint256 indexed claimId, uint256 amount, uint256 timestamp);
    event ClaimRejected(uint256 indexed claimId, RejectionReason reason, string remarks);
    event PolicyRegistered(address indexed patient, string policyNumber, address indexed insurance);
    event PolicyDeactivated(address indexed patient, string policyNumber);

    // Modifiers
    modifier onlyPatient() {
        require(roles[msg.sender] == Roles.Patient, "InsuranceClaims: Caller is not a patient");
        _;
    }

    modifier onlyInsurance() {
        require(roles[msg.sender] == Roles.Insurance, "InsuranceClaims: Caller is not insurance");
        _;
    }

    modifier claimExists(uint256 claimId) {
        require(claims[claimId].exists, "InsuranceClaims: Claim does not exist");
        _;
    }

    modifier onlyClaimOwner(uint256 claimId) {
        require(claims[claimId].patient == msg.sender, "InsuranceClaims: Not claim owner");
        _;
    }

    modifier onlyClaimInsurance(uint256 claimId) {
        require(claims[claimId].insuranceProvider == msg.sender, "InsuranceClaims: Not your claim");
        _;
    }

    /**
     * @dev Submit a new insurance claim (One-Click Claims)
     * @param insuranceProvider Address of the insurance provider
     * @param claimAmount Claim amount in wei
     * @param treatmentType Type of treatment
     * @param diagnosisCode ICD-10 diagnosis code
     * @param medicalRecordIds Array of related medical record IDs from MediChain
     * @param ipfsEvidenceHash IPFS hash of supporting documents
     */
    function submitClaim(
        address insuranceProvider,
        uint256 claimAmount,
        string calldata treatmentType,
        string calldata diagnosisCode,
        uint256[] calldata medicalRecordIds,
        string calldata ipfsEvidenceHash
    ) external onlyPatient returns (uint256) {
        require(roles[insuranceProvider] == Roles.Insurance, "InsuranceClaims: Invalid insurance provider");

        claimCount++;

        InsuranceClaim storage newClaim = claims[claimCount];
        newClaim.claimId = claimCount;
        newClaim.patient = msg.sender;
        newClaim.insuranceProvider = insuranceProvider;
        newClaim.claimAmount = claimAmount;
        newClaim.treatmentType = treatmentType;
        newClaim.diagnosisCode = diagnosisCode;
        newClaim.medicalRecordIds = medicalRecordIds;
        newClaim.ipfsEvidenceHash = ipfsEvidenceHash;
        newClaim.status = ClaimStatus.Pending;
        newClaim.rejectionReason = RejectionReason.None;
        newClaim.submissionDate = block.timestamp;
        newClaim.lastUpdated = block.timestamp;
        newClaim.exists = true;

        insuranceClaims[insuranceProvider].push(claimCount);

        emit ClaimSubmitted(claimCount, msg.sender, insuranceProvider, claimAmount);
        return claimCount;
    }

    /**
     * @dev Register an insurance policy for a patient
     * @param patient Patient address
     * @param policyNumber Policy number (unique identifier)
     * @param coverageAmount Coverage amount
     * @param startDate Policy start date (unix timestamp)
     * @param endDate Policy end date (unix timestamp)
     */
    function registerPolicy(
        address patient,
        string calldata policyNumber,
        uint256 coverageAmount,
        uint256 startDate,
        uint256 endDate
    ) external onlyInsurance {
        require(!policyByNumber[patient][policyNumber].isActive, "InsuranceClaims: Policy already exists");

        InsurancePolicy memory newPolicy = InsurancePolicy({
            policyNumber: policyNumber,
            patient: patient,
            insuranceProvider: msg.sender,
            coverageAmount: coverageAmount,
            startDate: startDate,
            endDate: endDate,
            isActive: true
        });

        patientPolicies[patient].push(newPolicy);
        policyByNumber[patient][policyNumber] = newPolicy;

        emit PolicyRegistered(patient, policyNumber, msg.sender);
    }

    /**
     * @dev Deactivate an insurance policy
     * @param patient Patient address
     * @param policyNumber Policy number
     */
    function deactivatePolicy(address patient, string calldata policyNumber) external onlyInsurance {
        InsurancePolicy storage policy = policyByNumber[patient][policyNumber];
        require(policy.isActive, "InsuranceClaims: Policy not active");
        require(policy.insuranceProvider == msg.sender, "InsuranceClaims: Not your policy");

        policy.isActive = false;

        emit PolicyDeactivated(patient, policyNumber);
    }

    /**
     * @dev Update claim status (only insurance can update)
     * @param claimId Claim ID
     * @param status New status
     * @param remarks Remarks or comments
     */
    function updateClaimStatus(
        uint256 claimId,
        ClaimStatus status,
        string calldata remarks
    ) external onlyClaimInsurance(claimId) claimExists(claimId) {
        InsuranceClaim storage claim = claims[claimId];
        claim.status = status;
        claim.remarks = remarks;
        claim.lastUpdated = block.timestamp;

        emit ClaimStatusUpdated(claimId, status, block.timestamp);
    }

    /**
     * @dev Review a claim (add review comments)
     * @param claimId Claim ID
     * @param comments Review comments
     * @param approved Whether the reviewer approves the claim
     */
    function reviewClaim(
        uint256 claimId,
        string calldata comments,
        bool approved
    ) external onlyClaimInsurance(claimId) claimExists(claimId) {
        claimReviews[claimId].push(ClaimReview({
            reviewer: msg.sender,
            comments: comments,
            timestamp: block.timestamp,
            approved: approved
        }));

        emit ClaimReviewed(claimId, msg.sender, approved);
    }

    /**
     * @dev Approve a claim
     * @param claimId Claim ID
     * @param remarks Approval remarks
     */
    function approveClaim(uint256 claimId, string calldata remarks)
        external
        onlyClaimInsurance(claimId)
        claimExists(claimId)
    {
        InsuranceClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending || claim.status == ClaimStatus.UnderReview,
            "InsuranceClaims: Claim not in reviewable state");

        claim.status = ClaimStatus.Approved;
        claim.remarks = remarks;
        claim.lastUpdated = block.timestamp;

        emit ClaimStatusUpdated(claimId, ClaimStatus.Approved, block.timestamp);
    }

    /**
     * @dev Reject a claim
     * @param claimId Claim ID
     * @param reason Rejection reason
     * @param remarks Rejection remarks
     */
    function rejectClaim(
        uint256 claimId,
        RejectionReason reason,
        string calldata remarks
    ) external onlyClaimInsurance(claimId) claimExists(claimId) {
        InsuranceClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending || claim.status == ClaimStatus.UnderReview,
            "InsuranceClaims: Claim not in reviewable state");

        claim.status = ClaimStatus.Rejected;
        claim.rejectionReason = reason;
        claim.remarks = remarks;
        claim.lastUpdated = block.timestamp;

        emit ClaimRejected(claimId, reason, remarks);
        emit ClaimStatusUpdated(claimId, ClaimStatus.Rejected, block.timestamp);
    }

    /**
     * @dev Process payment for an approved claim
     * @param claimId Claim ID
     */
    function processPayment(uint256 claimId)
        external
        payable
        onlyClaimInsurance(claimId)
        claimExists(claimId)
    {
        InsuranceClaim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Approved, "InsuranceClaims: Claim not approved");

        claim.status = ClaimStatus.Paid;
        claim.lastUpdated = block.timestamp;

        emit ClaimPaid(claimId, claim.claimAmount, block.timestamp);
        emit ClaimStatusUpdated(claimId, ClaimStatus.Paid, block.timestamp);
    }

    /**
     * @dev Get claim details
     * @param claimId Claim ID
     * @return InsuranceClaim struct
     */
    function getClaim(uint256 claimId) external view claimExists(claimId) returns (InsuranceClaim memory) {
        return claims[claimId];
    }

    /**
     * @dev Get all claims for a patient
     * @param patient Patient address
     * @return Array of claim IDs
     */
    function getPatientClaims(address patient) external view returns (uint256[] memory) {
        uint256 totalClaims = claimCount;
        uint256[] memory patientClaimIds = new uint256[](totalClaims);
        uint256 count = 0;

        for (uint256 i = 1; i <= totalClaims; i++) {
            if (claims[i].patient == patient && claims[i].exists) {
                patientClaimIds[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = patientClaimIds[i];
        }

        return result;
    }

    /**
     * @dev Get all claims for an insurance provider
     * @param insurance Insurance provider address
     * @return Array of claim IDs
     */
    function getInsuranceClaims(address insurance) external view returns (uint256[] memory) {
        return insuranceClaims[insurance];
    }

    /**
     * @dev Get active policies for a patient
     * @param patient Patient address
     * @return Array of active policies
     */
    function getActivePolicies(address patient) external view returns (InsurancePolicy[] memory) {
        InsurancePolicy[] memory allPolicies = patientPolicies[patient];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < allPolicies.length; i++) {
            if (allPolicies[i].isActive) {
                activeCount++;
            }
        }

        InsurancePolicy[] memory activePolicies = new InsurancePolicy[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allPolicies.length; i++) {
            if (allPolicies[i].isActive) {
                activePolicies[index] = allPolicies[i];
                index++;
            }
        }

        return activePolicies;
    }

    /**
     * @dev Get policy details
     * @param patient Patient address
     * @param policyNumber Policy number
     * @return InsurancePolicy struct
     */
    function getPolicy(address patient, string calldata policyNumber)
        external
        view
        returns (InsurancePolicy memory)
    {
        return policyByNumber[patient][policyNumber];
    }

    /**
     * @dev Get claim reviews
     * @param claimId Claim ID
     * @return Array of claim reviews
     */
    function getClaimReviews(uint256 claimId) external view returns (ClaimReview[] memory) {
        return claimReviews[claimId];
    }

    /**
     * @dev Verify claim data integrity (for fraud prevention)
     * @param claimId Claim ID
     * @return bool indicating if claim data is valid
     */
    function verifyClaimData(uint256 claimId) external view claimExists(claimId) returns (bool) {
        InsuranceClaim storage claim = claims[claimId];
        return claim.exists && claim.medicalRecordIds.length > 0;
    }

    /**
     * @dev Get claim count for statistics
     * @return Total number of claims
     */
    function getTotalClaimCount() external view returns (uint256) {
        return claimCount;
    }
}
