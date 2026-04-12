const crypto = require('crypto');
const path = require('path');
const fse = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const pinataService = require('../services/pinataService');
const blockchainService = require('../services/blockchainService');
const { readRecords, writeRecords } = require('../utils/fileHandler');
const { appendAuditLog } = require('./auditController');

const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 1048576; // 1 MB in bytes

const uploadData = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let dataBuffer;
    let fileName = null;
    let fileUrl = null;
    const provisionalId = `REC-${uuidv4()}`;
    
    const {
      title,
      type,
      doctor,
      patientId,
      patientAddress,
      notes,
      uploadedBy,
    } = req.body || {};
    
    // Check if it's a file upload
    if (req.file) {
      // Validate file size
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ 
          success: false, 
          message: `File size exceeds 1 MB limit. File size: ${(req.file.size / 1048576).toFixed(2)} MB` 
        });
      }
      dataBuffer = req.file.buffer;
      const safeBase = path.basename(req.file.originalname || 'record.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
      fileName = safeBase;
    } else if (req.body && Object.keys(req.body).length > 0) {
      // Or raw JSON document payload
      dataBuffer = Buffer.from(JSON.stringify(req.body));
      fileName = 'medical-record.json';
    } else {
      return res.status(400).json({ success: false, message: 'No file or data provided' });
    }

    // 1. Calculate SHA256 Hash of the raw data
    const hashSum = crypto.createHash('sha256');
    hashSum.update(dataBuffer);
    const dataHash = hashSum.digest('hex');

    // 2. Upload to Pinata IPFS
    const cid = await pinataService.uploadFile(dataBuffer, fileName);

    // 3. Persist file to local uploads folder (demo file storage)
    if (req.file) {
      const safeName = `${provisionalId}-${fileName}`;
      await fse.ensureDir(UPLOADS_DIR);
      const outPath = path.join(UPLOADS_DIR, safeName);
      await fse.writeFile(outPath, req.file.buffer);
      fileUrl = `/uploads/${safeName}`;
    }

    // 4. Store CID and metadata on Blockchain
    const chain = await blockchainService.createMedicalRecord(cid, type || 'other', title || 'Untitled Record');
    const recordId = chain.recordId || provisionalId;
    const txReceipt = chain.receipt || chain;

    // 5. Store metadata for UI listing
    const records = await readRecords(RECORDS_PATH);
    records.push({
      recordId,
      cid,
      dataHash,
      transactionHash: txReceipt.hash,
      blockNumber: txReceipt.blockNumber,
      title: title || (fileName ? fileName.replace(/\.[^.]+$/, '') : 'Untitled Record'),
      type: type || 'other',
      doctor: doctor || 'Unknown Provider',
      patientId: patientId || null,
      patientAddress: patientAddress || null,
      notes: notes || '',
      uploadedBy: uploadedBy || 'patient',
      fileName: fileName || 'record.json',
      fileUrl,
      createdAt: new Date().toISOString()
    });
    await writeRecords(RECORDS_PATH, records);

    // Audit log
    await appendAuditLog({
      action:         'UPLOAD_RECORD',
      actor:          uploadedBy || patientId || patientAddress || 'patient',
      actorType:      'patient',
      patientAddress: patientAddress || null,
      patientId:      patientId      || null,
      details: {
        recordId,
        title:  title  || fileName || 'Untitled Record',
        type:   type   || 'other',
        doctor: doctor || 'Unknown Provider',
        cid,
      },
    });

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
