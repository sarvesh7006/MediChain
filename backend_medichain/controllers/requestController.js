const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readRecords, writeRecords } = require('../utils/fileHandler');
const blockchainService = require('../services/blockchainService');
const { appendAuditLog } = require('./auditController');

const REQUESTS_PATH = path.join(__dirname, '..', 'data', 'requests.json');
const RECORDS_PATH = path.join(__dirname, '..', 'data', 'records.json');

const createRequest = async (req, res, next) => {
  try {
    const {
      patientId,
      patientAddress,
      doctorName,
      doctorAddress,
      recordId,
      recordTitle,
      recordType,
    } = req.body || {};

    if (!patientId || !recordId) {
      return res.status(400).json({ success: false, message: 'patientId and recordId are required' });
    }

    const requests = await readRecords(REQUESTS_PATH);
    let resolvedPatientAddress = patientAddress || null;
    if (!resolvedPatientAddress && patientId) {
      const records = await readRecords(RECORDS_PATH);
      const match = [...records].reverse().find(r => r.patientId === patientId && r.patientAddress);
      resolvedPatientAddress = match ? match.patientAddress : null;
    }
    const id = `REQ-${uuidv4()}`;
    const now = new Date().toISOString();

    const entry = {
      id,
      patientId,
      patientAddress: resolvedPatientAddress,
      doctorName: doctorName || 'Doctor Portal',
      doctorAddress: doctorAddress || null,
      recordId,
      recordTitle: recordTitle || 'Medical Record',
      recordType: recordType || 'other',
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    requests.push(entry);
    await writeRecords(REQUESTS_PATH, requests);

    // Audit log
    await appendAuditLog({
      action:         'ACCESS_REQUEST',
      actor:          doctorName || doctorAddress || 'Doctor Portal',
      actorType:      'doctor',
      patientAddress: resolvedPatientAddress,
      patientId:      patientId || null,
      details: {
        requestId:   id,
        doctorName:  doctorName  || 'Doctor Portal',
        recordId,
        recordTitle: recordTitle || 'Medical Record',
        recordType:  recordType  || 'other',
        status:      'pending',
      },
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

const listRequests = async (req, res, next) => {
  try {
    const { patientId, patientAddress, doctorAddress } = req.query || {};
    const requests = await readRecords(REQUESTS_PATH);

    const filtered = requests.filter(r => {
      if (patientId && r.patientId !== patientId) return false;
      if (patientAddress && r.patientAddress !== patientAddress) return false;
      if (doctorAddress && r.doctorAddress !== doctorAddress) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    next(error);
  }
};

const decideRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body || {};

    if (!action || !['grant', 'reject', 'revoke'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be grant, reject, or revoke' });
    }

    const requests = await readRecords(REQUESTS_PATH);
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const bypassChain = String(req.headers['x-chain-bypass'] || '') === '1';
    if (action === 'grant') {
      if (!bypassChain) {
        if (!requests[idx].doctorAddress) {
          return res.status(400).json({ success: false, message: 'doctorAddress missing for grant' });
        }
        await blockchainService.grantRecordAccess(Number(requests[idx].recordId), requests[idx].doctorAddress);
      }
      requests[idx].status = 'granted';
    } else if (action === 'revoke') {
      if (!bypassChain) {
        if (!requests[idx].doctorAddress) {
          return res.status(400).json({ success: false, message: 'doctorAddress missing for revoke' });
        }
        await blockchainService.revokeAccess(requests[idx].doctorAddress);
      }
      requests[idx].status = 'rejected';
    } else {
      requests[idx].status = 'rejected';
    }
    requests[idx].updatedAt = new Date().toISOString();
    await writeRecords(REQUESTS_PATH, requests);

    // Audit log
    const req_entry = requests[idx];
    await appendAuditLog({
      action:         'ACCESS_DECISION',
      actor:          req_entry.patientId || req_entry.patientAddress || 'patient',
      actorType:      'patient',
      patientAddress: req_entry.patientAddress || null,
      patientId:      req_entry.patientId      || null,
      details: {
        requestId:   id,
        doctorName:  req_entry.doctorName  || 'Doctor',
        recordId:    req_entry.recordId,
        recordTitle: req_entry.recordTitle || 'Medical Record',
        decision:    action,
        status:      requests[idx].status,
      },
    });

    res.status(200).json({ success: true, data: requests[idx] });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRequest, listRequests, decideRequest };
