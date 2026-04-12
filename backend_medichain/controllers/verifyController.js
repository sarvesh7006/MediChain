const crypto = require('crypto');
const path = require('path');
const { validationResult } = require('express-validator');
const pinataService = require('../services/pinataService');
const blockchainService = require('../services/blockchainService');
const { readRecords } = require('../utils/fileHandler');

const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');

const getAllRecords = async (req, res, next) => {
  try {
    const meta = await readRecords(RECORDS_PATH);
    const metaById = new Map(meta.map(m => [String(m.recordId), m]));

    const { patientId, patientAddress } = req.query || {};
    let resolvedAddress = patientAddress || null;
    if (!resolvedAddress && patientId) {
      const match = [...meta].reverse().find(m => m.patientId === patientId && m.patientAddress);
      resolvedAddress = match ? match.patientAddress : null;
    }

    let recordIds = [];
    try {
      if (resolvedAddress) {
        recordIds = await blockchainService.getPatientRecords(resolvedAddress);
      } else {
        const count = await blockchainService.getRecordCount();
        recordIds = Array.from({ length: count }, (_, i) => i + 1);
      }
    } catch (err) {
      if (err && err.code === 'BAD_DATA') {
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
          warning: 'Contract mismatch or Ganache reset. Using local metadata.'
        });
      }
      throw err;
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
        if (err && err.code === 'BAD_DATA') {
          break;
        }
        throw err;
      }
    }
    let filtered = records.filter(r => {
      if (patientId && r.patientId !== patientId) return false;
      if (patientAddress && r.patientAddress !== patientAddress) return false;
      return true;
    });

    // Fallback to local metadata if chain data is missing
    if (filtered.length === 0 && resolvedAddress) {
      filtered = meta.filter(m => m.patientAddress === resolvedAddress).map(m => ({
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

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
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
