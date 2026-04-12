const Request = require('../models/Request');
const Patient = require('../models/Patient');
const { appendAuditLog } = require('./auditController');

// @desc Create access request
const createRequest = async (req, res) => {
  try {
    const {
      patientId,
      doctorName,
      doctorAddress,
      recordId,
      recordTitle,
      recordType,
    } = req.body;

    if (!patientId || !recordId) {
      return res.status(400).json({
        success: false,
        message: 'patientId and recordId are required'
      });
    }

    // Validate patient exists
    const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient ID ${patientId} not found. Please ask patient to register first.`
      });
    }

    // Create request
    const request = new Request({
      patientId: patientId.toUpperCase(),
      doctorWallet: doctorAddress || 'unknown',
      doctorName: doctorName || 'Doctor Portal',
      recordId,
      status: 'pending'
    });

    await request.save();

    // Audit log
    await appendAuditLog({
      action: 'ACCESS_REQUEST',
      actor: doctorName || doctorAddress || 'Doctor Portal',
      actorType: 'doctor',
      patientId: patientId.toUpperCase(),
      patientAddress: patient.walletAddress,
      details: {
        requestId: request._id,
        doctorName: doctorName || 'Doctor Portal',
        recordId,
        recordTitle: recordTitle || 'Medical Record',
        recordType: recordType || 'other',
        status: 'pending'
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: request._id,
        patientId: request.patientId,
        doctorName: request.doctorName,
        recordId: request.recordId,
        status: request.status
      }
    });
  } catch (error) {
    console.error('Create Request Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Get requests for patient
const listRequests = async (req, res) => {
  try {
    const { patientId } = req.query;

    const requests = await Request.find({ patientId: patientId.toUpperCase() })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Update request status
const decideRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['grant', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be grant or reject'
      });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    request.status = action;
    await request.save();

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { 
  createRequest, 
  listRequests, 
  decideRequest 
};

