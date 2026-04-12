const Patient = require('../models/Patient');

// @desc Register new patient
const registerPatient = async (req, res) => {
  try {
    const { patientId, name, walletAddress } = req.body;

    // Validate
    if (!patientId || !name || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'patientId, name, and walletAddress are required'
      });
    }

    // Check if patientId already exists
    const existingPatient = await Patient.findOne({ patientId });
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: 'Patient ID already registered'
      });
    }

    // Create new patient
    const patient = new Patient({
      patientId: patientId.toUpperCase(),
      name,
      walletAddress: walletAddress.toLowerCase()
    });

    await patient.save();

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: {
        patientId: patient.patientId,
        name: patient.name,
        walletAddress: patient.walletAddress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Get patient by ID
const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerPatient,
  getPatientById
};

