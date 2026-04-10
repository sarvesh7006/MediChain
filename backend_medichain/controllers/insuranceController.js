const blockchainService = require('../services/blockchainService');

// @desc    Submit Insurance Claim
// @route   POST /api/v1/insurance/submit
// @access  Public / Provider
const submitClaim = async (req, res, next) => {
  try {
    const { claimId, recordId, amount } = req.body;
    
    if (!claimId || !recordId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required claim parameters' });
    }

    const receipt = await blockchainService.submitClaim(claimId, recordId, amount);

    res.status(201).json({ 
      success: true, 
      message: 'Claim verified and submitted to Smart Contract',
      data: {
        claimId,
        recordId,
        transactionHash: receipt.hash
      }
    });

  } catch (error) {
    if (error.message.includes("already exists")) {
        return res.status(409).json({ success: false, message: "Claim ID already exists on the ledger" });
    }
    next(error);
  }
};

// @desc    Approve Insurance Claim
// @route   POST /api/v1/insurance/approve
// @access  Insurer
const approveClaim = async (req, res, next) => {
  try {
    const { claimId } = req.body;
    
    if (!claimId) {
      return res.status(400).json({ success: false, message: 'Missing claimId' });
    }

    const receipt = await blockchainService.approveClaim(claimId);

    res.status(200).json({ 
      success: true, 
      message: 'Claim Approved & Mutli-Sig authorized',
      data: {
        claimId,
        transactionHash: receipt.hash
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitClaim,
  approveClaim
};
