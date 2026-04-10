const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');

// @desc    Create/Update Decentralized Patient Profile
// @route   POST /api/v1/profile
// @access  Public
const updateProfile = async (req, res, next) => {
  try {
    const { name, age, bloodGroup, location, allergies, medicalConditions } = req.body;
    
    if (!name || !bloodGroup) {
      return res.status(400).json({ success: false, message: 'Please provide valid Profile data' });
    }

    // Create a JSON Document for the profile
    const profileData = {
      name,
      age,
      bloodGroup,
      location,
      allergies: allergies || [],
      medicalConditions: medicalConditions || [],
      lastUpdated: new Date().toISOString()
    };

    const dataBuffer = Buffer.from(JSON.stringify(profileData));

    // Upload to IPFS directly
    const cid = await ipfsService.uploadData(dataBuffer);

    // Link IPFS CID to Patient Wallet Address on Ganache
    // The backend uses its own wallet from .env to pay the Gas fee
    const receipt = await blockchainService.updateProfile(cid);

    res.status(201).json({ 
      success: true, 
      message: 'Secure Identity Mapped',
      data: {
        profileCid: cid,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get Decentralized Profile
// @route   GET /api/v1/profile/:address
// @access  Public
const getProfile = async (req, res, next) => {
  try {
    const { address } = req.params;
    
    // Fetch CID from Smart Contract mapping
    const profile = await blockchainService.contract.patientProfiles(address);
    if (!profile.exists) {
        return res.status(404).json({ success: false, message: "Decentralized Profile not found for this address" });
    }

    // Retrieve the JSON Data from IPFS
    const dataBuffer = await ipfsService.retrieveData(profile.profileCid);
    const profileData = JSON.parse(dataBuffer.toString());

    res.status(200).json({ 
      success: true, 
      data: {
        onChainCid: profile.profileCid,
        profileData
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  getProfile
};
