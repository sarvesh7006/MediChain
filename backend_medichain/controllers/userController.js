const path = require('path');
const { readRecords, writeRecords } = require('../utils/fileHandler');

const PROFILES_PATH = path.join(__dirname, '..', 'data', 'profiles.json');

// @desc    Create/Update Decentralized Patient Profile
// @route   POST /api/v1/profile
// @access  Public
const updateProfile = async (req, res, next) => {
  try {
    const { name, age, bloodGroup, location, allergies, medicalConditions, address } = req.body;

    if (!name || !bloodGroup) {
      return res.status(400).json({ success: false, message: 'Please provide at least name and bloodGroup' });
    }

    const profileData = {
      name,
      age,
      bloodGroup,
      location,
      allergies: allergies || [],
      medicalConditions: medicalConditions || [],
      lastUpdated: new Date().toISOString(),
    };

    const profiles = await readRecords(PROFILES_PATH);
    const idx = profiles.findIndex(p => p.address === address);
    const entry = { address, profileData, updatedAt: new Date().toISOString() };
    if (idx >= 0) profiles[idx] = entry;
    else profiles.push(entry);
    await writeRecords(PROFILES_PATH, profiles);

    res.status(201).json({
      success: true,
      message: 'Profile saved',
      data: { profileData }
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

    const profiles = await readRecords(PROFILES_PATH);
    const entry = profiles.find(p => p.address === address);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }
    res.status(200).json({ success: true, data: { profileData: entry.profileData } });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateProfile, getProfile };
