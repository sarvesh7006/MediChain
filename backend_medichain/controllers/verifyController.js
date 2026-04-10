const crypto = require('crypto');
const { validationResult } = require('express-validator');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');

const getAllRecords = async (req, res, next) => {
  try {
    const recordIds = await blockchainService.getAllRecordIds();
    
    // Optional: We can fetch the details for each record
    const records = [];
    for (let i = 0; i < recordIds.length; i++) {
        const detail = await blockchainService.getRecord(recordIds[i]);
        if(detail) {
            records.push({
                id: recordIds[i],
                ...detail
            });
        }
    }

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

const verifyRecord = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    // 1. Fetch from Blockchain
    const blockchainRecord = await blockchainService.getRecord(id);
    
    if (!blockchainRecord) {
      return res.status(404).json({ success: false, message: 'Record not found on blockchain' });
    }

    // 2. Fetch raw data from IPFS using the CID from the blockchain
    const dataBuffer = await ipfsService.retrieveData(blockchainRecord.cid);

    // 3. Recalculate hash of the retrieved IPFS data
    const hashSum = crypto.createHash('sha256');
    hashSum.update(dataBuffer);
    const calculatedHash = hashSum.digest('hex');

    // 4. Verify Integrity
    const isValid = (calculatedHash === blockchainRecord.dataHash);

    res.status(200).json({
      success: true,
      data: {
        recordId: id,
        blockchainCid: blockchainRecord.cid,
        blockchainHash: blockchainRecord.dataHash,
        calculatedHash: calculatedHash,
        isIntegrityValid: isValid,
        timestamp: new Date(blockchainRecord.timestamp * 1000),
        owner: blockchainRecord.owner
      }
    });

  } catch (error) {
    console.error('Verify Error:', error);
    next(error);
  }
};

module.exports = {
  getAllRecords,
  verifyRecord
};
