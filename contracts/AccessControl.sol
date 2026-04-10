// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AccessControl
 * @dev Role-based access control contract for MediChain
 * Roles: Patient, Doctor, Hospital, Insurance, Emergency
 */
contract AccessControl {
    // Role enums
    enum Roles { None, Patient, Doctor, Hospital, Insurance, Emergency }

    // Mapping from address to role
    mapping(address => Roles) public roles;

    // Mapping from address to whether they are registered
    mapping(address => bool) public isRegistered;

    // Admin address
    address public admin;

    // Events
    event RoleGranted(address indexed user, Roles role, address indexed grantedBy);
    event RoleRevoked(address indexed user, Roles role, address indexed revokedBy);
    event UserRegistered(address indexed user, Roles role);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "AccessControl: caller is not admin");
        _;
    }

    modifier onlyPatients() {
        require(roles[msg.sender] == Roles.Patient, "AccessControl: caller is not a Patient");
        _;
    }

    modifier onlyDoctors() {
        require(roles[msg.sender] == Roles.Doctor, "AccessControl: caller is not a Doctor");
        _;
    }

    modifier onlyHospitals() {
        require(roles[msg.sender] == Roles.Hospital, "AccessControl: caller is not a Hospital");
        _;
    }

    modifier onlyInsurance() {
        require(roles[msg.sender] == Roles.Insurance, "AccessControl: caller is not Insurance");
        _;
    }

    modifier onlyEmergency() {
        require(roles[msg.sender] == Roles.Emergency, "AccessControl: caller is not Emergency");
        _;
    }

    modifier whenNotRegistered() {
        require(!isRegistered[msg.sender], "AccessControl: address already registered");
        _;
    }

    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Roles.Patient; // Deployer becomes first patient
        isRegistered[msg.sender] = true;
        emit UserRegistered(msg.sender, Roles.Patient);
    }

    /**
     * @dev Register a new patient
     */
    function registerPatient() external whenNotRegistered {
        roles[msg.sender] = Roles.Patient;
        isRegistered[msg.sender] = true;
        emit UserRegistered(msg.sender, Roles.Patient);
    }

    /**
     * @dev Register a doctor (only admin can register doctors)
     */
    function registerDoctor(address doctor) external onlyAdmin whenNotRegistered {
        roles[doctor] = Roles.Doctor;
        isRegistered[doctor] = true;
        emit UserRegistered(doctor, Roles.Doctor);
    }

    /**
     * @dev Register a hospital (only admin can register hospitals)
     */
    function registerHospital(address hospital) external onlyAdmin whenNotRegistered {
        roles[hospital] = Roles.Hospital;
        isRegistered[hospital] = true;
        emit UserRegistered(hospital, Roles.Hospital);
    }

    /**
     * @dev Register an insurance provider (only admin can register insurance)
     */
    function registerInsurance(address insurance) external onlyAdmin whenNotRegistered {
        roles[insurance] = Roles.Insurance;
        isRegistered[insurance] = true;
        emit UserRegistered(insurance, Roles.Insurance);
    }

    /**
     * @dev Register emergency access (only admin can register)
     */
    function registerEmergency(address emergency) external onlyAdmin whenNotRegistered {
        roles[emergency] = Roles.Emergency;
        isRegistered[emergency] = true;
        emit UserRegistered(emergency, Roles.Emergency);
    }

    /**
     * @dev Grant a role to an address
     */
    function grantRole(address user, Roles role) external onlyAdmin {
        require(isRegistered[user], "AccessControl: user not registered");
        roles[user] = role;
        emit RoleGranted(user, role, msg.sender);
    }

    /**
     * @dev Revoke a role from an address
     */
    function revokeRole(address user) external onlyAdmin {
        Roles currentRole = roles[user];
        require(currentRole != Roles.None, "AccessControl: user has no role");
        roles[user] = Roles.None;
        emit RoleRevoked(user, currentRole, msg.sender);
    }

    /**
     * @dev Check if an address has a specific role
     */
    function hasRole(address user, Roles role) external view returns (bool) {
        return roles[user] == role;
    }

    /**
     * @dev Get the role of an address
     */
    function getRole(address user) external view returns (Roles) {
        return roles[user];
    }

    /**
     * @dev Check if an address is registered
     */
    function checkRegistration(address user) external view returns (bool) {
        return isRegistered[user];
    }
}
