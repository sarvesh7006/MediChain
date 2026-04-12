const crypto = require('crypto');
const path = require('path');
const { validationResult } = require('express-validator');
const pinataService = require('../services/pinataService');
const blockchainService = require('../services/blockchainService');
const Patient = require('../models/Patient');
const { readRecords } = require('../utils/fileHandler');


// MongoDB + Patient validation

const getAllRecords = async (req, res, next) => {
  try {
    const { patientId, patientAddress } = req.query || {};

    if (!patientId && !patientAddress) {
      return res.status(400).json({
        success: false,
        message: 'patientId or patientAddress query parameter required'
      });
    }

    // REQUIRE registered patient for patientId lookup
    let resolvedAddress = patientAddress;
    if (patientId) {
      const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: `No patient records found for patient ID: ${patientId}. Patient must register first via /api/v1/users/patients`
        });
      }
      resolvedAddress = patient.walletAddress;
    }

    const { readRecords } = require('../utils/fileHandler');
    const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');
    const meta = await readRecords(RECORDS_PATH);
    const metaById = new Map(meta.map(m => [String(m.recordId), m]));
    
    let recordIds = [];

    try {
      if (resolvedAddress) {
        recordIds = await blockchainService.getPatientRecords(resolvedAddress);
      } else {
        const count = await blockchainService.getRecordCount();
        recordIds = Array.from({ length: count }, (_, i) => i + 1);
      }
    } catch (err) {
      console.warn('Blockchain fetch failed:', err.message);
      // Fallback to local metadata
      const fallback = resolvedAddress
        ? meta.filter(m => m.patientAddress === resolvedAddress)
        : meta;
      const data = fallback.map(m => ({
        id: String(m.recordId),
        recordId: m.recordId,
        patientAddress: m.patientAddress,
        ipfsHash: m.cid,
        recordType: m.type,
        title: m.title,
        timestamp: m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 1000) : 0,
        exists: true,
        ...m
      }));
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
        warning: 'Blockchain unavailable. Using local metadata.'
      });
    }

    // Fetch details for each record
    const records = [];
    for (let i = 0; i < recordIds.length; i++) {
      try {
        const detail = await blockchainService.getMedicalRecord(recordIds[i]);
        if (detail && detail.exists) {
          const recordId = String(detail.recordId || recordIds[i]);
          const merged = {
            id: recordId,
            ...detail,
            ...(metaById.get(recordId) || {})
          };
          records.push(merged);
        }
      } catch (err) {
        console.warn(`Record ${recordIds[i]} fetch failed:`, err.message);
        if (err.code === 'BAD_DATA') break;
      }
    }

    let filtered = records;
    if (patientId) {
      filtered = records.filter(r => (r.patientId || '').toString().toUpperCase() === patientId.toUpperCase());
      if (filtered.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No records found for patient ID: ${patientId}`
        });
      }
    } else if (resolvedAddress) {
      filtered = records.filter(r => r.patientAddress?.toLowerCase() === resolvedAddress.toLowerCase());
      if (filtered.length === 0 && meta.length > 0) {
        // Final fallback to local meta
        filtered = meta.filter(m => m.patientAddress?.toLowerCase() === resolvedAddress.toLowerCase()).map(m => ({
          id: String(m.recordId),
          recordId: m.recordId,
          patientAddress: m.patientAddress,
          ipfsHash: m.cid,
          recordType: m.type,
          title: m.title,
          timestamp: m.createdAt ? Math.floor(new Date(m.createdAt).getTime() / 1000) : 0,
          exists: true,
          ...m
        }));
      }
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('getAllRecords error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load records'
    });
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
    const blockchainRecord = await blockchainService.getMedicalRecord(id);
    
    if (!blockchainRecord) {
      return res.status(404).json({ success: false, message: 'Record not found on blockchain' });
    }

    // 2. Fetch raw data from Pinata IPFS using the CID from the blockchain
    const dataBuffer = await pinataService.retrieveFile(blockchainRecord.ipfsHash);

    // 3. Recalculate hash of the retrieved IPFS data
    const hashSum = crypto.createHash('sha256');
    hashSum.update(dataBuffer);
    const calculatedHash = hashSum.digest('hex');

    // 4. Compare against stored metadata hash (if available)
    const meta = await readRecords(RECORDS_PATH);
    const metaEntry = meta.find(m => String(m.recordId) === String(id));
    const storedHash = metaEntry ? metaEntry.dataHash : null;
    const isValid = storedHash ? (calculatedHash === storedHash) : false;

    res.status(200).json({
      success: true,
      data: {
        recordId: id,
        blockchainCid: blockchainRecord.ipfsHash,
        blockchainHash: storedHash,
        calculatedHash: calculatedHash,
        isIntegrityValid: isValid,
        timestamp: new Date(Number(blockchainRecord.timestamp) * 1000),
        owner: blockchainRecord.patientAddress
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
