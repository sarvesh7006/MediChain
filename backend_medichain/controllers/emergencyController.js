const blockchainService = require('../services/blockchainService');

// @desc    Trigger Emergency Clinical Scan
// @route   POST /api/v1/emergency-access
// @access  Clinician
const grantEmergencyAccess = async (req, res, next) => {
  try {
    const { patientAddress, auditId } = req.body;
    
    if (!patientAddress || !auditId) {
      return res.status(400).json({ success: false, message: 'Missing patient address or audit ID' });
    }

    // Generate Blockchain Audit Trail #TR-XXXX and bypass standard encryption restrictions
    const receipt = await blockchainService.grantEmergencyAccess(patientAddress, auditId);

    // In a full implementation, this allows the clinician temporary read access.
    // For this hackathon scope, it signals the audit and bypass success.
    res.status(200).json({ 
      success: true, 
      message: 'EMERGENCY ACCESS GRANTED. Standard encryption bypassed.',
      data: {
        auditLogId: auditId,
        transactionHash: receipt.hash
      }
    });

  } catch (error) {
    if (error.message.includes("does not exist")) {
        return res.status(404).json({ success: false, message: "Patient has no registered Blockchain identity" });
    }
    next(error);
  }
};

module.exports = {
  grantEmergencyAccess
};
