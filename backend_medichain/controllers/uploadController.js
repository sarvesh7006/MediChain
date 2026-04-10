const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');

const uploadData = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let dataBuffer;
    
    // Check if it's a file upload
    if (req.file) {
      dataBuffer = req.file.buffer;
    } else if (req.body && Object.keys(req.body).length > 0) {
      // Or raw JSON document payload
      dataBuffer = Buffer.from(JSON.stringify(req.body));
    } else {
      return res.status(400).json({ success: false, message: 'No file or data provided' });
    }

    // 1. Calculate SHA256 Hash of the raw data
    const hashSum = crypto.createHash('sha256');
    hashSum.update(dataBuffer);
    const dataHash = hashSum.digest('hex');

    // 2. Upload to IPFS
    const cid = await ipfsService.uploadData(dataBuffer);

    // 3. Generate a Unique ID for the Blockchain Record
    const recordId = `REC-${uuidv4()}`;

    // 4. Store CID and Hash on Blockchain
    const txReceipt = await blockchainService.storeRecord(recordId, cid, dataHash);

    res.status(201).json({
      success: true,
      data: {
        recordId,
        cid,
        dataHash,
        transactionHash: txReceipt.hash,
        blockNumber: txReceipt.blockNumber
      }
    });

  } catch (error) {
    console.error('Upload Error:', error);
    next(error);
  }
};

module.exports = {
  uploadData
};
